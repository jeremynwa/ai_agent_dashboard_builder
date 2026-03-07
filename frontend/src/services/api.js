// frontend/src/services/api.js
import { getIdToken } from './auth';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GENERATE_URL = import.meta.env.VITE_GENERATE_URL || `${API_BASE}/generate`;
export const DB_PROXY_URL = import.meta.env.VITE_DB_PROXY_URL || `${API_BASE}/db`;
const EXPORT_URL = import.meta.env.VITE_EXPORT_URL || `${API_BASE}/export`;
const REVIEW_CODE_URL = import.meta.env.VITE_REVIEW_CODE_URL || `${API_BASE}/review-code`;
const GIT_PUSH_URL = import.meta.env.VITE_GIT_PUSH_URL || `${API_BASE}/git-push`;
const AUTOMATION_URL = import.meta.env.VITE_AUTOMATION_URL || `${API_BASE}/automation`;

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

// ============ COST COMPUTATION ============
// Pricing per million tokens (Anthropic public pricing)
const PRICING = {
  'claude-sonnet-4-20250514':  { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00,  cacheWrite: 1.00, cacheRead: 0.08 },
};

function getPricing(model) {
  if (model?.includes('haiku')) return PRICING['claude-haiku-4-5-20251001'];
  return PRICING['claude-sonnet-4-20250514']; // default
}

// Compute actual cost from real usage returned by generate Lambda
export function computeActualCost(usage) {
  if (!usage?.phases?.length) return null;
  const breakdown = [];
  let total = 0;
  for (const phase of usage.phases) {
    const p = getPricing(phase.model);
    const cost =
      (phase.input_tokens / 1e6) * p.input +
      (phase.output_tokens / 1e6) * p.output +
      (phase.cache_creation_input_tokens / 1e6) * p.cacheWrite +
      (phase.cache_read_input_tokens / 1e6) * p.cacheRead;
    breakdown.push({ label: phase.label, model: phase.model, cost: Math.round(cost * 10000) / 10000, ...phase });
    total += cost;
  }
  return { total: Math.round(total * 10000) / 10000, breakdown, currency: 'USD', totals: usage.totals };
}

// Quick client-side pre-estimate (no API call needed)
// All phases run on Sonnet. Skills + code execution add massive token overhead.
export function estimateCostQuick({ promptLength = 0, rowCount = 0, hasData = false, industry = false }) {
  const CHARS_PER_TOKEN = 4;
  const p = getPricing('claude-sonnet-4-20250514');

  // Generation phase (Sonnet): system + skills refs + code execution overhead
  const systemTokens = 12000;       // system prompt ~400 lines
  const skillRefTokens = 30000;     // 11 reference files loaded by dashboard-generator skill
  const codeExecOverhead = 20000;   // code execution tool calls + container setup
  const promptTokens = Math.ceil(promptLength / CHARS_PER_TOKEN);
  const dataTokens = hasData ? Math.min(Math.ceil(rowCount * 50 / CHARS_PER_TOKEN), 8000) : 0;
  const industryTokens = industry ? 5000 : 0;
  const genInputFresh = promptTokens + dataTokens + industryTokens + codeExecOverhead;
  const genInputCached = systemTokens + skillRefTokens;
  const genOutput = 30000;          // code gen + tool use + retries
  const genCacheCost = (genInputCached / 1e6) * ((p.cacheWrite + p.cacheRead) / 2);
  const genCost = genCacheCost + (genInputFresh / 1e6) * p.input + (genOutput / 1e6) * p.output;

  // Data analysis phase (Sonnet, only if data uploaded)
  const analysisCost = hasData
    ? (5000 / 1e6) * p.cacheRead + ((dataTokens + promptTokens + 10000) / 1e6) * p.input + (2000 / 1e6) * p.output
    : 0;

  // Review phase (Sonnet): reviewer skill + code execution
  const reviewInput = 40000;
  const reviewCost = (reviewInput / 1e6) * p.input + (8000 / 1e6) * p.output;

  // Vision phase (Sonnet): vision skill + screenshot + code
  const visionInput = 30000;
  const visionCost = (visionInput / 1e6) * p.input + (5000 / 1e6) * p.output;

  const total = genCost + analysisCost + reviewCost + visionCost;
  return { total: Math.round(total * 100) / 100, currency: 'USD' };
}

// ============ CLARIFY PROMPT ============
export async function clarifyPrompt(message, industry = null, hasData = false, dbMode = false) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/intake`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, mode: 'clarify', industry, hasData, dbMode }),
  });
  if (!res.ok) {
    console.error('[clarifyPrompt] API error:', res.status, res.statusText, await res.text().catch(() => ''));
    return { questions: [] };
  }
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

// ============ AUTOMATION (templates + generation) ============
export async function listAutomationTemplates() {
  const headers = await authHeaders();
  const res = await fetch(`${AUTOMATION_URL}/templates`, { headers });
  if (!res.ok) throw new Error('Failed to load templates');
  return res.json();
}

export async function generateAutomation(prompt) {
  const headers = await authHeaders();
  const res = await fetch(`${AUTOMATION_URL}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
    throw new Error(err.error || 'Automation generation failed');
  }
  return res.json();
}

export async function saveAutomationTemplate(template) {
  const headers = await authHeaders();
  const res = await fetch(`${AUTOMATION_URL}/templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify(template),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Save template failed');
  }
  return res.json();
}

// ============ REVIEW RESEARCH ============
const REVIEW_RESEARCH_URL = import.meta.env.VITE_REVIEW_RESEARCH_URL || `${API_BASE}/review-research`;

export async function startReviewResearch(config) {
  const headers = await authHeaders();
  const res = await fetch(`${REVIEW_RESEARCH_URL}/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ config }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Session expiree. Reconnectez-vous.');
    throw new Error(errBody.error || 'Failed to start research');
  }
  return res.json();
}

export async function getResearchStatus(jobId) {
  const headers = await authHeaders();
  const res = await fetch(`${REVIEW_RESEARCH_URL}/status/${jobId}`, { headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to get status');
  }
  return res.json();
}

export async function getResearchResults(jobId) {
  const headers = await authHeaders();
  const res = await fetch(`${REVIEW_RESEARCH_URL}/results/${jobId}`, { headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || 'Failed to get results');
  }
  return res.json();
}

export async function estimateResearchCost(config) {
  const headers = await authHeaders();
  const res = await fetch(`${REVIEW_RESEARCH_URL}/estimate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ config }),
  });
  if (!res.ok) return null;
  return res.json();
}