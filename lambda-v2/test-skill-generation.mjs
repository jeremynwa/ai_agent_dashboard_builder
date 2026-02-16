/**
 * test-skill-generation.mjs — Integration test for dashboard-generator skill
 *
 * Tests that the skill produces valid dashboard JSON output.
 *
 * Usage: node test-skill-generation.mjs
 *
 * Env vars:
 *   ANTHROPIC_API_KEY (or loaded from backend/.env)
 *   DASHBOARD_SKILL_ID (required — the uploaded skill ID)
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load API key ─────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = path.resolve(__dirname, '..', 'backend', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      process.env.ANTHROPIC_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    console.error('No ANTHROPIC_API_KEY found.');
    process.exit(1);
  }
}

const SKILL_ID = process.env.DASHBOARD_SKILL_ID;
if (!SKILL_ID) {
  console.error('DASHBOARD_SKILL_ID env var is required.');
  console.error('Usage: DASHBOARD_SKILL_ID=skill_01... node test-skill-generation.mjs');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Sample Excel data for the test prompt ────────────────────
const SAMPLE_DATA = [
  { mois: 'Janvier', revenue: 125000, clients: 342, satisfaction: 4.2, region: 'Nord' },
  { mois: 'Fevrier', revenue: 138000, clients: 367, satisfaction: 4.5, region: 'Nord' },
  { mois: 'Mars', revenue: 142000, clients: 389, satisfaction: 4.3, region: 'Sud' },
  { mois: 'Avril', revenue: 119000, clients: 312, satisfaction: 4.1, region: 'Sud' },
  { mois: 'Mai', revenue: 156000, clients: 421, satisfaction: 4.6, region: 'Est' },
  { mois: 'Juin', revenue: 167000, clients: 445, satisfaction: 4.7, region: 'Est' },
  { mois: 'Juillet', revenue: 145000, clients: 398, satisfaction: 4.4, region: 'Ouest' },
  { mois: 'Aout', revenue: 132000, clients: 356, satisfaction: 4.2, region: 'Ouest' },
];

const DATA_CONTEXT = `\n\nDONNEES:
Fichier: ventes_2024.xlsx
Colonnes: mois, revenue, clients, satisfaction, region
Total: ${SAMPLE_DATA.length} lignes
Echantillon:
${JSON.stringify(SAMPLE_DATA, null, 2)}

Utilise "__INJECT_DATA__" dans src/data.js.`;

// ─── Test runner ──────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function runTest() {
  console.log('=== Skill Generation Test ===\n');
  console.log(`Skill ID: ${SKILL_ID}`);
  console.log(`Model: claude-sonnet-4-20250514\n`);

  // ─── Call Claude with skill ─────────────────────────────────
  console.log('Calling Claude with dashboard-generator skill...\n');
  const startTime = Date.now();

  const systemPrompt = `Use the dashboard-generator skill. MODE: Excel — see references/mode-excel.md in the skill.

CRITICAL OUTPUT FORMAT: Return your final answer as a JSON object directly in your text response: { "files": { "src/App.jsx": "...", "src/data.js": "..." } }. Do NOT write files to the container. Return the complete JSON as TEXT.`;

  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
    system: systemPrompt,
    container: {
      skills: [
        { type: 'custom', skill_id: SKILL_ID, version: 'latest' }
      ],
    },
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{ role: 'user', content: 'Genere une app React dashboard pour: Analyse des ventes 2024 avec KPIs revenue, clients, satisfaction, repartition par region' + DATA_CONTEXT }],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response received in ${elapsed}s\n`);

  // ─── Extract text content ───────────────────────────────────
  const textContent = response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');

  console.log(`Response length: ${textContent.length} chars`);
  console.log(`Stop reason: ${response.stop_reason}`);
  console.log(`Input tokens: ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}\n`);

  // ─── Parse JSON ─────────────────────────────────────────────
  console.log('--- JSON Parsing ---');
  // Handle JSON in markdown code fence or raw
  let jsonStr = textContent;
  const fenceMatch = textContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1];
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  check('JSON found in response', !!jsonMatch);

  if (!jsonMatch) {
    console.log('\nNo JSON found. Raw response (first 500 chars):');
    console.log(textContent.substring(0, 500));
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
    check('JSON parses correctly', true);
  } catch (e) {
    check('JSON parses correctly', false, e.message);
    return;
  }

  // ─── Structure checks ──────────────────────────────────────
  console.log('\n--- Structure ---');
  check('"files" key exists', !!parsed.files);
  check('"files" is an object', typeof parsed.files === 'object');
  check('src/App.jsx exists', !!parsed.files?.['src/App.jsx']);
  check('src/data.js exists', !!parsed.files?.['src/data.js']);

  const appCode = parsed.files?.['src/App.jsx'] || '';
  const dataCode = parsed.files?.['src/data.js'] || '';

  // ─── App.jsx checks ────────────────────────────────────────
  console.log('\n--- App.jsx Quality ---');
  check('React imported', /import\s+.*React|import\s*{/.test(appCode));
  check('Recharts imported', /from\s+['"]recharts['"]/.test(appCode));
  check('DATA imported from ./data', /import\s+.*DATA.*from\s+['"]\.\/data['"]/.test(appCode));
  check('No emojis', !/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(appCode));
  check('No ds.css import', !/import\s+['"].*ds\.css['"]/.test(appCode));
  check('COLORS array defined', /COLORS/.test(appCode));
  check('Uses className (DS classes)', /className=/.test(appCode));

  // Drawer/header structure
  check('Has drawer', /drawer/.test(appCode));
  check('Has app-header', /app-header/.test(appCode));
  check('Has hamburger', /hamburger/.test(appCode));
  check('Has content-area', /content-area/.test(appCode));

  // Charts
  const hasPieChart = /PieChart/.test(appCode);
  check('Has chart components', /BarChart|AreaChart|LineChart|PieChart/.test(appCode));
  if (hasPieChart) {
    check('PieChart has <Cell>', /<Cell/.test(appCode), 'PieChart without Cell = all grey!');
  }

  // KPIs
  check('Has kpi-card', /kpi-card/.test(appCode));
  check('Has kpi-value', /kpi-value/.test(appCode));

  // Insights
  check('Has insight section', /insight-item|insight-bar/.test(appCode));

  // ─── data.js checks ────────────────────────────────────────
  console.log('\n--- data.js ---');
  check('__INJECT_DATA__ placeholder', /__INJECT_DATA__/.test(dataCode));

  // ─── Run validate_output.py ─────────────────────────────────
  console.log('\n--- Python Validator ---');
  try {
    const tmpFile = path.join(__dirname, '_test_output.json');
    const fsPromises = await import('fs/promises');
    await fsPromises.writeFile(tmpFile, JSON.stringify(parsed), 'utf-8');
    const result = execSync(
      `python scripts/validate_output.py "${tmpFile}"`,
      { cwd: path.join(__dirname, 'skills', 'dashboard-generator'), encoding: 'utf-8', timeout: 10000 }
    );
    console.log(`  ${result.trim()}`);
    check('Validator passed', !result.includes('ERRORS'));
    await fsPromises.unlink(tmpFile).catch(() => {});
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    console.log(`  ${output.trim()}`);
    check('Validator passed', false, 'see output above');
  }

  // ─── Summary ────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    console.log('App.jsx preview (first 200 lines):');
    console.log(appCode.split('\n').slice(0, 200).join('\n'));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTest().catch(err => {
  console.error('Test failed with error:', err.message);
  if (err.error) console.error(JSON.stringify(err.error, null, 2));
  process.exit(1);
});
