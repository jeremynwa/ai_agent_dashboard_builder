import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from './auth.mjs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const USE_BETA_API = process.env.USE_BETA_API === 'true';
const WEB_APP_REVIEWER_SKILL_ID = process.env.WEB_APP_REVIEWER_SKILL_ID || null;
const REVIEW_PASS_THRESHOLD = parseInt(process.env.REVIEW_PASS_THRESHOLD || '70', 10);
const REVIEW_MODEL = process.env.REVIEW_MODEL || 'claude-sonnet-4-20250514';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

function extractResponseText(response) {
  return response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
}

async function callClaude({ system, messages, skillId, maxTokens = 16384 }) {
  const startMs = Date.now();
  let response;

  if (!USE_BETA_API || !skillId) {
    response = await anthropic.messages.create({
      model: REVIEW_MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
    });
  } else {
    response = await anthropic.beta.messages.create({
      model: REVIEW_MODEL,
      max_tokens: maxTokens,
      temperature: 0,
      betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
      system,
      container: {
        skills: [{ type: 'custom', skill_id: skillId, version: 'latest' }],
      },
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
      messages,
    });
  }

  console.log(JSON.stringify({
    event: 'claude_call',
    label: 'web-app-review',
    model: REVIEW_MODEL,
    skillId: skillId || 'none',
    elapsed_ms: Date.now() - startMs,
    stop_reason: response.stop_reason,
  }));

  return response;
}

function detectStack(files) {
  const fileNames = Object.keys(files);
  const pkgContent = files['package.json'] || files['./package.json'] || '';

  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['react']) return 'react';
      if (deps['vue']) return 'vue';
      if (deps['@angular/core']) return 'angular';
      if (deps['svelte']) return 'svelte';
      if (deps['next']) return 'nextjs';
    } catch {}
  }

  if (fileNames.some(f => f.endsWith('.jsx') || f.endsWith('.tsx'))) return 'react';
  if (fileNames.some(f => f.endsWith('.vue'))) return 'vue';
  if (fileNames.some(f => f.endsWith('.svelte'))) return 'svelte';
  return 'javascript';
}

const FALLBACK_REVIEW_SYSTEM = `You are a senior software engineer reviewing web application code submitted by a consultant.

Review for:
1. Security: XSS, hardcoded secrets/API keys, eval(), dangerouslySetInnerHTML, SQL injection vectors
2. Code quality: missing error handling, dead code, console.log in production, TODO/FIXME
3. Performance: unnecessary re-renders, missing memoization, synchronous blocking calls
4. Accessibility: missing aria labels, keyboard navigation, alt text

Scoring:
- Start at 100
- Critical security issue: -15 each
- High quality issue: -10 each
- Medium issue: -5 each
- Low/warning: -2 each

Fix all issues and return ONLY this JSON object in your response:
{
  "score": 82,
  "issues": [{"severity":"critical|high|medium|low","rule":"RULE","file":"path","line":0,"message":"...","fix":"..."}],
  "fixedFiles": {"src/App.jsx": "...complete fixed code..."},
  "summary": "2-3 sentence overall assessment"
}

Include only changed files in fixedFiles. Do NOT include any text outside the JSON.`;

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  try {
    const { files, appName = 'uploaded-app', stackHint } = JSON.parse(event.body || '{}');

    if (!files || Object.keys(files).length === 0) {
      return reply(400, { error: 'files is required (flat map of path -> content)' });
    }

    const stack = stackHint || detectStack(files);
    const fileCount = Object.keys(files).length;
    console.log(`Reviewing "${appName}" (${stack}) — ${fileCount} files — by ${user.email || user.sub}`);

    // Build code block for review (skip binary / large files)
    const codeContent = Object.entries(files)
      .filter(([, content]) => typeof content === 'string' && content.length < 200000)
      .map(([path, content]) => `// === ${path} ===\n${content}`)
      .join('\n\n---\n\n');

    const messages = [{
      role: 'user',
      content: `Review this ${stack} web application: "${appName}"\n\n${codeContent}`,
    }];

    const system = WEB_APP_REVIEWER_SKILL_ID
      ? `Review this ${stack} web application and follow the web-app-reviewer skill instructions to return a JSON score + fixed files.`
      : FALLBACK_REVIEW_SYSTEM;

    const response = await callClaude({
      system,
      messages,
      skillId: WEB_APP_REVIEWER_SKILL_ID,
      maxTokens: 16384,
    });

    const text = extractResponseText(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return reply(200, {
        score: 50,
        issues: [{ severity: 'low', rule: 'REVIEW_PARSE_ERROR', file: '', line: 0, message: 'Review completed but results could not be parsed — manual review recommended', fix: 'Review code manually' }],
        fixedFiles: files,
        summary: 'Review completed. Manual verification recommended.',
        approved: false,
        stack,
      });
    }

    const result = JSON.parse(jsonMatch[0]);
    const score = typeof result.score === 'number' ? result.score : 50;

    return reply(200, {
      score,
      issues: result.issues || [],
      fixedFiles: { ...files, ...result.fixedFiles },
      summary: result.summary || '',
      approved: score >= REVIEW_PASS_THRESHOLD,
      stack,
    });

  } catch (error) {
    console.error('Review error:', error);
    return reply(500, { error: error.message });
  }
};
