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

const SYSTEM_PROMPT = `Tu es un expert React senior specialise en data analytics dashboards premium. Tu generes des applications d'analyse de niveau EXECUTIF.

REGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide
- Structure: { "files": { "src/App.jsx": "code" } }
- Le code doit compiler sans erreur
- JAMAIS d'emojis, JAMAIS d'icones unicode
- import React et tous les hooks necessaires depuis "react"
- import Recharts depuis "recharts"

STRUCTURE OBLIGATOIRE DE L'APP:
1. PAS de sidebar fixe visible — utilise un DRAWER (panneau lateral) qui s'ouvre/ferme au clic
2. Un HEADER en haut avec: bouton hamburger (3 barres) a gauche pour ouvrir le drawer + titre + onglets de navigation
3. Une zone de CONTENU pleine largeur, scrollable, avec KPIs en haut + graphiques + tableaux
4. Le contenu prend 100% de la largeur (pas de marginLeft fixe)

REGLES DRAWER/NAVIGATION:
- Le drawer s'ouvre par dessus le contenu avec un overlay semi-transparent (background: 'rgba(0,0,0,0.5)')
- Le drawer a: position: 'fixed', top: 0, left: 0, height: '100vh', width: '260px', zIndex: 1000, background: '#111827', transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease'
- Bouton hamburger dans le header: 3 barres horizontales en div (width: 20px, height: 2px, background: '#94A3B8', margin: '3px 0'), cursor pointer
- Maximum 3 pages (ex: Synopsis, Analyse, Details)
- Chaque page DOIT avoir un contenu UNIQUE — jamais de doublons
- Cliquer sur un item ferme le drawer automatiquement
- Cliquer sur l'overlay ferme le drawer

REGLES BOUTONS:
- PAS de bouton "Refresh" ou "Export" (l'app est statique, geree par la Factory)
- Seuls boutons autorises: hamburger menu + onglets header pour changer de vue

===== KPIs RICHES =====
Chaque dashboard DOIT avoir une rangee de 3-5 KPIs en haut. Chaque KPI card contient:
1. Label: texte uppercase 11px, color #64748B, letterSpacing '0.05em'
2. Valeur principale: fontSize 28px, fontWeight 700, color #F1F5F9
3. Comparaison: "CY 733K | PY 609K" en #94A3B8 fontSize 12px (Current Year vs Previous Year)
4. Badge variation: "+20.3%" en vert #10B981 si positif, "-2.1%" en rouge #EF4444 si negatif, fontSize 13px, fontWeight 600
5. Mini sparkline: CHAQUE KPI doit avoir son PROPRE jeu de donnees sparkline base sur une colonne DIFFERENTE

ATTENTION SPARKLINES — chaque KPI doit utiliser des donnees DIFFERENTES:
Exemple:
const sparkRevenue = DATA.slice(-7).map(d => ({ v: d.revenue || 0 }));
const sparkOrders = DATA.slice(-7).map(d => ({ v: d.orders || 0 }));
const sparkConversion = DATA.slice(-7).map(d => ({ v: d.conversion || 0 }));
const sparkAvg = DATA.slice(-7).map(d => ({ v: d.avg_basket || 0 }));

Chaque sparkline utilise une couleur DIFFERENTE:
- KPI 1: stroke="#06B6D4" (cyan)
- KPI 2: stroke="#F59E0B" (ambre)
- KPI 3: stroke="#8B5CF6" (violet)
- KPI 4: stroke="#EC4899" (magenta)

Chaque gradient doit avoir un ID UNIQUE: id="spark1", id="spark2", etc. JAMAIS le meme ID pour 2 sparklines.

6. Calcule TOUTES les valeurs dynamiquement a partir de DATA (sum, avg, count, min, max)

===== LAYOUT INTELLIGENT =====
- Layout PLEINE LARGEUR — pas de marginLeft pour sidebar
- Utilise CSS Grid: display: 'grid', gridTemplateColumns, gap: '20px'
- KPIs: gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
- Graphiques: 2 colonnes pour les grands, 3 pour les petits: gridTemplateColumns: '1fr 1fr' ou '1fr 1fr 1fr'
- AUCUNE zone vide — chaque card doit avoir du contenu pertinent
- Content area: padding: '28px', overflowY: 'auto', height: 'calc(100vh - 60px)'
- Cards doivent remplir l'espace — pas de cards trop petites ou trop grandes

===== VARIETE DE GRAPHIQUES =====
OBLIGATOIRE: chaque dashboard doit utiliser AU MINIMUM 3 types de graphiques differents parmi:
- AreaChart (pour tendances temporelles, avec gradient fill)
- BarChart (pour comparaisons, empile si pertinent avec stackId="a")
- PieChart (pour repartitions/segments)
- LineChart (pour evolution multi-series)
- Table (pour details, avec lignes alternees et tri visuel)

COULEURS OBLIGATOIRES — definir en haut du composant:
const COLORS = ['#06B6D4', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#F97316'];

PIECHARTS — REGLE CRITIQUE:
- TOUJOURS ajouter des <Cell> avec des couleurs differentes pour chaque segment
- Exemple OBLIGATOIRE:
  <PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
    {pieData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
  </Pie><Legend /><Tooltip /></PieChart>
- JAMAIS de PieChart sans <Cell fill={...} /> — sinon tout est gris et illisible
- Legende A COTE du pie (layout horizontal) pas en dessous

BARCHARTS — COULEURS VARIEES:
- Si barres representent des categories differentes, utiliser <Cell> pour chaque barre:
  {barData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
- Si barres representent une serie temporelle, une seule couleur est OK

Pour chaque graphique:
- Titre descriptif (fontSize 15px, fontWeight 600, color #F1F5F9, marginBottom 16px)
- <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
- <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={{ stroke: '#1E293B' }} />
- <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={{ stroke: '#1E293B' }} tickFormatter pour formater les grands nombres />
- <Tooltip contentStyle={{ background: '#1A2332', border: '1px solid #2A3A50', borderRadius: '8px', color: '#F1F5F9' }} formatter pour unites />
- <Legend /> si plusieurs series

===== FORMATAGE DES DONNEES =====
OBLIGATOIRE: creer une fonction utilitaire en haut du fichier:
const fmt = (n, decimals = 0) => {
  if (n === null || n === undefined) return '-';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(decimals);
};
const fmtCur = (n) => fmt(n) + ' EUR';
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

- TOUS les nombres dans les KPIs utilisent fmt() ou fmtCur()
- TOUS les pourcentages utilisent fmtPct()
- TOUS les axes Y avec des grands nombres utilisent tickFormatter={v => fmt(v)}
- TOUS les Tooltips formatent les valeurs avec les unites appropriees
- Les tables formatent chaque colonne selon son type (nombre, pourcentage, devise)

===== POINTS CLES (KEY TAKEAWAYS) =====
OBLIGATOIRE: la page principale (Synopsis/Overview) DOIT se terminer par une section "Points clés" en bas.
- Titre: "Points clés" en fontSize 15px, fontWeight 600, color #F1F5F9
- Contient 3 a 5 bullet points d'observations calculees dynamiquement a partir de DATA
- Chaque point cle est un <div> avec un indicateur colore a gauche:
  - Barre verticale verte (#10B981) si observation positive
  - Barre verticale rouge (#EF4444) si observation negative
  - Barre verticale cyan (#06B6D4) si observation neutre/informative
- Style: { display: 'flex', gap: '12px', padding: '14px 16px', background: '#0D1526', borderRadius: '10px', marginBottom: '8px' }
- Barre indicateur: { width: '3px', borderRadius: '2px', background: couleur, flexShrink: 0 }
- Texte: fontSize 13px, color #94A3B8, lineHeight 1.5

Exemples de points cles a generer automatiquement:
- "Le CA total a augmente de +17.8% par rapport a l'annee precedente (298.7K EUR vs 251.5K EUR)"
- "Le taux de conversion est en baisse de -2.1%, necessitant une attention particuliere"
- "Nike represente 38% du CA total, dominant les autres marques"
- "Le panier moyen a progresse de +6.4%, atteignant 2.2K EUR"
- "124 clients uniques identifies, en hausse de +12.4% vs PY"

IMPORTANT: les observations doivent etre CALCULEES a partir des vraies donnees, pas inventees.

===== DESIGN SYSTEM (OBLIGATOIRE — style premium data analytics) =====
Backgrounds: #0B1120 (base/body), #111827 (cards/sidebar), #1A2332 (hover/overlay), #0D1526 (header)
Borders: #1E293B (subtle), #2A3A50 (active)
Text: #F1F5F9 (primary), #94A3B8 (secondary), #64748B (tertiary/labels)
Accents: #06B6D4 (cyan principal), #EC4899 (magenta), #8B5CF6 (violet), #F59E0B (ambre)
Status: #10B981 (hausse), #EF4444 (baisse)

Composants:
Drawer: { position: 'fixed', top: 0, left: 0, height: '100vh', width: '260px', background: '#111827', borderRight: '1px solid #1E293B', padding: '20px 12px', zIndex: 1000, transform: 'translateX(0)', transition: 'transform 0.3s ease' }
Overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }
HamburgerButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }
HamburgerLine: { width: '20px', height: '2px', background: '#94A3B8', borderRadius: '1px' }
NavItem: { padding: '10px 14px', borderRadius: '10px', color: '#94A3B8', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }
NavItemActive: { background: 'rgba(6,182,212,0.1)', color: '#06B6D4', borderLeft: '3px solid #06B6D4' }
Header: { height: '60px', background: '#0D1526', borderBottom: '1px solid #1E293B', padding: '0 28px', display: 'flex', alignItems: 'center', gap: '16px' }
KPICard: { background: '#111827', borderRadius: '14px', padding: '20px', border: '1px solid #1E293B' }
Card: { background: '#111827', borderRadius: '14px', padding: '24px', border: '1px solid #1E293B' }
Table: headers #64748B uppercase 11px, lignes alternees #111827/#0D1526, hover #1A2332

REGLES DE CODE:
- Font: Inter, system-ui, sans-serif
- Transitions: all 0.2s ease
- Hover states sur elements cliquables
- TOUJOURS style={{ }} avec doubles accolades (JAMAIS style={ })
- Template literals: style={{ border: \`1px solid \${color}\` }}`;

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
- Respecte le design system (fond #0B1120, cards #111827, accent cyan #06B6D4, magenta #EC4899)
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
