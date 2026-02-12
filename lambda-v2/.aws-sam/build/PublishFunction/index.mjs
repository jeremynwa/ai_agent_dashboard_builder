import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// index.mjs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// auth.mjs
var jwksCache = null;
var jwksCacheTime = 0;
var JWKS_CACHE_TTL = 36e5;
var COGNITO_REGION = process.env.COGNITO_REGION || process.env.MY_REGION || "eu-north-1";
var COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
var JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
var ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
async function getJwks() {
  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < JWKS_CACHE_TTL) {
    return jwksCache;
  }
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  jwksCache = await res.json();
  jwksCacheTime = now;
  return jwksCache;
}
function decodeJwtHeader(token) {
  const header = token.split(".")[0];
  return JSON.parse(Buffer.from(header, "base64url").toString());
}
function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  return JSON.parse(Buffer.from(payload, "base64url").toString());
}
async function importJwk(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}
async function verifySignature(token, key) {
  const parts = token.split(".");
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], "base64url");
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    data
  );
}
async function verifyToken(token) {
  if (!COGNITO_USER_POOL_ID) {
    console.warn("COGNITO_USER_POOL_ID not set, skipping auth");
    return { sub: "dev", email: "dev@local" };
  }
  const header = decodeJwtHeader(token);
  const payload = decodeJwtPayload(token);
  if (payload.iss !== ISSUER) {
    throw new Error("Invalid token issuer");
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
    throw new Error("Token expired");
  }
  const jwks = await getJwks();
  const jwk = jwks.keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = null;
    const freshJwks = await getJwks();
    const freshJwk = freshJwks.keys.find((k) => k.kid === header.kid);
    if (!freshJwk) throw new Error("No matching JWK found");
    const key2 = await importJwk(freshJwk);
    const valid2 = await verifySignature(token, key2);
    if (!valid2) throw new Error("Invalid token signature");
    return payload;
  }
  const key = await importJwk(jwk);
  const valid = await verifySignature(token, key);
  if (!valid) throw new Error("Invalid token signature");
  return payload;
}
async function authenticateRequest(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Missing or invalid Authorization header",
      statusCode: 401
    };
  }
  const token = authHeader.slice(7);
  try {
    const user = await verifyToken(token);
    return { user, error: null, statusCode: 200 };
  } catch (err) {
    return {
      user: null,
      error: `Auth failed: ${err.message}`,
      statusCode: 401
    };
  }
}

// index.mjs
var s3 = new S3Client({ region: process.env.MY_REGION || "eu-north-1" });
var PUBLISH_BUCKET = process.env.PUBLISH_BUCKET || "ai-app-builder-sk-2026";
var HEADERS = {
  "Content-Type": "application/json"
};
var reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });
var MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};
function getContentType(filename) {
  const ext = "." + filename.split(".").pop();
  return MIME_TYPES[ext] || "application/octet-stream";
}
var handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") return reply(200, {});
  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });
  console.log(`Publish by: ${user.email || user.sub}`);
  try {
    const { builtFiles, appName } = JSON.parse(event.body || "{}");
    if (!builtFiles || Object.keys(builtFiles).length === 0) {
      return reply(400, { error: "builtFiles is required (flat map of path -> content)" });
    }
    const appId = appName ? appName.toLowerCase().replace(/[^a-z0-9]/g, "-") : `app-${Date.now()}`;
    for (const [filePath, content] of Object.entries(builtFiles)) {
      await s3.send(new PutObjectCommand({
        Bucket: PUBLISH_BUCKET,
        Key: `${appId}/${filePath}`,
        Body: content,
        ContentType: getContentType(filePath)
      }));
    }
    const url = `http://${PUBLISH_BUCKET}.s3-website.eu-north-1.amazonaws.com/${appId}/`;
    return reply(200, { success: true, url, appId });
  } catch (error) {
    console.error("Publish error:", error);
    return reply(500, { error: error.message });
  }
};
export {
  handler
};
