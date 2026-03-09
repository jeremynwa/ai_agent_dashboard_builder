import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { authenticateRequest } from './auth.mjs';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.MY_REGION || 'eu-north-1' })
);
const kms = new KMSClient({ region: process.env.MY_REGION || 'eu-north-1' });
const TABLE = process.env.APP_REGISTRY_TABLE || 'AppRegistry';
const PREFS_TABLE = process.env.USER_PREFERENCES_TABLE || 'UserPreferences';
const SECRETS_TABLE = process.env.USER_SECRETS_TABLE || 'UserSecrets';
const KMS_KEY_ID = process.env.USER_SECRETS_KEY_ID;

// ============ KMS HELPERS ============
async function encryptValue(plaintext) {
  if (!KMS_KEY_ID) return plaintext; // dev mode fallback
  const res = await kms.send(new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: new TextEncoder().encode(plaintext),
  }));
  return Buffer.from(res.CiphertextBlob).toString('base64');
}

async function decryptValue(ciphertext) {
  if (!KMS_KEY_ID) return ciphertext; // dev mode fallback
  const res = await kms.send(new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  }));
  return new TextDecoder().decode(res.Plaintext);
}

// Integration definitions — what secrets each tool needs
const INTEGRATION_DEFS = {
  smtp: {
    displayName: 'Email (SMTP)',
    icon: '\u{1F4E7}',
    fields: [
      { key: 'SMTP_HOST', label: 'Serveur SMTP', placeholder: 'smtp.office365.com', secret: false },
      { key: 'SMTP_PORT', label: 'Port', placeholder: '587', secret: false },
      { key: 'SMTP_USER', label: 'Utilisateur', placeholder: 'user@company.com', secret: false },
      { key: 'SMTP_PASS', label: 'Mot de passe', placeholder: '', secret: true },
      { key: 'SMTP_FROM', label: 'Expéditeur (From)', placeholder: 'App Factory <noreply@company.com>', secret: false },
    ],
  },
  teams: {
    displayName: 'Microsoft Teams',
    icon: '\u{1F4AC}',
    fields: [
      { key: 'TEAMS_WEBHOOK_URL', label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', secret: true },
    ],
  },
  sql: {
    displayName: 'Base de données SQL',
    icon: '\u{1F5C4}\u{FE0F}',
    fields: [
      { key: 'SQL_HOST', label: 'Hôte', placeholder: 'db.company.com', secret: false },
      { key: 'SQL_PORT', label: 'Port', placeholder: '5432', secret: false },
      { key: 'SQL_DATABASE', label: 'Base de données', placeholder: 'mydb', secret: false },
      { key: 'SQL_USER', label: 'Utilisateur', placeholder: 'readonly', secret: false },
      { key: 'SQL_PASS', label: 'Mot de passe', placeholder: '', secret: true },
    ],
  },
};

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

    // ============ /user-secrets endpoints ============
    if (path.includes('/user-secrets')) {
      if (method === 'GET') {
        // Return configured integrations (with masked secret values)
        const result = await ddb.send(new GetCommand({
          TableName: SECRETS_TABLE,
          Key: { userId },
        }));

        const item = result.Item || {};
        const integrations = {};

        for (const [integrationId, def] of Object.entries(INTEGRATION_DEFS)) {
          const stored = item[integrationId] || {};
          const fields = {};
          let configured = false;

          for (const field of def.fields) {
            if (stored[field.key]) {
              configured = true;
              // Mask secret fields, show non-secret fields
              fields[field.key] = field.secret ? '••••••••' : stored[field.key];
            }
          }

          integrations[integrationId] = {
            ...def,
            configured,
            fields: configured ? fields : {},
          };
        }

        return reply(200, { integrations });

      } else if (method === 'PUT') {
        // Save credentials for an integration (encrypt secret fields)
        const body = JSON.parse(event.body || '{}');
        const { integration, credentials } = body;

        if (!integration || !INTEGRATION_DEFS[integration]) {
          return reply(400, { error: `Unknown integration: ${integration}. Valid: ${Object.keys(INTEGRATION_DEFS).join(', ')}` });
        }
        if (!credentials || typeof credentials !== 'object') {
          return reply(400, { error: 'credentials object is required' });
        }

        const def = INTEGRATION_DEFS[integration];

        // Encrypt secret fields, store non-secret fields as-is
        const encrypted = {};
        for (const field of def.fields) {
          const value = credentials[field.key];
          if (value && value !== '••••••••') {
            encrypted[field.key] = field.secret ? await encryptValue(value) : value;
          }
        }

        // Merge with existing (so partial updates work)
        const existing = await ddb.send(new GetCommand({
          TableName: SECRETS_TABLE,
          Key: { userId },
        }));
        const current = existing.Item || { userId };
        const currentIntegration = current[integration] || {};

        // Update only provided fields
        for (const [key, val] of Object.entries(encrypted)) {
          currentIntegration[key] = val;
        }
        // Mark secret fields for decryption
        currentIntegration._secretFields = def.fields.filter(f => f.secret).map(f => f.key);

        current[integration] = currentIntegration;
        current.userId = userId;
        current.updatedAt = new Date().toISOString();

        await ddb.send(new PutCommand({
          TableName: SECRETS_TABLE,
          Item: current,
        }));

        return reply(200, { success: true, integration });

      } else if (method === 'DELETE') {
        // Remove an integration's credentials
        const body = JSON.parse(event.body || '{}');
        const { integration } = body;

        if (!integration) {
          return reply(400, { error: 'integration field is required' });
        }

        const existing = await ddb.send(new GetCommand({
          TableName: SECRETS_TABLE,
          Key: { userId },
        }));

        if (existing.Item && existing.Item[integration]) {
          delete existing.Item[integration];
          existing.Item.updatedAt = new Date().toISOString();
          await ddb.send(new PutCommand({
            TableName: SECRETS_TABLE,
            Item: existing.Item,
          }));
        }

        return reply(200, { success: true, deleted: integration });

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
