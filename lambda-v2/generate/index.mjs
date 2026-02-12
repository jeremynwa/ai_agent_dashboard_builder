import Anthropic from '@anthropic-ai/sdk';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { authenticateRequest } from './auth.mjs';

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
2. Un HEADER en haut avec le titre (PAS de boutons "Refresh" ou "Export" — l'app est statique)
3. Une zone de CONTENU avec KPIs + graphiques

REGLES SIDEBAR (IMPORTANT):
- Maximum 3 pages dans la sidebar (ex: Overview, Analyse, Details)
- Chaque page doit avoir un contenu UNIQUE et DIFFERENT
- JAMAIS de pages vides ou qui dupliquent le contenu d'une autre page
- JAMAIS de pages "Settings", "Reports", "Export" qui n'ont pas de vrai contenu
- Si tu n'as pas assez de donnees pour 3 pages, fais-en 2 seulement

REGLES GRAPHIQUES (IMPORTANT):
- TOUS les graphiques doivent avoir des labels sur l'axe X et l'axe Y
- TOUS les graphiques doivent avoir une legende si plusieurs series
- TOUS les graphiques doivent avoir un titre descriptif
- Utilise Recharts: BarChart, LineChart, PieChart, AreaChart
- TOUJOURS inclure <XAxis dataKey="name" />, <YAxis />, <Tooltip />, <Legend /> quand applicable
- JAMAIS de graphique sans labels — c'est illisible et non professionnel

REGLES BOUTONS:
- PAS de bouton "Refresh" (les donnees sont statiques, refresh ne fait rien)
- PAS de bouton "Export" dans le header (l'export est gere par la Factory)
- Les seuls boutons autorises sont pour la navigation entre pages de la sidebar

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
- Etat actif dans la sidebar avec useState
- ATTENTION: Pour les styles inline React, utilise TOUJOURS les doubles accolades: style={{ padding: '20px' }} et JAMAIS style={ padding: '20px' }
- ATTENTION: Les template literals dans style doivent etre dans des doubles accolades: style={{ border: \`1px solid \${color}\` }}`;

const DATA_INJECTION_PROMPT = `

REGLES DONNEES EXTERNES:
Quand des donnees sont fournies, tu DOIS:
1. Creer un fichier SEPARE "src/data.js" contenant EXACTEMENT: export const DATA = "__INJECT_DATA__";
2. Dans App.jsx, importer: import { DATA } from './data';
3. Utiliser DATA partout dans l'app (graphiques, tableaux, KPIs)
4. Les KPIs doivent etre CALCULES dynamiquement a partir de DATA
5. Le placeholder "__INJECT_DATA__" sera remplace par les vraies donnees automatiquement

IMPORTANT: Le fichier data.js doit contenir EXACTEMENT cette ligne:
export const DATA = "__INJECT_DATA__";`;

const DB_PROXY_PROMPT = `

REGLES BASE DE DONNEES (mode proxy):
Quand une base de donnees est connectee, tu DOIS:
1. Creer un fichier "src/db.js" contenant EXACTEMENT ce code:
const PROXY_URL = "__DB_PROXY_URL__";
const DB_CREDENTIALS = "__DB_CREDENTIALS__";

export async function queryDb(sql) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials: DB_CREDENTIALS, sql }),
  });
  if (!res.ok) throw new Error('Query failed');
  const data = await res.json();
  return data.rows;
}

2. Dans App.jsx, importer: import { queryDb } from './db';
3. Utiliser queryDb() avec des requetes SQL SELECT pour CHAQUE donnee affichee
4. Chaque KPI, graphique, tableau doit faire sa propre requete SQL
5. Utiliser useEffect + useState pour charger les donnees au mount
6. Afficher "Chargement..." pendant que les donnees se chargent
7. NE JAMAIS hardcoder de donnees, TOUT doit venir de queryDb()

IMPORTANT: Les placeholders "__DB_PROXY_URL__" et "__DB_CREDENTIALS__" seront remplaces automatiquement.`;

const VISION_SYSTEM_PROMPT = `Tu es un expert UI/UX et React senior. Tu analyses des screenshots de dashboards et ameliores le code.

REGLES:
- Retourne UNIQUEMENT du JSON valide
- Structure: { "files": { "src/App.jsx": "code" } }
- Le code doit compiler sans erreur
- Respecte le design system (fond #0F0F12, cards #16161A, accent #00765F)
- ATTENTION: Pour les styles inline React, utilise TOUJOURS les doubles accolades: style={{ padding: '20px' }} et JAMAIS style={ padding: '20px' }`;

const VISION_USER_PROMPT = `Voici le screenshot du dashboard genere et son code source.

Analyse visuellement le rendu et corrige ces problemes si tu les detectes:
1. LAYOUT: Les elements sont-ils bien repartis? Pas de zones vides inutiles?
2. CHEVAUCHEMENT: Des elements se superposent-ils?
3. LISIBILITE: Le texte est-il assez grand? Les contrastes sont-ils suffisants?
4. GRAPHIQUES: Les graphiques sont-ils visibles et lisibles? Ont-ils des legendes?
5. KPIS: Les cartes KPI sont-elles bien alignees et lisibles?
6. ESPACEMENT: Y a-t-il assez d'espace entre les elements?
7. COHERENCE: Le design est-il professionnel et harmonieux?
8. SCROLL: Le contenu tient-il dans l'ecran sans scroll horizontal?

CODE ACTUEL:
`;

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

  // Auth check
  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });
  console.log(`Authenticated: ${user.email || user.sub}`);

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Body keys:', Object.keys(body));

    const {
      prompt,
      useRules,
      excelData,
      existingCode,
      existingFiles,
      dbContext,
      screenshot,
    } = body;

    // Accept both field names (new frontend sends existingCode, old sends existingFiles)
    const existingApp = existingCode || existingFiles || null;

    // ============ VISION MODE ============
    if (screenshot && prompt === '__VISION_ANALYZE__') {
      let codeContext = '';
      if (existingApp) {
        for (const [path, code] of Object.entries(existingApp)) {
          codeContext += `--- ${path} ---\n${code}\n\n`;
        }
      }

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        system: VISION_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: screenshot },
            },
            {
              type: 'text',
              text: VISION_USER_PROMPT + codeContext + '\n\nRetourne le JSON complet avec TOUS les fichiers ameliores. Si le rendu est deja bon, retourne le code tel quel.',
            },
          ],
        }],
      });

      const content = message.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Pas de JSON trouve (vision)');

      const parsed = JSON.parse(jsonMatch[0]);
      for (const [fp, code] of Object.entries(parsed.files)) {
        parsed.files[fp] = fixJsxCode(code);
      }
      return reply(200, parsed);
    }

    // ============ GENERATE / REFINE MODE ============
    if (!prompt) return reply(400, { error: 'Prompt is required' });

    let rulesContext = '';
    if (useRules) {
      const rules = await loadRules();
      if (Object.keys(rules).length > 0) rulesContext = `\n\nREGLES METIER:\n${JSON.stringify(rules, null, 2)}`;
    }

    let systemWithData = SYSTEM_PROMPT;
    let dataContext = '';

    if (dbContext) {
      systemWithData = SYSTEM_PROMPT + DB_PROXY_PROMPT;
      const schemaDesc = Object.entries(dbContext.schema).map(([table, info]) => {
        const cols = info.columns.map(c => `  - ${c.name} (${c.type})`).join('\n');
        const sampleStr = info.sample && info.sample.length > 0 ? `\nExemple:\n${JSON.stringify(info.sample.slice(0, 3), null, 2)}` : '';
        return `Table "${table}" (${info.rowCount} lignes):\n${cols}${sampleStr}`;
      }).join('\n\n');

      dataContext = `\n\nBASE DE DONNEES CONNECTEE (${dbContext.type}):\n${schemaDesc}\n\nUtilise queryDb() pour toutes les donnees.`;
    } else if (excelData) {
      systemWithData = SYSTEM_PROMPT + DATA_INJECTION_PROMPT;
      const rawData = excelData.data || excelData.fullData || [];
      const sample = rawData.slice(0, 30);
      const headers = excelData.headers || (sample.length > 0 ? Object.keys(sample[0]) : []);
      dataContext = `\n\nDONNEES FOURNIES:
Fichier: ${excelData.fileName || 'data'}
Colonnes: ${headers.join(', ')}
Total: ${excelData.totalRows || rawData.length} lignes
Echantillon (${sample.length} lignes):
${JSON.stringify(sample, null, 2)}

Rappel: utilise le placeholder "__INJECT_DATA__" dans src/data.js.`;
    }

    let userMessage = '';
    if (existingApp) {
      userMessage = `Voici le code actuel de l'application:\n\n`;
      for (const [path, code] of Object.entries(existingApp)) {
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
