// frontend/src/services/api.js
import { getIdToken } from './auth';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GENERATE_URL = import.meta.env.VITE_GENERATE_URL || `${API_BASE}/generate`;
export const DB_PROXY_URL = import.meta.env.VITE_DB_PROXY_URL || `${API_BASE}/db`;
const EXPORT_URL = import.meta.env.VITE_EXPORT_URL || `${API_BASE}/export`;
const REVIEW_CODE_URL = import.meta.env.VITE_REVIEW_CODE_URL || `${API_BASE}/review-code`;
const GIT_PUSH_URL = import.meta.env.VITE_GIT_PUSH_URL || `${API_BASE}/git-push`;

// ============ AUTH HEADERS ============
async function authHeaders() {
  const token = await getIdToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ============ GENERATE ============
// Lambda Function URL payload limit is 6MB. We cap the data payload at ~4.5MB
// to leave room for prompt, rules, existingCode, etc. in the same request.
const MAX_DATA_PAYLOAD_BYTES = 4.5 * 1024 * 1024;

function trimDataToFit(allData, maxBytes) {
  // Try sending all data first
  let sample = allData;
  let json = JSON.stringify(sample);
  if (json.length <= maxBytes) return sample;

  // Binary search for the largest slice that fits
  let lo = 0, hi = allData.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const testJson = JSON.stringify(allData.slice(0, mid));
    if (testJson.length <= maxBytes) lo = mid;
    else hi = mid - 1;
  }
  return allData.slice(0, lo);
}

export async function generateApp(prompt, excelData = null, existingCode = null, dbContext = null, industry = null, { modelHint, cachedAnalysis, appType } = {}) {
  const headers = await authHeaders();

  // Send as many rows as possible for accurate local stats (computed in Lambda).
  // fullData stays client-side for __INJECT_DATA__ replacement only.
  // Capped by payload size (~4.5MB for data) to stay under Lambda Function URL 6MB limit.
  let excelPayload = null;
  if (excelData) {
    const allData = excelData.fullData || excelData.data || [];
    const trimmedData = trimDataToFit(allData, MAX_DATA_PAYLOAD_BYTES);
    excelPayload = {
      fileName: excelData.fileName,
      headers: excelData.headers,
      data: trimmedData,
      totalRows: excelData.totalRows,
    };
  }

  const body = { prompt, useRules: true, excelData: excelPayload, existingCode, dbContext };
  if (industry) body.industry = industry;
  if (modelHint) body.modelHint = modelHint;
  if (cachedAnalysis) body.cachedAnalysis = cachedAnalysis;
  if (appType && appType !== 'dashboard') body.appType = appType;
  let res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const errMsg = errBody.error || '';
    // If an industry skill expired/was deleted, retry without it
    if (industry && errMsg.includes('Skill not found')) {
      console.warn('⚠️ Industry skill not found, retrying without industry:', errMsg);
      const retryBody = { ...body };
      delete retryBody.industry;
      res = await fetch(GENERATE_URL, { method: 'POST', headers, body: JSON.stringify(retryBody) });
      if (!res.ok) {
        const retryErr = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
        throw new Error(retryErr.error || 'Generation failed');
      }
      return res.json();
    }
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errMsg || 'Generation failed');
  }
  return res.json();
}

// ============ VISION ANALYZE ============
export async function visionAnalyze(screenshot, currentCode, excelData = null, dbContext = null) {
  const headers = await authHeaders();

  // Strip fullData for vision calls too (only schema needed)
  let excelPayload = null;
  if (excelData) {
    const allData = excelData.fullData || excelData.data || [];
    excelPayload = {
      fileName: excelData.fileName,
      headers: excelData.headers,
      data: allData.slice(0, 30),
      totalRows: excelData.totalRows,
    };
  }

  const res = await fetch(GENERATE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: '__VISION_ANALYZE__',
      screenshot,
      existingCode: currentCode,
      excelData: excelPayload,
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
  const res = await fetch(EXPORT_URL, {
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

// ============ INTAKE (AI routing) ============
export async function routeIntake(message, history = []) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/intake`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    // Graceful fallback — always return a route
    return { route: 'generate', summary: message };
  }
  return res.json();
}

// ============ REVIEW CODE (web-app-reviewer skill) ============
export async function reviewCode(files, appName, stackHint) {
  const headers = await authHeaders();
  const res = await fetch(REVIEW_CODE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files, appName, stackHint }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'Code review failed');
  }
  return res.json();
}

// ============ GIT PUSH (GitLab) ============
export async function pushToGitLab(files, projectName, description = '', generateCI = false) {
  const headers = await authHeaders();
  const res = await fetch(GIT_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files, projectName, description, generateCI }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'GitLab push failed');
  }
  return res.json();
}

// ============ VM REQUEST ============
export async function requestVm(payload) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/vm-request`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(errBody.error || 'VM request failed');
  }
  return res.json();
}

// ============ ESTIMATE COST ============
export async function estimateCost({ prompt, rowCount = 0, hasData = false, industry = null, dbMode = false }) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/estimate-cost`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: typeof prompt === 'string' ? prompt.length : 0,
      rowCount,
      hasData,
      industry,
      dbMode,
    }),
  });
  if (!res.ok) return null; // graceful fallback
  return res.json();
}

// ============ CLARIFY PROMPT ============
export async function clarifyPrompt(message, industry = null, hasData = false, dbMode = false) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/intake`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, mode: 'clarify', industry, hasData, dbMode }),
  });
  if (!res.ok) return { questions: [] }; // graceful fallback
  return res.json();
}

// ============ MY APPS (DynamoDB CRUD) ============
export async function getMyApps() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/apps`, { headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to load apps');
  }
  return res.json();
}

export async function saveApp(payload) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/apps`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to save app');
  }
  return res.json();
}