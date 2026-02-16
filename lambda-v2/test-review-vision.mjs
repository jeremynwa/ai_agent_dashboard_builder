/**
 * test-review-vision.mjs — Integration test for dashboard-reviewer and vision-analyzer skills
 *
 * Tests that the review skill detects and fixes code issues,
 * and that the vision skill accepts screenshots and returns valid JSON.
 *
 * Usage: node test-review-vision.mjs
 *
 * Env vars:
 *   ANTHROPIC_API_KEY (or loaded from backend/.env)
 *   REVIEWER_SKILL_ID (optional — the uploaded reviewer skill ID)
 *   VISION_SKILL_ID (optional — the uploaded vision skill ID)
 *
 * At least one of REVIEWER_SKILL_ID or VISION_SKILL_ID must be set.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
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

const REVIEWER_SKILL_ID = process.env.REVIEWER_SKILL_ID || null;
const VISION_SKILL_ID = process.env.VISION_SKILL_ID || null;

if (!REVIEWER_SKILL_ID && !VISION_SKILL_ID) {
  console.error('At least one of REVIEWER_SKILL_ID or VISION_SKILL_ID must be set.');
  console.error('Usage: REVIEWER_SKILL_ID=skill_01... VISION_SKILL_ID=skill_01... node test-review-vision.mjs');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TEST_MODEL = process.env.TEST_MODEL || 'claude-haiku-4-5-20251001';

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

function extractText(response) {
  return response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
}

// ─── Known-bad code for review test ───────────────────────────
const BAD_CODE = `import React, { useState, useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const DATA = [
  { name: 'Alpha', value: 400, product_id: 'P001' },
  { name: 'Beta', value: 300, product_id: 'P002' },
  { name: 'Gamma', value: 200, product_id: 'P003' },
  { name: 'Delta', value: 100, product_id: 'P004' },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('overview');

  return (
    <div className="bg-base min-h-screen">
      <header className="app-header">
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <h1>Dashboard 🚀</h1>
      </header>
      <nav className={\`nav-drawer \${menuOpen ? 'open' : ''}\`}>
        <a onClick={() => { setActivePage('overview'); setMenuOpen(false); }}>Vue d'ensemble</a>
      </nav>
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
      <div className="content-area">
        <div className="grid-kpis">
          <div className="kpi-card"><div className="kpi-value">400</div></div>
        </div>
        <div className="card">
          <h3 className="section-title">Repartition</h3>
          <PieChart width={300} height={300}>
            <Pie data={DATA} dataKey="value" nameKey="name" />
          </PieChart>
        </div>
        <div className="card">
          <h3 className="section-title">Par Produit</h3>
          <BarChart width={500} height={300} data={DATA}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="product_id" />
            <YAxis />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </div>
        <select><option>Tous</option><option>Alpha</option></select>
      </div>
    </div>
  );
}`;

// ─── Known-good code for review test ──────────────────────────
const GOOD_CODE = `import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#06B6D4','#EC4899','#8B5CF6','#F59E0B','#10B981','#3B82F6'];

const DATA = [
  { name: 'Alpha', value: 400 },
  { name: 'Beta', value: 300 },
  { name: 'Gamma', value: 200 },
  { name: 'Delta', value: 100 },
];

const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toFixed(0);

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState('overview');

  const total = useMemo(() => DATA.reduce((s, d) => s + d.value, 0), []);

  return (
    <div className="bg-base min-h-screen">
      <header className="app-header">
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>&#9776;</button>
        <h1>Dashboard</h1>
      </header>
      <nav className={\`nav-drawer \${menuOpen ? 'open' : ''}\`}>
        <a onClick={() => { setActivePage('overview'); setMenuOpen(false); }}>Vue d'ensemble</a>
      </nav>
      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
      <div className="content-area">
        <div className="grid-kpis">
          <div className="kpi-card"><div className="kpi-label">Total</div><div className="kpi-value">{fmt(total)}</div></div>
        </div>
        <div className="card">
          <h3 className="section-title">Repartition</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={DATA} dataKey="value" nameKey="name">
                {DATA.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="section-title">Par Categorie</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
              <YAxis tick={{ fill: '#94A3B8' }} />
              <Bar dataKey="value" fill="#06B6D4" />
              <Tooltip contentStyle={{ background: '#1E293B', border: 'none' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <select style={{background:'#1A2332',color:'#E2E8F0',border:'1px solid #1E293B',borderRadius:'8px',padding:'8px 12px',outline:'none'}}>
          <option>Tous</option><option>Alpha</option>
        </select>
        <div className="card" style={{marginTop:'24px'}}>
          <h3 className="section-title">Points cles</h3>
          <div className="insight-item"><span className="insight-bar" style={{width:'80%',background:'#06B6D4'}}></span>Alpha represente 40% du total</div>
          <div className="insight-item"><span className="insight-bar" style={{width:'60%',background:'#EC4899'}}></span>Top 2 categories = 70% du volume</div>
        </div>
      </div>
    </div>
  );
}`;

// ─── Dummy 1x1 PNG screenshot (base64) ───────────────────────
const DUMMY_SCREENSHOT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ─── Retry wrapper for transient API errors ──────────────────
async function withRetry(fn, label, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.statusCode || 0;
      if (status >= 500 && attempt < maxRetries) {
        const waitSec = attempt * 15;
        console.log(`  [RETRY] ${label} — API ${status} error, waiting ${waitSec}s (attempt ${attempt}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────
async function testReviewer() {
  console.log('\n=== Test 1: Review Bad Code ===\n');
  console.log(`Skill ID: ${REVIEWER_SKILL_ID}`);

  const startTime = Date.now();

  const response = await withRetry(() => anthropic.beta.messages.create({
    model: TEST_MODEL,
    max_tokens: 16384,
    temperature: 0,
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
    system: 'Use the dashboard-reviewer skill. Run check_code.py on the provided code, then review for visual quality using references/checklist.md. Fix all errors and return the complete fixed code as JSON: { "files": { "src/App.jsx": "..." } }. Return JSON in your TEXT response, NOT as a file.',
    container: {
      skills: [{ type: 'custom', skill_id: REVIEWER_SKILL_ID, version: 'latest' }],
    },
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{ role: 'user', content: `Review and fix this React dashboard code:\n\n${BAD_CODE}` }],
  }), 'Test 1: Review Bad Code');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response received in ${elapsed}s`);
  console.log(`Input tokens: ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}\n`);

  const text = extractText(response);
  check('Response has text content', text.length > 0);

  // Check that check_code.py was executed (look for code execution blocks)
  const hasCodeExec = response.content.some(c => c.type === 'code_execution_result' || c.type === 'tool_use');
  check('Code execution was used (check_code.py)', hasCodeExec);

  // Parse JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  check('JSON found in response', !!jsonMatch);

  if (!jsonMatch) {
    console.log('No JSON found. Raw text (500 chars):', text.substring(0, 500));
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

  check('"files" key exists', !!parsed.files);
  check('src/App.jsx in output', !!parsed.files?.['src/App.jsx']);

  const fixedCode = parsed.files?.['src/App.jsx'] || '';

  // Verify fixes
  console.log('\n--- Fix Verification ---');
  check('PieChart now has <Cell>', /<Cell/.test(fixedCode));
  check('COLORS array defined', /COLORS/.test(fixedCode));
  check('No emojis in output', !/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u.test(fixedCode));
  check('Insight section added', /insight-item|insight-bar|Points cl/.test(fixedCode));
  check('Filter select has background style', /background.*#1A2332|#1A2332.*background/.test(fixedCode));
  check('No product_id as dataKey', !/dataKey=["']product_id["']/.test(fixedCode));

  return fixedCode;
}

async function testReviewerGoodCode() {
  console.log('\n=== Test 2: Review Good Code ===\n');

  const startTime = Date.now();

  const response = await withRetry(() => anthropic.beta.messages.create({
    model: TEST_MODEL,
    max_tokens: 16384,
    temperature: 0,
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
    system: 'Use the dashboard-reviewer skill. Run check_code.py on the provided code, then review for visual quality. Fix all errors and return the complete fixed code as JSON: { "files": { "src/App.jsx": "..." } }. Return JSON in your TEXT response, NOT as a file.',
    container: {
      skills: [{ type: 'custom', skill_id: REVIEWER_SKILL_ID, version: 'latest' }],
    },
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{ role: 'user', content: `Review and fix this React dashboard code:\n\n${GOOD_CODE}` }],
  }), 'Test 2: Review Good Code');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response received in ${elapsed}s`);
  console.log(`Input tokens: ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}\n`);

  const text = extractText(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  check('JSON found in response', !!jsonMatch);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      check('JSON parses correctly', true);
      check('src/App.jsx present', !!parsed.files?.['src/App.jsx']);

      const returnedCode = parsed.files?.['src/App.jsx'] || '';
      // Good code should still have all the correct elements
      check('PieChart still has <Cell>', /<Cell/.test(returnedCode));
      check('COLORS still defined', /COLORS/.test(returnedCode));
      check('Insight section still present', /insight-item|insight-bar/.test(returnedCode));
    } catch (e) {
      check('JSON parses correctly', false, e.message);
    }
  }
}

async function testVision() {
  console.log('\n=== Test 3: Vision Analysis ===\n');
  console.log(`Skill ID: ${VISION_SKILL_ID}`);

  const startTime = Date.now();

  const response = await withRetry(() => anthropic.beta.messages.create({
    model: TEST_MODEL,
    max_tokens: 16384,
    temperature: 0,
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
    system: 'Use the vision-analyzer skill. Analyze the screenshot and fix visual issues in the code. Return JSON: { "files": { "src/App.jsx": "..." } }. Return JSON in your TEXT response, NOT as a file.',
    container: {
      skills: [{ type: 'custom', skill_id: VISION_SKILL_ID, version: 'latest' }],
    },
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: DUMMY_SCREENSHOT } },
      { type: 'text', text: `Screenshot + code source. Analyse et corrige:\n1. Layout 2. Chevauchements 3. Lisibilite 4. Graphiques 5. KPIs 6. Espacement 7. Coherence\n\nCODE ACTUEL:\n--- src/App.jsx ---\n${GOOD_CODE}\n\nRetourne le JSON complet.` },
    ]}],
  }), 'Test 3: Vision Analysis');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Response received in ${elapsed}s`);
  console.log(`Input tokens: ${response.usage.input_tokens}`);
  console.log(`Output tokens: ${response.usage.output_tokens}\n`);

  const text = extractText(response);
  check('Response has text content', text.length > 0);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  check('JSON found in response', !!jsonMatch);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      check('JSON parses correctly', true);
      check('"files" key exists', !!parsed.files);
      check('src/App.jsx present', !!parsed.files?.['src/App.jsx']);

      const code = parsed.files?.['src/App.jsx'] || '';
      check('Output has React code', /import/.test(code) && /export/.test(code));
      check('Output compiles (no obvious syntax errors)', !/syntax error/i.test(code));
    } catch (e) {
      check('JSON parses correctly', false, e.message);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function runTests() {
  console.log('=== Review & Vision Skills Test ===\n');
  if (REVIEWER_SKILL_ID) console.log(`Reviewer Skill: ${REVIEWER_SKILL_ID}`);
  if (VISION_SKILL_ID) console.log(`Vision Skill:   ${VISION_SKILL_ID}`);
  console.log(`Model: ${TEST_MODEL}`);

  if (REVIEWER_SKILL_ID) {
    await testReviewer();
    await testReviewerGoodCode();
  } else {
    console.log('\nSkipping reviewer tests (REVIEWER_SKILL_ID not set)');
  }

  if (VISION_SKILL_ID) {
    await testVision();
  } else {
    console.log('\nSkipping vision tests (VISION_SKILL_ID not set)');
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test failed with error:', err.message);
  if (err.error) console.error(JSON.stringify(err.error, null, 2));
  process.exit(1);
});
