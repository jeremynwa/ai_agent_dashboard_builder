import Anthropic from '@anthropic-ai/sdk';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const RULES_BUCKET = process.env.RULES_BUCKET || 'ai-app-builder-sk-2026';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });

function fixJsxCode(code) {
  let f = code;
  f = f.replace(/\|([^|]+)\|\s*>\s*(\d)/g, '{"|\u200B$1\u200B| > $2"}');
  f = f.replace(/\|([^|]+)\|\s*<\s*(\d)/g, '{"|\u200B$1\u200B| < $2"}');
  f = f.replace(/([A-Z])\s*>\s*(\d)/g, '{\"$1 > $2\"}');
  f = f.replace(/([A-Z])\s*<\s*(\d)/g, '{\"$1 < $2\"}');
  f = f.replace(/↑/g, '(hausse)');
  f = f.replace(/↓/g, '(baisse)');
  f = f.replace(/→/g, 'implique');
  return f;
}

const SYSTEM_PROMPT = `Tu es un expert React senior. Tu génères des applications d'analyse PROFESSIONNELLES style App Factory.

RÈGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide
- Structure: { "files": { "src/App.jsx": "code" } }
- Le code doit compiler sans erreur
- JAMAIS d'emojis, JAMAIS d'icônes unicode

STRUCTURE OBLIGATOIRE DE L'APP:
1. Une SIDEBAR à gauche (240px) avec navigation
2. Un HEADER en haut avec le titre
3. Une zone de CONTENU avec KPIs + graphiques

DESIGN SYSTEM (OBLIGATOIRE):
Background: #0F0F12 (base), #16161A (cards/sidebar), #1C1C21 (overlay)
Borders: #2E2E36
Text: #FFFFFF (primary), #A1A1AA (secondary), #71717A (tertiary)
Accent: #00765F (vert), hover #00A382
Status: #34D399 (success), #F59E0B (warning), #EF4444 (error)

COMPOSANTS STYLES:
Sidebar: { width: '240px', minHeight: '100vh', background: '#16161A', borderRight: '1px solid #2E2E36', padding: '16px' }
NavItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', color: '#A1A1AA', cursor: 'pointer' }
NavItemActive: { background: 'rgba(0,118,95,0.15)', color: '#00765F' }
Header: { height: '56px', background: '#16161A', borderBottom: '1px solid #2E2E36', padding: '0 24px', display: 'flex', alignItems: 'center' }
KPICard: { background: '#16161A', borderRadius: '16px', padding: '20px', border: '1px solid #2E2E36' }
Card: { background: '#16161A', borderRadius: '16px', padding: '24px', border: '1px solid #2E2E36' }
Button: { background: '#00765F', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '500' }

RÈGLES DE CODE:
- Font: Inter, system-ui, sans-serif
- Transitions: all 0.2s ease
- Hover states sur tous les éléments cliquables
- État actif dans la sidebar avec useState`;

async function loadRules() {
  const rules = {};
  try {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: RULES_BUCKET, Prefix: 'rules/' }));
    if (!list.Contents) return rules;
    for (const obj of list.Contents) {
      if (!obj.Key.endsWith('.json')) continue;
      const data = await s3.send(new GetObjectCommand({ Bucket: RULES_BUCKET, Key: obj.Key }));
      const body = await data.Body.transformToString();
      rules[obj.Key.replace('rules/', '').replace('.json', '')] = JSON.parse(body);
    }
  } catch (e) { console.error('Rules load error:', e); }
  return rules;
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  try {
    const { prompt, useRules, excelData } = JSON.parse(event.body || '{}');
    if (!prompt) return reply(400, { error: 'Prompt is required' });

    let rulesContext = '';
    if (useRules) {
      const rules = await loadRules();
      if (Object.keys(rules).length > 0) rulesContext = `\n\nRÈGLES MÉTIER:\n${JSON.stringify(rules, null, 2)}`;
    }

    let dataContext = '';
    if (excelData) {
      dataContext = `\n\nDONNÉES À UTILISER:\nFichier: ${excelData.fileName}\nColonnes: ${excelData.headers.join(', ')}\nDonnées (${excelData.data.length} lignes):\n${JSON.stringify(excelData.data, null, 2)}\n\nIMPORTANT: Utilise ces données réelles dans l'application.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Génère une application React pour: ${prompt}${rulesContext}${dataContext}` }],
    });

    const content = message.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Pas de JSON trouvé');

    const parsed = JSON.parse(jsonMatch[0]);
    for (const [fp, code] of Object.entries(parsed.files)) {
      parsed.files[fp] = fixJsxCode(code);
    }

    return reply(200, parsed);
  } catch (error) {
    console.error('Generate error:', error);
    return reply(500, { error: error.message });
  }
};
