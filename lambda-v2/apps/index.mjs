import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { authenticateRequest } from './auth.mjs';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.MY_REGION || 'eu-north-1' })
);
const TABLE = process.env.APP_REGISTRY_TABLE || 'AppRegistry';
const PREFS_TABLE = process.env.USER_PREFERENCES_TABLE || 'UserPreferences';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  const method = event.requestContext?.http?.method;
  const path = event.requestContext?.http?.path || '';
  const userId = user.sub;

  try {
    // ============ /preferences endpoints ============
    if (path.includes('/preferences')) {
      if (method === 'GET') {
        const result = await ddb.send(new GetCommand({
          TableName: PREFS_TABLE,
          Key: { userId },
        }));
        return reply(200, { preferences: result.Item || { userId } });

      } else if (method === 'PUT') {
        const body = JSON.parse(event.body || '{}');

        // Build update expression dynamically from provided fields
        const allowedFields = ['industry', 'language', 'chartPreferences', 'feedbackHistory', 'lastUsed'];
        const updates = [];
        const names = {};
        const values = {};

        for (const field of allowedFields) {
          if (body[field] !== undefined) {
            updates.push(`#${field} = :${field}`);
            names[`#${field}`] = field;
            values[`:${field}`] = body[field];
          }
        }

        // Always increment generationCount if requested
        if (body.incrementGeneration) {
          updates.push('#generationCount = if_not_exists(#generationCount, :zero) + :one');
          names['#generationCount'] = 'generationCount';
          values[':zero'] = 0;
          values[':one'] = 1;
        }

        if (updates.length === 0) {
          return reply(400, { error: 'No fields to update' });
        }

        await ddb.send(new UpdateCommand({
          TableName: PREFS_TABLE,
          Key: { userId },
          UpdateExpression: `SET ${updates.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        }));
        return reply(200, { success: true });

      } else {
        return reply(405, { error: 'Method not allowed' });
      }
    }

    // ============ /apps endpoints ============
    if (method === 'GET') {
      // List all apps for the authenticated user, sorted by most recent
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
      }));

      const apps = (result.Items || []).sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      return reply(200, { apps });

    } else if (method === 'POST') {
      // Save a new app record (called after successful git-push + vm-request)
      const body = JSON.parse(event.body || '{}');

      const item = {
        userId,
        appId: body.appId || randomUUID(),
        appName: body.appName || 'Untitled App',
        createdAt: new Date().toISOString(),
        source: body.source || 'generated',
        reviewScore: typeof body.reviewScore === 'number' ? body.reviewScore : 0,
        repoUrl: body.repoUrl || null,
        webUrl: body.webUrl || null,
        ticketId: body.ticketId || null,
        stack: body.stack || 'react',
        status: body.status || 'deployed',
        requester: user.email || user.sub,
        vmSpec: body.vmSpec || null,
        collaboratorsAdded: body.collaboratorsAdded || [],
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return reply(200, { success: true, app: item });

    } else {
      return reply(405, { error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Apps Lambda error:', error);
    return reply(500, { error: error.message });
  }
};
