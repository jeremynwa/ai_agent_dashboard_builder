import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const RULES_BUCKET = process.env.RULES_BUCKET || 'ai-app-builder-sk-2026';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  try {
    const rules = {};
    const list = await s3.send(new ListObjectsV2Command({ Bucket: RULES_BUCKET, Prefix: 'rules/' }));
    if (!list.Contents) return reply(200, rules);

    for (const obj of list.Contents) {
      if (!obj.Key.endsWith('.json')) continue;
      const data = await s3.send(new GetObjectCommand({ Bucket: RULES_BUCKET, Key: obj.Key }));
      const body = await data.Body.transformToString();
      rules[obj.Key.replace('rules/', '').replace('.json', '')] = JSON.parse(body);
    }

    return reply(200, rules);
  } catch (error) {
    console.error('Rules error:', error);
    return reply(500, { error: error.message });
  }
};
