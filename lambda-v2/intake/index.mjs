import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from './auth.mjs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ROUTING_SYSTEM = `You are an AI assistant for an internal app builder tool used by consultants.
Based on the user's message, determine which workflow to route them to:

1. "upload" — They have EXISTING code (a React app, web app, or any app) they want to:
   - Upload and have reviewed/improved by AI agents
   - Deploy to GitLab
   - Request infrastructure for

2. "generate" — They want to BUILD something NEW from scratch:
   - Create a dashboard from CSV/Excel data
   - Build an app by describing what they want
   - Start fresh with a prompt

If you cannot determine which route from the message, ask ONE specific clarifying question ("clarify" route).

Respond ONLY with a JSON object — no extra text:
{ "route": "upload|generate|clarify", "question": "...", "summary": "one sentence of what they want" }

- "question" is only included for "clarify" route
- "summary" is always included
- Be decisive — the vast majority of messages should resolve to upload or generate without clarifying`;

const CLARIFY_SYSTEM = `You are an AI assistant that helps users refine their app requirements.
Given the user's prompt, generate 2-3 targeted clarifying questions that will produce a MUCH better app.

Focus on the MOST impactful questions:
- What specific KPIs/metrics matter most?
- What visual layout or style do they prefer? (dark theme, minimal, corporate, etc.)
- What actions should be possible? (filter, export, drill-down)
- What time period or data granularity?
- Any specific charts they want? (bar, line, pie, heatmap, etc.)

Context about data/industry is provided when available — tailor questions accordingly.
Do NOT ask about things already specified in the prompt.
Keep questions concise (one sentence each).

Respond ONLY with a JSON object:
{ "questions": ["question1", "question2", "question3"] }

Return 2-3 questions maximum. Each question should be specific and actionable.`;

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

  try {
    const body = JSON.parse(event.body || '{}');
    const { message, history = [], mode } = body;

    // ---- CLARIFY MODE ----
    if (mode === 'clarify') {
      if (!message?.trim()) return reply(400, { error: 'message is required' });

      const contextParts = [`User prompt: "${message}"`];
      if (body.industry) contextParts.push(`Industry: ${body.industry}`);
      if (body.hasData) contextParts.push('User has uploaded data (Excel/CSV)');
      if (body.dbMode) contextParts.push('User is connected to a database');

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        temperature: 0.3,
        system: CLARIFY_SYSTEM,
        messages: [{ role: 'user', content: contextParts.join('\n') }],
      });

      const text = response.content[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return reply(200, { questions: [] });
      }

      const result = JSON.parse(jsonMatch[0]);
      return reply(200, {
        questions: Array.isArray(result.questions) ? result.questions.slice(0, 3) : [],
      });
    }

    // ---- ROUTING MODE (default) ----
    if (!message?.trim()) return reply(400, { error: 'message is required' });

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      temperature: 0,
      system: ROUTING_SYSTEM,
      messages,
    });

    const text = response.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return reply(200, { route: 'generate', summary: message });
    }

    const result = JSON.parse(jsonMatch[0]);
    return reply(200, {
      route: result.route || 'generate',
      question: result.question || null,
      summary: result.summary || message,
    });

  } catch (error) {
    console.error('Intake error:', error);
    return reply(200, { route: 'generate', summary: 'Default routing' });
  }
};
