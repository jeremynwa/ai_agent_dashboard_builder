import Anthropic from '@anthropic-ai/sdk';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const RULES_BUCKET = process.env.RULES_BUCKET || 'ai-app-builder-sk-2026';

const HEADERS = {
  'Content-Type': 'application/json',
};

const reply = (code, body) => ({ statusCode: code, headers: HEADERS, body: JSON.stringify(body) });

function fixJsxCode(code) {
  let f = code;
  f = f.replace(/\|([^|]+)\|\s*>\s*(\d)/g, '{"|\u200B$1\u200B| > $2"}');
  f = f.replace(/\|([^|]+)\|\s*<\s*(\d)/g, '{"|\u200B$1\u200B| < $2"}');
  f = f.replace(/([A-Z])\s*>\s*(\d)/g, '{\"$1 > $2\"}');
  f = f.replace(/([A-Z])\s*<\s*(\d)/g, '{\"$1 < $2\"}');
  f = f.replace(/\u2191/g, '(hausse)');
  f = f.replace(/\u2193/g, '(baisse)');
  f = f.replace(/\u2192/g, 'implique');
  return f;
}

const SYSTEM_PROMPT = `Tu es un expert React senior. Tu generes des applications d'analyse PROFESSIONNELLES style App Factory.

REGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide
- Structure: { "files": { "src/App.jsx": "code" } }
- Le code doit compiler sans erreur
- JAMAIS d'emojis, JAMAIS d'icones unicode

STRUCTURE OBLIGATOIRE DE L'APP:
1. Une SIDEBAR a gauche (240px) avec navigation
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

REGLES DE CODE:
- Font: Inter, system-ui, sans-serif
- Transitions: all 0.2s ease
- Hover states sur tous les elements cliquables
- Etat actif dans la sidebar avec useState`;

const DATA_INJECTION_PROMPT = `

REGLES DONNEES EXTERNES:
Quand des donnees sont fournies, tu DOIS:
1. Creer un fichier SEPARE "src/data.js" contenant EXACTEMENT: export const DATA = "__INJECT_DATA__";
2. Dans App.jsx, importer: import { DATA } from './data';
3. Utiliser DATA partout dans l'app (graphiques, tableaux, KPIs)
4. Les KPIs doivent etre CALCULES dynamiquement a partir de DATA (sommes, moyennes, min, max, etc.)
5. Les graphiques doivent utiliser DATA directement, pas de donnees hardcodees
6. Le placeholder "__INJECT_DATA__" sera remplace par les vraies donnees automatiquement

IMPORTANT: Le fichier data.js doit contenir EXACTEMENT cette ligne:
export const DATA = "__INJECT_DATA__";
Ne mets PAS les donnees d'exemple dans data.js. Mets UNIQUEMENT le placeholder.`;

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
    const { prompt, useRules, excelData, existingFiles } = JSON.parse(event.body || '{}');
    if (!prompt) return reply(400, { error: 'Prompt is required' });

    let rulesContext = '';
    if (useRules) {
      const rules = await loadRules();
      if (Object.keys(rules).length > 0) rulesContext = `\n\nREGLES METIER:\n${JSON.stringify(rules, null, 2)}`;
    }

    let dataContext = '';
    let systemWithData = SYSTEM_PROMPT;
    if (excelData) {
      systemWithData = SYSTEM_PROMPT + DATA_INJECTION_PROMPT;
      const sample = excelData.data.slice(0, 30);
      dataContext = `\n\nDONNEES FOURNIES:
Fichier: ${excelData.fileName}
Colonnes: ${excelData.headers.join(', ')}
Total: ${excelData.totalRows || excelData.data.length} lignes
Echantillon (${sample.length} lignes pour comprendre la structure):
${JSON.stringify(sample, null, 2)}

Rappel: utilise le placeholder "__INJECT_DATA__" dans src/data.js. Les vraies donnees (${excelData.totalRows || excelData.data.length} lignes) seront injectees automatiquement.`;
    }

    let userMessage = '';
    if (existingFiles) {
      userMessage = `Voici le code actuel de l'application:\n\n`;
      for (const [path, code] of Object.entries(existingFiles)) {
        userMessage += `--- ${path} ---\n${code}\n\n`;
      }
      userMessage += `\nMODIFICATION DEMANDEE: ${prompt}${rulesContext}${dataContext}\n\nRetourne le JSON complet avec TOUS les fichiers (modifies ou non).`;
    } else {
      userMessage = `Genere une application React pour: ${prompt}${rulesContext}${dataContext}`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: systemWithData,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Pas de JSON trouve');

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