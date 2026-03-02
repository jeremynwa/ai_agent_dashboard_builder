import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { authenticateRequest } from './auth.mjs';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.MY_REGION || 'eu-north-1' })
);
const TABLE = process.env.APP_REGISTRY_TABLE || 'AppRegistry';

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
  const userId = user.sub;

  try {
    if (method === 'GET') {
      // List all apps for the authenticated user, sorted by most recent
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false, // Most recent first (requires GSI on createdAt for true sort — for now sort client-side)
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
