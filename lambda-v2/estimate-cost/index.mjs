// estimate-cost Lambda — pure computation, no Claude API call
// Estimates token usage and cost for a generation pipeline run

import { authenticateRequest } from './auth.mjs';

// ============ PRICING (per million tokens) ============
const PRICING = {
  'sonnet':  { input: 3.00,  output: 15.00, cachedInput: 0.30 },
  'haiku':   { input: 0.80,  output: 4.00,  cachedInput: 0.08 },
};

// ============ TOKEN ESTIMATION CONSTANTS ============
const SYSTEM_PROMPT_TOKENS = 4500;       // ~18KB system prompt
const RULES_TOKENS = 2000;              // design system rules
const SKILL_PROMPT_TOKENS = 3000;       // agent skill instructions
const REVIEW_SYSTEM_TOKENS = 1500;      // reviewer system prompt
const VISION_SYSTEM_TOKENS = 1000;      // vision analyzer prompt
const ANALYSIS_OUTPUT_TOKENS = 800;     // data analysis result
const GENERATED_CODE_TOKENS = 4000;     // typical generated code output
const REVIEW_OUTPUT_TOKENS = 600;       // review feedback output
const VISION_OUTPUT_TOKENS = 400;       // vision feedback output
const CHARS_PER_TOKEN = 4;             // rough char-to-token ratio

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

function estimateTokens({ promptLength, rowCount, hasData, industry, dbMode }) {
  // ---- GENERATION PHASE (Sonnet) ----
  // Cached: system prompt + rules + skill
  const genCachedInput = SYSTEM_PROMPT_TOKENS + RULES_TOKENS + SKILL_PROMPT_TOKENS;
  // Fresh: user prompt + data sample + industry skill
  const userPromptTokens = Math.ceil(promptLength / CHARS_PER_TOKEN);
  const dataSampleTokens = hasData
    ? Math.min(Math.ceil(rowCount * 50 / CHARS_PER_TOKEN), 8000)
    : 0;
  const industryTokens = industry ? 1500 : 0;
  const genFreshInput = userPromptTokens + dataSampleTokens + industryTokens;
  const genOutput = GENERATED_CODE_TOKENS;

  // ---- ANALYSIS PHASE (Haiku, only if data) ----
  const analysisCachedInput = hasData ? SKILL_PROMPT_TOKENS : 0;
  const analysisFreshInput = hasData ? dataSampleTokens + userPromptTokens : 0;
  const analysisOutput = hasData ? ANALYSIS_OUTPUT_TOKENS : 0;

  // ---- REVIEW PHASE (Haiku) ----
  const reviewCachedInput = REVIEW_SYSTEM_TOKENS;
  const reviewFreshInput = GENERATED_CODE_TOKENS; // reviews the generated code
  const reviewOutput = REVIEW_OUTPUT_TOKENS;

  // ---- VISION PHASE (Haiku) ----
  const visionCachedInput = VISION_SYSTEM_TOKENS;
  const visionFreshInput = GENERATED_CODE_TOKENS + 1000; // code + screenshot description
  const visionOutput = VISION_OUTPUT_TOKENS;

  return {
    generation: {
      model: 'sonnet',
      cachedInput: genCachedInput,
      freshInput: genFreshInput,
      output: genOutput,
    },
    analysis: hasData ? {
      model: 'haiku',
      cachedInput: analysisCachedInput,
      freshInput: analysisFreshInput,
      output: analysisOutput,
    } : null,
    review: {
      model: 'haiku',
      cachedInput: reviewCachedInput,
      freshInput: reviewFreshInput,
      output: reviewOutput,
    },
    vision: {
      model: 'haiku',
      cachedInput: visionCachedInput,
      freshInput: visionFreshInput,
      output: visionOutput,
    },
  };
}

function computeCost(phases) {
  const breakdown = {};
  let total = 0;

  for (const [name, phase] of Object.entries(phases)) {
    if (!phase) continue;
    const pricing = PRICING[phase.model];
    const cachedCost = (phase.cachedInput / 1_000_000) * pricing.cachedInput;
    const freshCost = (phase.freshInput / 1_000_000) * pricing.input;
    const outputCost = (phase.output / 1_000_000) * pricing.output;
    const phaseCost = cachedCost + freshCost + outputCost;
    breakdown[name] = Math.round(phaseCost * 10000) / 10000;
    total += phaseCost;
  }

  return {
    total: Math.round(total * 10000) / 10000,
    breakdown,
    currency: 'USD',
  };
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      prompt = '',
      rowCount = 0,
      hasData = false,
      industry = null,
      dbMode = false,
    } = body;

    const promptLength = typeof prompt === 'string' ? prompt.length : (prompt || 0);

    const phases = estimateTokens({
      promptLength,
      rowCount,
      hasData: hasData || dbMode,
      industry,
      dbMode,
    });

    const cost = computeCost(phases);

    return reply(200, cost);
  } catch (error) {
    console.error('Estimate cost error:', error);
    return reply(500, { error: 'Cost estimation failed' });
  }
};
