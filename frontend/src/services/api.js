// frontend/src/services/api.js
import { getIdToken } from './auth';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GENERATE_URL = import.meta.env.VITE_GENERATE_URL || `${API_BASE}/generate`;
export const DB_PROXY_URL = import.meta.env.VITE_DB_PROXY_URL || `${API_BASE}/db`;

// ============ AUTH HEADERS ============
async function authHeaders() {
  const token = await getIdToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ============ GENERATE ============
export async function generateApp(prompt, excelData = null, existingCode = null, dbContext = null, industry = null, { modelHint, cachedAnalysis } = {}) {
  const headers = await authHeaders();
  const body = { prompt, useRules: true, excelData, existingCode, dbContext };
  if (industry) body.industry = industry;
  if (modelHint) body.modelHint = modelHint;
  if (cachedAnalysis) body.cachedAnalysis = cachedAnalysis;
  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'Generation failed');
  }
  return res.json();
}

// ============ VISION ANALYZE ============
export async function visionAnalyze(screenshot, currentCode, excelData = null, dbContext = null) {
  const headers = await authHeaders();
  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: '__VISION_ANALYZE__',
      screenshot,
      existingCode: currentCode,
      excelData,
      dbContext,
      useRules: true,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'Vision analysis failed');
  }
  return res.json();
}

// ============ PUBLISH ============
export async function publishApp(builtFiles, appName) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ builtFiles, appName }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'Publish failed');
  }
  return res.json();
}

// ============ DB SCHEMA ============
export async function getDbSchema(credentials) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/db/schema`, {
    method: 'POST',
    headers,
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'DB schema failed');
  }
  return res.json();
}

// ============ EXPORT (PPTX/XLSX/PDF) ============
export async function exportApp(format, data, title, kpis = [], chartDescriptions = []) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ format, data, title, kpis, chartDescriptions }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'Export failed');
  }
  return res.json();
}

// ============ RULES ============
export async function getRules() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/rules`, { headers });
  if (!res.ok) throw new Error('Failed to load rules');
  return res.json();
}