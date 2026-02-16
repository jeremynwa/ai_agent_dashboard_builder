/**
 * test-data-analyzer.mjs — Integration test for the data-analyzer skill
 *
 * Tests that the skill correctly analyzes different data shapes:
 * - Monthly sales data (periods, categories, revenue)
 * - No-date data (products, prices, quantities)
 * - Mixed types (dates + numerics + categoricals)
 *
 * Usage:
 *   DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs
 *
 * Requires ANTHROPIC_API_KEY (from env or ../backend/.env)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load API key ─────────────────────────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = path.resolve(__dirname, '..', 'backend', '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) process.env.ANTHROPIC_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* ignore */ }
}

const DATA_ANALYZER_SKILL_ID = process.env.DATA_ANALYZER_SKILL_ID;
if (!DATA_ANALYZER_SKILL_ID) {
  console.error('ERROR: Set DATA_ANALYZER_SKILL_ID env var');
  console.error('Usage: DATA_ANALYZER_SKILL_ID=skill_01... node test-data-analyzer.mjs');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Test Datasets ────────────────────────────────────────────

const DATASET_MONTHLY_SALES = [
  { Mois: "Janvier", Region: "Nord", Ventes: 45000, Marge: 12.5 },
  { Mois: "Janvier", Region: "Sud", Ventes: 38000, Marge: 11.2 },
  { Mois: "Fevrier", Region: "Nord", Ventes: 52000, Marge: 14.1 },
  { Mois: "Fevrier", Region: "Sud", Ventes: 41000, Marge: 12.8 },
  { Mois: "Mars", Region: "Nord", Ventes: 48000, Marge: 13.0 },
  { Mois: "Mars", Region: "Sud", Ventes: 55000, Marge: 15.3 },
  { Mois: "Avril", Region: "Nord", Ventes: 61000, Marge: 16.2 },
  { Mois: "Avril", Region: "Sud", Ventes: 47000, Marge: 13.5 },
  { Mois: "Mai", Region: "Nord", Ventes: 58000, Marge: 15.0 },
  { Mois: "Mai", Region: "Sud", Ventes: 63000, Marge: 17.1 },
  { Mois: "Juin", Region: "Nord", Ventes: 70000, Marge: 18.5 },
  { Mois: "Juin", Region: "Sud", Ventes: 52000, Marge: 14.8 },
];

const DATASET_NO_DATES = [
  { Produit: "Widget A", Prix: 29.99, Quantite: 150, Categorie: "Premium" },
  { Produit: "Widget B", Prix: 14.50, Quantite: 320, Categorie: "Standard" },
  { Produit: "Widget C", Prix: 49.99, Quantite: 80, Categorie: "Premium" },
  { Produit: "Widget D", Prix: 9.99, Quantite: 500, Categorie: "Budget" },
  { Produit: "Widget E", Prix: 34.99, Quantite: 200, Categorie: "Standard" },
  { Produit: "Widget F", Prix: 24.99, Quantite: 175, Categorie: "Standard" },
  { Produit: "Widget G", Prix: 59.99, Quantite: 45, Categorie: "Premium" },
  { Produit: "Widget H", Prix: 7.99, Quantite: 600, Categorie: "Budget" },
];

// ─── Helper: Call Claude with data-analyzer skill ─────────────

async function callAnalyzer(data, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${label}`);
  console.log(`Data: ${data.length} rows, ${Object.keys(data[0]).length} columns`);
  console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
  console.log('='.repeat(60));

  const dataContext = `\nDONNEES:\nColonnes: ${Object.keys(data[0]).join(', ')}\nTotal: ${data.length} lignes\nEchantillon:\n${JSON.stringify(data, null, 2)}`;

  const start = Date.now();

  const response = await anthropic.beta.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
    system: 'Use the data-analyzer skill. Run the analysis scripts on the provided data. Return the analysis JSON in your text response. Do NOT write the result to a file — return it directly as text.',
    container: {
      skills: [{ type: 'custom', skill_id: DATA_ANALYZER_SKILL_ID, version: 'latest' }],
    },
    tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    messages: [{ role: 'user', content: `Analyze this data:\n${dataContext}` }],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nResponse: ${response.content.length} blocks, ${elapsed}s`);
  console.log(`Stop reason: ${response.stop_reason}`);
  console.log(`Tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);

  // Extract text content
  const textBlocks = response.content.filter(c => c.type === 'text');
  const fullText = textBlocks.map(c => c.text).join('\n');

  // Find JSON
  const jsonMatch = fullText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('\nERROR: No JSON found in response');
    console.log('Text preview:', fullText.substring(0, 500));
    return null;
  }

  try {
    const analysis = JSON.parse(jsonMatch[0]);
    console.log('\nJSON parsed successfully');
    return analysis;
  } catch (e) {
    console.error('\nERROR: JSON parse failed:', e.message);
    console.log('JSON preview:', jsonMatch[0].substring(0, 500));
    return null;
  }
}

// ─── Validation checks ───────────────────────────────────────

const checks = [];
function check(name, condition) {
  const result = condition ? 'PASS' : 'FAIL';
  checks.push({ name, result });
  console.log(`  [${result}] ${name}`);
  return condition;
}

// ─── Run Tests ────────────────────────────────────────────────

async function runTests() {
  console.log('Data Analyzer Skill Integration Test');
  console.log(`Skill ID: ${DATA_ANALYZER_SKILL_ID}`);

  // ── Test 1: Monthly sales with periods ──
  const analysis1 = await callAnalyzer(DATASET_MONTHLY_SALES, 'Monthly Sales (periods + categories + revenue)');

  if (analysis1) {
    console.log('\n--- Checks: Monthly Sales ---');
    const a = analysis1.analysis || analysis1;

    // Column detection
    const columns = a.columns || [];
    check('Has columns array', Array.isArray(columns) && columns.length > 0);

    const moisCol = columns.find(c => c.name === 'Mois');
    check('Mois detected as date', moisCol && moisCol.type === 'date');

    const regionCol = columns.find(c => c.name === 'Region');
    check('Region detected as categorical', regionCol && regionCol.type === 'categorical');

    const ventesCol = columns.find(c => c.name === 'Ventes');
    check('Ventes detected as numeric', ventesCol && (ventesCol.type === 'numeric' || ventesCol.type === 'currency'));

    const margeCol = columns.find(c => c.name === 'Marge');
    check('Marge detected as numeric/percentage', margeCol && ['numeric', 'percentage'].includes(margeCol.type));

    // Period detection
    const periods = a.periods || {};
    check('Has periods object', typeof periods === 'object');
    check('hasPeriods is true', periods.hasPeriods === true);
    check('Period column is Mois', periods.periodColumn === 'Mois');
    check('Period type is monthly', periods.periodType === 'monthly');
    check('canCompare is true (6 months)', periods.canCompare === true);

    // Stats
    const stats = a.stats || {};
    check('Has stats object', typeof stats === 'object');

    const ventesStats = stats.Ventes || stats.ventes;
    if (ventesStats) {
      check('Ventes sum is correct (630000)', Math.abs((ventesStats.sum || 0) - 630000) < 1);
      check('Ventes min is correct (38000)', Math.abs((ventesStats.min || 0) - 38000) < 1);
      check('Ventes max is correct (70000)', Math.abs((ventesStats.max || 0) - 70000) < 1);
      check('Ventes has periodValues', Array.isArray(ventesStats.periodValues));
    } else {
      check('Ventes stats exist', false);
    }

    const regionStats = stats.Region || stats.region;
    if (regionStats) {
      check('Region has valueCounts', Array.isArray(regionStats.valueCounts));
    }

    // Chart recommendations
    const chartRecs = a.chartRecommendations || [];
    check('Has chart recommendations', Array.isArray(chartRecs) && chartRecs.length > 0);

    const hasAreaOrLine = chartRecs.some(r =>
      r.chartType === 'AreaChart' || r.chartType === 'LineChart');
    check('Recommends AreaChart or LineChart (temporal)', hasAreaOrLine);

    const hasPie = chartRecs.some(r => r.chartType === 'PieChart');
    const hasBar = chartRecs.some(r => r.chartType === 'BarChart');
    check('Recommends PieChart or BarChart (categories)', hasPie || hasBar);

    console.log('\nFull analysis:', JSON.stringify(a, null, 2).substring(0, 2000));
  }

  // ── Test 2: No dates ──
  const analysis2 = await callAnalyzer(DATASET_NO_DATES, 'No Dates (products + prices + categories)');

  if (analysis2) {
    console.log('\n--- Checks: No Dates ---');
    const a = analysis2.analysis || analysis2;

    const columns = a.columns || [];
    check('[ND] Has columns array', Array.isArray(columns) && columns.length > 0);

    const prodCol = columns.find(c => c.name === 'Produit');
    check('[ND] Produit detected as text or categorical', prodCol && ['text', 'categorical'].includes(prodCol.type));

    const prixCol = columns.find(c => c.name === 'Prix');
    check('[ND] Prix detected as numeric/currency', prixCol && ['numeric', 'currency'].includes(prixCol.type));

    const catCol = columns.find(c => c.name === 'Categorie');
    check('[ND] Categorie detected as categorical', catCol && catCol.type === 'categorical');

    // Period detection — should NOT find periods
    const periods = a.periods || {};
    check('[ND] hasPeriods is false (no dates)', periods.hasPeriods === false);
    check('[ND] canCompare is false', periods.canCompare === false);

    // Stats
    const stats = a.stats || {};
    const prixStats = stats.Prix || stats.prix;
    if (prixStats) {
      // Sum of Prix: 29.99+14.50+49.99+9.99+34.99+24.99+59.99+7.99 = 232.43
      check('[ND] Prix sum is ~232.43', Math.abs((prixStats.sum || 0) - 232.43) < 1);
      check('[ND] Prix has NO periodValues', !prixStats.periodValues || prixStats.periodValues.length === 0);
      check('[ND] Prix has NO variation', !prixStats.variation);
    } else {
      check('[ND] Prix stats exist', false);
    }

    // Chart recommendations — should NOT recommend temporal charts
    const chartRecs = a.chartRecommendations || [];
    check('[ND] Has chart recommendations', Array.isArray(chartRecs) && chartRecs.length > 0);

    // PieChart for Categorie (3 values: Premium, Standard, Budget)
    const hasPie = chartRecs.some(r => r.chartType === 'PieChart');
    check('[ND] Recommends PieChart (3 categories)', hasPie);

    const hasBar = chartRecs.some(r => r.chartType === 'BarChart');
    check('[ND] Recommends BarChart', hasBar);
  }

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  const passed = checks.filter(c => c.result === 'PASS').length;
  const failed = checks.filter(c => c.result === 'FAIL').length;
  const total = checks.length;

  for (const c of checks) {
    const icon = c.result === 'PASS' ? '+' : '-';
    console.log(`  [${icon}] ${c.name}`);
  }

  console.log(`\n${passed}/${total} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed checks:');
    for (const c of checks.filter(c => c.result === 'FAIL')) {
      console.log(`  - ${c.name}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
