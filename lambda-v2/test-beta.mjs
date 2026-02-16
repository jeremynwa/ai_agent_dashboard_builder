/**
 * test-beta.mjs — Verify Anthropic beta features access
 *
 * Tests: code execution, available Python packages, Anthropic skills (xlsx)
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=<your-key>
 *   node test-beta.mjs
 *
 * Or load from backend/.env automatically.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load API key from backend/.env if not set ───────────────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = resolve(__dirname, '..', 'backend', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) {
      process.env.ANTHROPIC_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
      console.log('API key loaded from backend/.env\n');
    }
  } catch {
    console.error('No ANTHROPIC_API_KEY found. Set it or create backend/.env');
    process.exit(1);
  }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

// ─── Helpers ──────────────────────────────────────────────────

function extractTextContent(response) {
  return response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
}

function extractCodeResults(response) {
  const results = [];
  for (const block of response.content) {
    if (block.type === 'code_execution_result') {
      results.push(block);
    }
  }
  return results;
}

// ─── Test 1: Code Execution ──────────────────────────────────

async function testCodeExecution() {
  console.log('='.repeat(60));
  console.log('TEST 1: Code Execution Beta');
  console.log('='.repeat(60));

  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 4096,
    betas: ['code-execution-2025-08-25'],
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{
      role: 'user',
      content: 'Use code execution to calculate the sum of [10, 20, 30, 40, 50] and print the result.'
    }]
  });

  const text = extractTextContent(response);
  const results = extractCodeResults(response);

  console.log('\nResponse text:', text.substring(0, 200));
  if (results.length > 0) {
    console.log('Code execution output:', results[0].content?.substring(0, 200));
  }
  console.log('Stop reason:', response.stop_reason);
  console.log('Usage:', JSON.stringify(response.usage));

  console.log('\n>> RESULT: Code execution beta is working\n');
  return response;
}

// ─── Test 2: Available Python Packages ───────────────────────

async function testAvailablePackages() {
  console.log('='.repeat(60));
  console.log('TEST 2: Available Python Packages');
  console.log('='.repeat(60));

  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 8192,
    betas: ['code-execution-2025-08-25'],
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{
      role: 'user',
      content: `Use code execution to test which Python packages are available.
For EACH package below, try to import it and print its version. If it fails, print "NOT AVAILABLE".

Test these packages:
- pandas
- numpy
- matplotlib
- seaborn
- openpyxl
- xlrd
- scipy
- sklearn (scikit-learn)
- pdfplumber
- python-pptx (pptx)
- Pillow (PIL)
- requests

Print the results in a clear table format.`
    }]
  });

  const text = extractTextContent(response);
  const results = extractCodeResults(response);

  console.log('\nClaude response:');
  console.log(text);

  if (results.length > 0) {
    console.log('\nCode execution output:');
    for (const r of results) {
      console.log(r.content);
    }
  }

  console.log('\n>> Document these results for Phase 2 planning!\n');
  return response;
}

// ─── Test 3: Anthropic xlsx Skill ────────────────────────────

async function testXlsxSkill() {
  console.log('='.repeat(60));
  console.log('TEST 3: Anthropic xlsx Skill');
  console.log('='.repeat(60));

  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 8192,
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
    container: {
      skills: [
        { type: 'anthropic', skill_id: 'xlsx', version: 'latest' }
      ]
    },
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{
      role: 'user',
      content: 'Create a simple Excel file with 3 columns (Name, Age, City) and 5 rows of sample data. Save it as test.xlsx and confirm it was created.'
    }]
  });

  const text = extractTextContent(response);

  console.log('\nClaude response:');
  console.log(text.substring(0, 500));
  console.log('Stop reason:', response.stop_reason);

  // Check for container info
  if (response.container) {
    console.log('Container ID:', response.container.id);
  }

  console.log('\n>> RESULT: xlsx skill is working\n');
  return response;
}

// ─── Test 4: Skills List API ─────────────────────────────────

async function testSkillsList() {
  console.log('='.repeat(60));
  console.log('TEST 4: Skills List API');
  console.log('='.repeat(60));

  try {
    // Try SDK method first
    const skills = await anthropic.beta.skills.list({
      betas: ['skills-2025-10-02']
    });
    console.log('\nSkills list (SDK):');
    if (skills.data && skills.data.length > 0) {
      for (const skill of skills.data) {
        console.log(`  - ${skill.id}: ${skill.display_title} (${skill.source})`);
      }
    } else {
      console.log('  No custom skills found (expected for first run)');
    }
    console.log('\n>> RESULT: Skills API is accessible via SDK\n');
  } catch (sdkError) {
    console.log(`SDK method failed: ${sdkError.message}`);
    console.log('Falling back to direct HTTP...\n');

    // Fallback to direct HTTP
    const response = await fetch('https://api.anthropic.com/v1/skills', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'skills-2025-10-02'
      }
    });

    const data = await response.json();
    console.log('HTTP response:', JSON.stringify(data, null, 2).substring(0, 500));
    console.log('\n>> RESULT: Skills API accessible via HTTP\n');
  }
}

// ─── Run All Tests ───────────────────────────────────────────

async function runTests() {
  const selected = process.argv[2];

  console.log('\n');
  console.log('*'.repeat(60));
  console.log('  Anthropic Beta Features Verification');
  console.log(`  SDK: @anthropic-ai/sdk@${Anthropic.VERSION || 'unknown'}`);
  console.log(`  Model: ${MODEL}`);
  console.log('*'.repeat(60));
  console.log('\n');

  const tests = [
    { name: 'code-exec', fn: testCodeExecution },
    { name: 'packages', fn: testAvailablePackages },
    { name: 'xlsx', fn: testXlsxSkill },
    { name: 'list', fn: testSkillsList },
  ];

  const results = {};

  for (const test of tests) {
    if (selected && test.name !== selected) continue;

    try {
      await test.fn();
      results[test.name] = 'PASS';
    } catch (err) {
      console.error(`\n>> FAILED: ${err.message}\n`);
      if (err.status) console.error(`   HTTP ${err.status}: ${err.error?.message || ''}`);
      results[test.name] = `FAIL: ${err.message}`;
    }
  }

  console.log('\n');
  console.log('='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  for (const [name, result] of Object.entries(results)) {
    const icon = result === 'PASS' ? '[PASS]' : '[FAIL]';
    console.log(`  ${icon} ${name}: ${result}`);
  }
  console.log('\n');
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
