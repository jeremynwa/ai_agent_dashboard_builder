// lambda-v2/shared/auth.mjs
// Lightweight Cognito JWT verification for Lambda (no heavy deps)
// Verifies the token signature using Cognito's JWKS endpoint

let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour

const COGNITO_REGION = process.env.COGNITO_REGION || process.env.MY_REGION || 'eu-north-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

const JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

// ============ FETCH JWKS ============
async function getJwks() {
  const now = Date.now();
  if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_TTL) {
    return jwksCache;
  }

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  jwksCache = await res.json();
  jwksCacheTime = now;
  return jwksCache;
}

// ============ DECODE JWT (without verification, to get header/kid) ============
function decodeJwtHeader(token) {
  const header = token.split('.')[0];
  return JSON.parse(Buffer.from(header, 'base64url').toString());
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

// ============ VERIFY JWT using Web Crypto ============
async function importJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function verifySignature(token, key) {
  const parts = token.split('.');
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');

  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    data
  );
}

// ============ MAIN VERIFY FUNCTION ============
export async function verifyToken(token) {
  if (!COGNITO_USER_POOL_ID) {
    // Auth not configured — allow through (dev mode)
    console.warn('COGNITO_USER_POOL_ID not set, skipping auth');
    return { sub: 'dev', email: 'dev@local' };
  }

  // Decode header to find kid
  const header = decodeJwtHeader(token);
  const payload = decodeJwtPayload(token);

  // Check issuer
  if (payload.iss !== ISSUER) {
    throw new Error('Invalid token issuer');
  }

  // Check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  // Find matching JWK
  const jwks = await getJwks();
  const jwk = jwks.keys.find(k => k.kid === header.kid);
  if (!jwk) {
    // Invalidate cache and retry once (key rotation)
    jwksCache = null;
    const freshJwks = await getJwks();
    const freshJwk = freshJwks.keys.find(k => k.kid === header.kid);
    if (!freshJwk) throw new Error('No matching JWK found');
    const key = await importJwk(freshJwk);
    const valid = await verifySignature(token, key);
    if (!valid) throw new Error('Invalid token signature');
    return payload;
  }

  // Verify signature
  const key = await importJwk(jwk);
  const valid = await verifySignature(token, key);
  if (!valid) throw new Error('Invalid token signature');

  return payload;
}

// ============ LAMBDA MIDDLEWARE ============
// Extracts and verifies Bearer token from Authorization header
// Returns { user, error, statusCode }
export async function authenticateRequest(event) {
  const authHeader =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    '';

  if (!authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      error: 'Missing or invalid Authorization header',
      statusCode: 401,
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
      statusCode: 401,
    };
  }
}

// Helper: wrap a handler with auth
export function withAuth(handler) {
  return async (event) => {
    const { user, error, statusCode } = await authenticateRequest(event);

    if (error) {
      return {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error }),
      };
    }

    // Attach user to event for downstream use
    event.user = user;
    return handler(event);
  };
}
