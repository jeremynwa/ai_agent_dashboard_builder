import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const PUBLISH_BUCKET = process.env.PUBLISH_BUCKET || 'ai-app-builder-sk-2026';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function getContentType(filename) {
  const ext = '.' + filename.split('.').pop();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  try {
    const { builtFiles, appName } = JSON.parse(event.body || '{}');

    if (!builtFiles || Object.keys(builtFiles).length === 0) {
      return reply(400, { error: 'builtFiles is required (flat map of path -> content)' });
    }

    const appId = appName
      ? appName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : `app-${Date.now()}`;

    // Upload each file to S3
    for (const [filePath, content] of Object.entries(builtFiles)) {
      await s3.send(new PutObjectCommand({
        Bucket: PUBLISH_BUCKET,
        Key: `${appId}/${filePath}`,
        Body: content,
        ContentType: getContentType(filePath),
      }));
    }

    const url = `http://${PUBLISH_BUCKET}.s3-website.eu-north-1.amazonaws.com/${appId}/`;
    return reply(200, { success: true, url, appId });
  } catch (error) {
    console.error('Publish error:', error);
    return reply(500, { error: error.message });
  }
};
