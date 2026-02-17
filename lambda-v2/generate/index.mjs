import Anthropic from '@anthropic-ai/sdk';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { authenticateRequest } from './auth.mjs';
import { computeLocalStats } from './local-stats.mjs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const RULES_BUCKET = process.env.RULES_BUCKET || 'ai-app-builder-sk-2026';
const USE_BETA_API = process.env.USE_BETA_API === 'true';
const DASHBOARD_SKILL_ID = process.env.DASHBOARD_SKILL_ID || null;
const DATA_ANALYZER_SKILL_ID = process.env.DATA_ANALYZER_SKILL_ID || null;
const INDUSTRY_SKILL_IDS = {
  finance: process.env.INDUSTRY_FINANCE_SKILL_ID || null,
  ecommerce: process.env.INDUSTRY_ECOMMERCE_SKILL_ID || null,
  saas: process.env.INDUSTRY_SAAS_SKILL_ID || null,
  logistics: process.env.INDUSTRY_LOGISTICS_SKILL_ID || null,
};
const REVIEWER_SKILL_ID = process.env.REVIEWER_SKILL_ID || null;
const VISION_SKILL_ID = process.env.VISION_SKILL_ID || null;
const REVIEW_MODEL = process.env.REVIEW_MODEL || 'claude-sonnet-4-20250514';
const VISION_MODEL = process.env.VISION_MODEL || 'claude-sonnet-4-20250514';

// ============================================================================
// callClaude — wrapper that supports both standard and beta (skills) API
// ============================================================================
async function callClaude({ system, messages, skills = [], maxTokens = 16384, model = 'claude-sonnet-4-20250514', temperature = 0, label = 'unknown' }) {
  const startMs = Date.now();
  let response;

  if (!USE_BETA_API || skills.length === 0) {
    // Standard API — with prompt caching on system prompt
    response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: [{
        type: 'text',
        text: system,
        cache_control: { type: 'ephemeral' },
      }],
      messages,
    });
  } else {
    // Beta API with code execution + skills
    response = await anthropic.beta.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      betas: ['code-execution-2025-08-25', 'skills-2025-10-02'],
      system,
      container: {
        skills: skills.map(s =>
          typeof s === 'string'
            ? { type: 'custom', skill_id: s, version: 'latest' }
            : s
        ),
      },
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
      messages,
    });
  }

  // Structured monitoring log
  const elapsedMs = Date.now() - startMs;
  const usage = response.usage || {};
  console.log(JSON.stringify({
    event: 'claude_call',
    label,
    model,
    skills: skills.map(s => typeof s === 'string' ? s : s.skill_id || s.type),
    input_tokens: usage.input_tokens || 0,
    output_tokens: usage.output_tokens || 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
    cache_read_input_tokens: usage.cache_read_input_tokens || 0,
    elapsed_ms: elapsedMs,
    stop_reason: response.stop_reason,
  }));

  return response;
}

// Helper: extract text from response (works for both standard and beta)
function extractResponseText(response) {
  return response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');
}

// ============================================================================
// buildAuthoritativeStats — format pre-computed stats into human-readable text
// ============================================================================
function buildAuthoritativeStats(analysis) {
  const stats = analysis?.analysis?.stats || analysis?.stats || {};
  const periods = analysis?.analysis?.periods || analysis?.periods || {};
  const charts = analysis?.analysis?.chartRecommendations || analysis?.chartRecommendations || [];
  let output = '';

  for (const [colName, colStats] of Object.entries(stats)) {
    if (colStats.type === 'numeric' || colStats.type === 'currency' || colStats.type === 'percentage' || colStats.sum !== undefined) {
      output += `\n${colName} (${colStats.type || 'numeric'}): sum=${colStats.sum}, mean=${colStats.mean}, median=${colStats.median}, min=${colStats.min}, max=${colStats.max}, count=${colStats.count}`;
      if (colStats.variation) {
        output += `\n  variation: ${colStats.variation.firstPeriod} (${colStats.variation.firstValue}) -> ${colStats.variation.lastPeriod} (${colStats.variation.lastValue}) = ${colStats.variation.changePercent}%`;
      }
    } else if (colStats.type === 'categorical' || colStats.uniqueCount !== undefined) {
      output += `\n${colName} (categorical): ${colStats.uniqueCount} unique values`;
      if (colStats.topValue) output += `, top="${colStats.topValue}" (${colStats.topCount})`;
    }
  }

  if (periods.hasPeriods) {
    output += `\n\nPeriode detectee: colonne "${periods.periodColumn}" (${periods.periodType}), ${periods.periods?.length || 0} periodes, comparaison possible=${periods.canCompare}`;
  } else {
    output += '\n\nAucune colonne de periode detectee — INTERDICTION d\'afficher des variations % ou badges up/down.';
  }

  if (charts.length > 0) {
    output += '\n\nGraphiques recommandes:';
    for (const c of charts) {
      output += `\n  - ${c.type}: ${c.title || ''} (x=${c.xAxis || c.dimension}, y=${c.yAxis || c.metric})`;
    }
  }

  return output;
}

// ============================================================================
// analyzeData — pre-analyze data with data-analyzer skill before generation
// ============================================================================
async function analyzeData(dataContext) {
  if (!USE_BETA_API || !DATA_ANALYZER_SKILL_ID) return null;

  console.log('Running data analysis with data-analyzer skill...');
  const systemPrompt = 'Use the data-analyzer skill. Run the analysis scripts on the provided data. Return the analysis JSON in your text response. Do NOT write the result to a file — return it directly as text.';

  try {
    const message = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: `Analyze this data:\n${dataContext}` }],
      skills: [DATA_ANALYZER_SKILL_ID],
      maxTokens: 8192,
      label: 'data-analyze',
    });

    const text = extractResponseText(message);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Data analyzer returned no JSON, skipping analysis');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('Data analysis complete.');
    return result;
  } catch (e) {
    console.warn('Data analysis failed:', e.message);
    return null;
  }
}

const HEADERS = { 'Content-Type': 'application/json' };
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

// ============================================================================
// SYSTEM PROMPT — Design System CSS classes
// ============================================================================
const SYSTEM_PROMPT = `Tu es un expert React senior specialise en data analytics dashboards premium. Tu generes des apps React avec un design system CSS pre-integre.

REGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide
- Structure: { "files": { "src/App.jsx": "code" } }
- Le code doit compiler sans erreur
- JAMAIS d'emojis, JAMAIS d'icones unicode
- JAMAIS de chiffres inventes — toute valeur affichee doit etre CALCULEE depuis les donnees reelles
- import React et tous les hooks depuis "react"
- import Recharts depuis "recharts"

STYLING — DESIGN SYSTEM CSS:
Un fichier ds.css est pre-charge avec des classes utilitaires. Tu DOIS utiliser className="" avec ces classes.
Tu peux AUSSI utiliser style={{ }} pour des valeurs dynamiques ou specifiques (hauteurs, largeurs precises).
COMBINE les deux librement : className pour les patterns communs, style pour le sur-mesure.

CLASSES DISPONIBLES:

Layout: min-h-screen, h-screen, w-full, overflow-y-auto, overflow-x-auto, overflow-hidden, relative, absolute, fixed, inset-0, top-0, left-0, right-0, bottom-0, z-50, z-999, z-1000

Flexbox: flex, inline-flex, flex-col, flex-wrap, items-center, items-start, items-end, justify-center, justify-between, justify-end, flex-1, shrink-0

Grid: grid, grid-cols-1/2/3/4/5, col-span-2
Responsive grids: grid-kpis (auto-fit minmax 220px), grid-charts-2 (1→2 cols), grid-charts-3 (1→2→3 cols)

Gap: gap-1(4px) gap-2(8px) gap-3(12px) gap-4(16px) gap-5(20px) gap-6(24px) gap-8(32px)

Padding: p-0 a p-8, px-2 a px-7, py-1 a py-4
Margin: mb-1 a mb-8, mt-2 mt-4 mt-6

Backgrounds: bg-base(#0B1120) bg-card(#111827) bg-card-hover(#1A2332) bg-card-alt(#0D1526) bg-accent(#06B6D4) bg-accent-10 bg-magenta bg-violet bg-amber bg-up bg-up-10 bg-down bg-down-10 bg-black-50 bg-transparent

Text: text-primary(#F1F5F9) text-secondary(#94A3B8) text-tertiary(#64748B) text-accent text-magenta text-violet text-amber text-up text-down text-white

Borders: border, border-b, border-t, border-r, border-l, border-none
Radius: rounded(6px) rounded-lg(10px) rounded-xl(14px) rounded-full rounded-sm(2px)

Typography: text-xs(12) text-sm(14) text-base(16) text-lg(18) text-xl(20) text-2xl(24) text-3xl(30) text-11 text-13 text-15 text-28
Weights: font-normal font-medium font-semibold font-bold
Deco: uppercase tracking-wider leading-tight leading-relaxed text-left text-center text-right truncate

Transition: transition, transition-transform, transition-colors
Transform: translate-x-0, -translate-x-full
Cursor: cursor-pointer, select-none
Animation: animate-pulse

COMPOSANTS PRE-DEFINIS:
- card — bg #111827, rounded-xl, border, p-24
- kpi-card — card + flex-col + gap-6
- kpi-label — 11px uppercase text-3
- kpi-value — 28px bold text-1
- kpi-comparison — 12px text-2
- badge-up / badge-down — 13px semibold vert/rouge
- section-title — 15px semibold mb-16
- app-header — 60px fixed header bg-card-alt
- nav-item / nav-item-active — sidebar nav items
- tab-btn / tab-btn-active — header tabs
- hamburger + hamburger-line — menu button
- overlay — fixed bg noir 50%
- drawer + drawer-open / drawer-closed — panneau lateral
- content-area — padding + scroll + h-calc
- insight-item + insight-bar + insight-bar-up/down/accent + insight-text — points cles
- table-header-cell, table-cell, table-row-even, table-row-odd — tableau
- hover-card, hover-bg — hover helpers
- skeleton — loading placeholder

STRUCTURE OBLIGATOIRE:
1. PAS de sidebar fixe — un DRAWER qui s'ouvre/ferme
2. HEADER (app-header) avec hamburger + titre + tab-btn onglets
3. CONTENU pleine largeur (content-area) avec KPIs + graphiques + tableaux

DRAWER:
<div className="overlay" onClick={() => setDrawerOpen(false)} />
<div className={\`drawer \${isDrawerOpen ? 'drawer-open' : 'drawer-closed'}\`}>
  {pages.map(p => <button className={\`nav-item \${activePage === p.id ? 'nav-item-active' : ''}\`} onClick={() => {setPage(p.id); setDrawerOpen(false)}}>{p.label}</button>)}
</div>

HEADER:
<header className="app-header">
  <button className="hamburger" onClick={() => setDrawerOpen(true)}>
    <div className="hamburger-line" /><div className="hamburger-line" /><div className="hamburger-line" />
  </button>
  <span className="text-base font-semibold text-primary">Titre</span>
  <div className="flex gap-2" style={{marginLeft:'auto'}}>
    {pages.map(p => <button className={\`tab-btn \${activePage === p.id ? 'tab-btn-active' : ''}\`} onClick={() => setPage(p.id)}>{p.label}</button>)}
  </div>
</header>

REGLES BOUTONS: PAS de "Refresh" ni "Export". Seuls: hamburger + onglets.

===== PAGES / ONGLETS =====
Chaque dashboard a 3-4 onglets. Regles par type de page:

VUE D'ENSEMBLE: KPIs + graphiques + points cles (page principale)

ANALYSES / RAPPORTS:
- INTERDIT d'afficher juste du texte ou des gros chiffres centres — c'est un DASHBOARD, tout doit etre VISUEL
- OBLIGATOIRE: au moins 2 graphiques Recharts (BarChart, AreaChart, PieChart, etc.) + 1 tableau de donnees
- OBLIGATOIRE: une BARRE DE FILTRES en haut de la page (voir section FILTRES)
- Les graphiques et tableaux reagissent aux filtres selectionnes
- Comparer periodes, segments, categories avec des graphiques cote-a-cote

PARAMETRES:
- Design impose — structure EXACTE a suivre:
<div className="content-area">
  <div className="card mb-6">
    <h3 className="section-title">Parametres</h3>
    {settingsItems.map((item, i) => (
      <div key={i} className="flex items-center justify-between py-3" style={{borderBottom: i < settingsItems.length-1 ? '1px solid #1E293B' : 'none'}}>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-primary">{item.label}</span>
          <span className="text-xs text-tertiary">{item.description}</span>
        </div>
        {item.type === 'toggle' ? (
          <button className={\`px-3 py-1 rounded text-xs font-semibold \${item.value ? 'bg-accent text-white' : 'border text-secondary'}\`}
            onClick={() => toggleSetting(item.key)}>{item.value ? 'Active' : 'Desactive'}</button>
        ) : (
          <span className="text-sm font-semibold text-accent">{item.display}</span>
        )}
      </div>
    ))}
  </div>
  <div className="card">
    <h3 className="section-title">Informations sur les donnees</h3>
    <div className="grid grid-cols-2 gap-4">
      {dataInfo.map((info, i) => (
        <div key={i} className="flex flex-col gap-1">
          <span className="text-11 uppercase tracking-wider text-tertiary">{info.label}</span>
          <span className="text-sm font-semibold text-primary">{info.value}</span>
        </div>
      ))}
    </div>
  </div>
</div>
- Les settings doivent avoir: label + description sur la gauche, valeur/toggle sur la droite
- Espacement correct entre label et description (gap-1, pas colles)

===== FILTRES =====
Sur les pages Analyses et Rapports, TOUJOURS une barre de filtres en haut:
<div className="flex flex-wrap gap-3 mb-6">
  {filterOptions.map(filter => (
    <select key={filter.key} className="px-3 py-2 rounded-lg text-sm text-primary"
      style={{background:'#1A2332', border:'1px solid #1E293B', outline:'none'}}
      value={filters[filter.key]} onChange={e => setFilters(prev => ({...prev, [filter.key]: e.target.value}))}>
      <option value="all">{filter.label} (Tous)</option>
      {filter.values.map(v => <option key={v} value={v}>{v}</option>)}
    </select>
  ))}
</div>
- Filtres generes DYNAMIQUEMENT a partir des colonnes des donnees (marques, categories, segments, periodes, etc.)
- useState pour l'etat des filtres, useMemo pour filtrer les donnees
- Les graphiques et tableaux de la page utilisent les donnees FILTREES

===== KPIs =====
3-5 KPIs dans une grid responsive:
<div className="grid-kpis mb-6">
  <div className="kpi-card">
    <span className="kpi-label">Revenue</span>
    <span className="kpi-value">{fmtCur(total)}</span>
    {/* Mini sparkline */}
  </div>
</div>

REGLE ABSOLUE — ZERO CHIFFRE INVENTE:
- TOUS les chiffres affiches doivent etre CALCULES a partir des donnees reelles
- INTERDIT d'inventer des comparaisons "Precedent", "Annee derniere", "Objectif" si ces donnees N'EXISTENT PAS dans le dataset
- Si les donnees n'ont PAS de colonne date/periode permettant de comparer: PAS de variation %, PAS de "Actuel vs Precedent"
- Si les donnees ONT des periodes comparables (ex: mois, trimestres): calculer la variation a partir des VRAIES valeurs
- En cas de doute, afficher SEULEMENT la valeur calculee, sans comparaison
- Les badges badge-up/badge-down ne sont utilises QUE si la variation est calculable a partir des donnees

SPARKLINES — chaque KPI utilise donnees et couleurs DIFFERENTES:
KPI1: stroke="#06B6D4", KPI2: stroke="#F59E0B", KPI3: stroke="#8B5CF6", KPI4: stroke="#EC4899"
Chaque gradient SVG = ID UNIQUE.
IMPORTANT: Sparklines dans <ResponsiveContainer width="100%" height={40}> — PAS plus grand.

===== GRAPHIQUES =====
MINIMUM 3 types: AreaChart, BarChart, PieChart, LineChart, Table
COULEURS: const COLORS = ['#06B6D4','#EC4899','#8B5CF6','#F59E0B','#10B981','#F97316'];
PIECHARTS: TOUJOURS <Cell fill={COLORS[i % COLORS.length]} /> + <Legend wrapperStyle={{color:'#94A3B8', fontSize:'12px'}} /> — Cell pour les couleurs, Legend pour la legende.

Wrapper:
<div className="card mb-6">
  <h3 className="section-title">Titre</h3>
  <ResponsiveContainer width="100%" height={300}>...</ResponsiveContainer>
</div>

Ou en grid:
<div className="grid-charts-2 mb-6">
  <div className="card">...</div>
  <div className="card">...</div>
</div>

Config Recharts (props style inline car Recharts n'accepte pas de className):
- <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
- <XAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
- <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
- <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />

BARCHART — exemple complet OBLIGATOIRE:
<BarChart data={barData}>
  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
  <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} />
  <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'#1E293B' }} tickFormatter={v => fmt(v)} />
  <Tooltip contentStyle={{ background:'#1A2332', border:'1px solid #2A3A50', borderRadius:'8px', color:'#F1F5F9' }} />
  <Bar dataKey="value" fill="#06B6D4" radius={[4,4,0,0]} />
</BarChart>
IMPORTANT: <Bar> DOIT avoir dataKey pointant vers une propriete NUMERIQUE existante dans les donnees + fill avec une couleur. Sans <Bar>, aucune barre ne s'affiche!

FILTRES SELECT — style OBLIGATOIRE (sinon invisible sur fond sombre):
Chaque <select> DOIT avoir: style={{background:'#1A2332', border:'1px solid #1E293B', outline:'none'}}

===== TABLES =====
<div className="card mb-6">
  <h3 className="section-title">Titre</h3>
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead><tr>
        <th className="table-header-cell">Nom</th>
        <th className="table-header-cell" style={{textAlign:'right'}}>Metrique</th>
      </tr></thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className={\`\${i%2===0?'table-row-even':'table-row-odd'} hover-bg\`}>
            <td className="table-cell">{row.name}</td>
            <td className="table-cell" style={{textAlign:'right'}}>{fmtCur(row.val)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
REGLE TABLEAUX: Colonnes numeriques (montants, quantites, %) DOIVENT avoir style={{textAlign:'right'}} sur <th> ET <td>.
TABLES — REGLES CRITIQUES:
- JAMAIS de valeurs repetees/identiques sur plusieurs lignes — chaque ligne DOIT avoir des metriques DIFFERENTES calculees par aggregation
- Utiliser DATA.reduce() avec groupBy pour agreger, puis .sort() pour trier par metrique decroissante, puis .slice(0, 10) pour Top 10
- Si toutes les valeurs sont identiques dans le tableau, c'est un BUG d'aggregation — verifier la logique reduce/groupBy
- Colonnes de tableaux: JAMAIS d'IDs bruts (order_id, client_id) — toujours des noms, categories, labels lisibles

===== FORMATAGE =====
const fmt = (n, d=0) => { if(n==null) return '-'; if(Math.abs(n)>=1e6) return (n/1e6).toFixed(1)+'M'; if(Math.abs(n)>=1e3) return (n/1e3).toFixed(1)+'K'; return n.toFixed(d); };
const fmtCur = (n) => fmt(n)+' EUR';
const fmtPct = (n) => (n>=0?'+':'')+n.toFixed(1)+'%';

===== POINTS CLES =====
Page principale finit par:
<div className="card">
  <h3 className="section-title">Points cles</h3>
  {takeaways.map((t,i) => (
    <div key={i} className="insight-item">
      <div className={\`insight-bar \${t.type==='up'?'insight-bar-up':t.type==='down'?'insight-bar-down':'insight-bar-accent'}\`} />
      <p className="insight-text">{t.text}</p>
    </div>
  ))}
</div>

REGLE ABSOLUE INSIGHTS: Chaque insight DOIT etre un template literal avec des valeurs CALCULEES via useMemo.
INTERDIT: const takeaways = [{text: "Le CA est de 1.5M EUR", type: "up"}]
OBLIGATOIRE: const takeaways = useMemo(() => { const total = DATA.reduce((s,r) => s + (Number(r.col)||0), 0); return [{text: \`Le CA est de \${fmtCur(total)}\`, type: 'accent'}]; }, []);
ZERO chiffre en dur dans les strings d'insights. ZERO comparaison "precedent"/"objectif" si pas de colonne de periode.

===== REGLES DE CODE =====
- className pour les patterns du DS, style={{ }} pour le sur-mesure
- NE PAS generer de fichier CSS — ds.css est deja fourni
- NE PAS importer ds.css dans App.jsx — c'est fait dans main.jsx`;

const DATA_INJECTION_PROMPT = `

REGLES DONNEES EXTERNES:
1. Creer "src/data.js" = export const DATA = "__INJECT_DATA__";
2. Dans App.jsx: import { DATA } from './data';
3. KPIs CALCULES dynamiquement
4. Placeholder remplace automatiquement`;

const DB_PROXY_PROMPT = `

REGLES BASE DE DONNEES:
1. Creer "src/db.js":
const PROXY_URL = "__DB_PROXY_URL__";
const DB_CREDENTIALS = "__DB_CREDENTIALS__";
export async function queryDb(sql) {
  const res = await fetch(PROXY_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({credentials:DB_CREDENTIALS,sql}) });
  if(!res.ok) throw new Error('Query failed');
  return (await res.json()).rows;
}

2. import { queryDb } from './db';
3. useEffect + useState
4. Loading: <div className="skeleton" style={{height:'32px',width:'100%'}}></div>
5. NE JAMAIS hardcoder`;

const VISION_SYSTEM_PROMPT = `Tu es un expert UI/UX React senior. Tu analyses des screenshots et ameliores le code.
REGLES: JSON valide { "files": { "src/App.jsx": "code" } }. Compile sans erreur.
Design system CSS disponible: card, kpi-card, grid-kpis, section-title, etc.
Couleurs: bg-base, bg-card, text-primary, text-accent, etc.`;

const VISION_USER_PROMPT = `Screenshot + code source. Analyse et corrige:
1. Layout, zones vides 2. Chevauchements 3. Lisibilite 4. Graphiques 5. KPIs 6. Espacement 7. Coherence

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

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });
  console.log(`Authenticated: ${user.email || user.sub}`);

  try {
    const body = JSON.parse(event.body || '{}');
    const { prompt, useRules, excelData, existingCode, existingFiles, dbContext, screenshot, industry, modelHint, cachedAnalysis } = body;
    const existingApp = existingCode || existingFiles || null;

    // ============ REVIEW (skill-based) ============
    if (modelHint === 'review' && USE_BETA_API && REVIEWER_SKILL_ID && existingApp) {
      console.log('Running skill-based review...');
      const appCode = existingApp['src/App.jsx'] || '';

      const reviewMessage = await callClaude({
        system: 'Use the dashboard-reviewer skill. Run check_code.py on the provided code, then review for visual quality using references/checklist.md. Fix all errors and return the complete fixed code as JSON: { "files": { "src/App.jsx": "..." } }. Return JSON in your TEXT response, NOT as a file.',
        messages: [{ role: 'user', content: `Review and fix this React dashboard code:\n\n${appCode}` }],
        skills: [REVIEWER_SKILL_ID],
        maxTokens: 16384,
        model: REVIEW_MODEL,
        label: 'review',
      });

      const reviewContent = extractResponseText(reviewMessage);
      const reviewJsonMatch = reviewContent.match(/\{[\s\S]*\}/);
      if (!reviewJsonMatch) throw new Error('No JSON from reviewer');
      const reviewParsed = JSON.parse(reviewJsonMatch[0]);
      for (const [fp, code] of Object.entries(reviewParsed.files)) reviewParsed.files[fp] = fixJsxCode(code);
      return reply(200, reviewParsed);
    }

    // ============ VISION ============
    if (screenshot && prompt === '__VISION_ANALYZE__') {
      let codeContext = '';
      if (existingApp) { for (const [p, c] of Object.entries(existingApp)) codeContext += `--- ${p} ---\n${c}\n\n`; }

      let visionResponse;
      const startVision = Date.now();

      if (USE_BETA_API && VISION_SKILL_ID) {
        // Skill mode: vision-analyzer skill provides reference files for common issues
        console.log('Running skill-based vision analysis...');
        visionResponse = await callClaude({
          system: 'Use the vision-analyzer skill. Analyze the screenshot and fix visual issues in the code. Return JSON: { "files": { "src/App.jsx": "..." } }. Return JSON in your TEXT response, NOT as a file.',
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot } },
            { type: 'text', text: 'Screenshot + code source. Analyse et corrige:\n1. Layout 2. Chevauchements 3. Lisibilite 4. Graphiques 5. KPIs 6. Espacement 7. Coherence\n\nCODE ACTUEL:\n' + codeContext + '\n\nRetourne le JSON complet.' },
          ]}],
          skills: [VISION_SKILL_ID],
          maxTokens: 16384,
          model: VISION_MODEL,
          label: 'vision',
        });
      } else {
        // Fallback: standard API with hardcoded prompts
        visionResponse = await anthropic.messages.create({
          model: VISION_MODEL, max_tokens: 16384,
          system: [{ type: 'text', text: VISION_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot } },
            { type: 'text', text: VISION_USER_PROMPT + codeContext + '\n\nRetourne le JSON complet.' },
          ]}],
        });
        // Log for fallback vision call
        const visionUsage = visionResponse.usage || {};
        console.log(JSON.stringify({
          event: 'claude_call', label: 'vision-fallback', model: VISION_MODEL, skills: [],
          input_tokens: visionUsage.input_tokens || 0, output_tokens: visionUsage.output_tokens || 0,
          cache_creation_input_tokens: visionUsage.cache_creation_input_tokens || 0,
          cache_read_input_tokens: visionUsage.cache_read_input_tokens || 0,
          elapsed_ms: Date.now() - startVision, stop_reason: visionResponse.stop_reason,
        }));
      }

      const content = extractResponseText(visionResponse);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Pas de JSON (vision)');
      const parsed = JSON.parse(jsonMatch[0]);
      for (const [fp, code] of Object.entries(parsed.files)) parsed.files[fp] = fixJsxCode(code);
      return reply(200, parsed);
    }

    // ============ GENERATE / REFINE ============
    if (!prompt) return reply(400, { error: 'Prompt is required' });

    let rulesContext = '';
    if (useRules) {
      const rules = await loadRules();
      if (Object.keys(rules).length > 0) rulesContext = `\n\nREGLES METIER:\n${JSON.stringify(rules, null, 2)}`;
    }

    // Build data context (same for both modes)
    let dataContext = '';
    let analyzerDataContext = '';
    if (dbContext) {
      const schemaDesc = Object.entries(dbContext.schema).map(([table, info]) => {
        const cols = info.columns.map(c => `  - ${c.name} (${c.type})`).join('\n');
        const sampleStr = info.sample?.length > 0 ? `\nExemple:\n${JSON.stringify(info.sample.slice(0,3), null, 2)}` : '';
        return `Table "${table}" (${info.rowCount} lignes):\n${cols}${sampleStr}`;
      }).join('\n\n');
      dataContext = `\n\nBDD (${dbContext.type}):\n${schemaDesc}\n\nUtilise queryDb().`;
    } else if (excelData) {
      const rawData = excelData.data || excelData.fullData || [];
      const promptSample = rawData.slice(0, 30);
      const headers = excelData.headers || (promptSample.length > 0 ? Object.keys(promptSample[0]) : []);

      // For Claude: 30 rows for SCHEMA understanding only (never compute aggregates from this)
      dataContext = `\n\nDONNEES:\nFichier: ${excelData.fileName || 'data'}\nColonnes: ${headers.join(', ')}\nTotal: ${excelData.totalRows || rawData.length} lignes\nEchantillon (30 lignes pour comprendre la STRUCTURE — ne PAS calculer de valeurs depuis cet echantillon):\n${JSON.stringify(promptSample, null, 2)}\n\nUtilise "__INJECT_DATA__" dans src/data.js. Toutes les valeurs affichees doivent etre CALCULEES dynamiquement depuis le tableau DATA complet (DATA.reduce, DATA.filter, etc.).`;

      // For the analyzer: all received rows (up to 2000 sent by frontend)
      analyzerDataContext = `\n\nDONNEES COMPLETES POUR ANALYSE:\nFichier: ${excelData.fileName || 'data'}\nColonnes: ${headers.join(', ')}\nTotal: ${excelData.totalRows || rawData.length} lignes\nDonnees (${rawData.length} lignes):\n${JSON.stringify(rawData)}\n`;
    }

    // Pre-analyze data with data-analyzer skill (if available)
    // Skip if cachedAnalysis provided by frontend (same dataset, different prompt)
    let analysisContext = '';
    let analysisResult = null;
    const buildAnalysisContext = (analysis) => {
      const statsText = buildAuthoritativeStats(analysis);
      return `\n\n===== STATISTIQUES AUTORITAIRES (calculees par Python sur les donnees reelles) =====${statsText}

===== REGLES D'UTILISATION OBLIGATOIRES =====
- Ces nombres sont CORRECTS (calcules sur les donnees reelles). UTILISER ces valeurs pour valider vos KPIs.
- NE PAS recalculer depuis l'echantillon de 30 lignes du prompt.
- Si "variation" est ABSENT pour une colonne → PAS de badge up/down pour ce KPI.
- Points Cles: OBLIGATOIREMENT des template literals + expressions calculees via useMemo, JAMAIS de chiffres en dur.
- L'echantillon de 30 lignes est pour comprendre la STRUCTURE, pas pour calculer des valeurs.
- TOUT chiffre affiche dans le dashboard DOIT etre calcule dynamiquement depuis DATA (reduce, filter, map).

${JSON.stringify(analysis, null, 2)}`;
    };

    if (cachedAnalysis) {
      console.log('Using cached data analysis from frontend');
      analysisResult = cachedAnalysis;
      analysisContext = buildAnalysisContext(cachedAnalysis);
    } else if (excelData) {
      // Priority 1: Local stats (computed on ALL received rows — fast, free, 100% accurate)
      const rawData = excelData.data || excelData.fullData || [];
      const localAnalysis = computeLocalStats(rawData);
      if (localAnalysis) {
        console.log(`Local stats computed on ${localAnalysis.rowCount} rows (source: ${localAnalysis.source})`);
        analysisResult = localAnalysis;
        analysisContext = buildAnalysisContext(localAnalysis);
      }

      // Priority 2: Data-analyzer skill (optional enrichment — chart recs may be smarter)
      if (!analysisResult && dataContext && USE_BETA_API && DATA_ANALYZER_SKILL_ID) {
        const analysis = await analyzeData(analyzerDataContext || dataContext);
        if (analysis) {
          analysisResult = analysis;
          analysisContext = buildAnalysisContext(analysis);
        }
      }
    } else if (dataContext && USE_BETA_API && DATA_ANALYZER_SKILL_ID) {
      // DB mode: no local stats, use data-analyzer skill if available
      const analysis = await analyzeData(dataContext);
      if (analysis) {
        analysisResult = analysis;
        analysisContext = buildAnalysisContext(analysis);
      }
    }

    // Determine system prompt and skills
    let systemPrompt;
    let skills = [];

    if (USE_BETA_API && DASHBOARD_SKILL_ID) {
      // Skill mode: minimal system prompt (skill has all the rules)
      systemPrompt = `Use the dashboard-generator skill. Read ALL reference files before generating.

RAPPELS CRITIQUES (en plus du skill):
- OBLIGATOIRE: Section "Points cles" (insight-item) en bas de la page Vue d'Ensemble — NE JAMAIS l'omettre
- OBLIGATOIRE: Filtres <select> styles avec style={{background:'#1A2332', border:'1px solid #1E293B', outline:'none'}} sur les pages Analyses
- INTERDIT: Colonnes ID (order_id, product_id, transaction_id, customer_id) comme axes de graphiques ou colonnes principales de tableaux — utiliser noms, categories, dates
- INTERDIT: Tableaux de donnees brutes (commandes individuelles, transactions) — toujours agreger (Top 10-15 par dimension significative)
- INTERDIT: PieChart sans <Cell fill={COLORS[i % COLORS.length]} /> et sans <Legend wrapperStyle={{color:'#94A3B8', fontSize:'12px'}} />
- Voir references/data-intelligence.md pour les regles completes d'agregation et de qualite des donnees
- ANTI-HALLUCINATION: TOUS les KPIs, badges, sparklines et Points Cles DOIVENT etre des expressions JavaScript calculees depuis DATA (reduce, filter, map). ZERO constante numerique representant une valeur de donnee.
- ANTI-HALLUCINATION: Les Points Cles (takeaways) DOIVENT etre dans un useMemo avec template literals. Ex: \`Le CA total est de \${fmtCur(total)}\` — JAMAIS: "Le CA total est de 1.5M EUR"
- ANTI-HALLUCINATION: L'echantillon de 30 lignes dans le prompt est pour comprendre la STRUCTURE. NE PAS calculer de valeurs depuis cet echantillon. Le tableau DATA complet sera injecte a l'execution.`;
      skills.push(DASHBOARD_SKILL_ID);

      if (dbContext) {
        systemPrompt += ' MODE: Database — see references/mode-database.md in the skill.';
      } else if (excelData) {
        systemPrompt += ' MODE: Excel — see references/mode-excel.md in the skill.';
      }

      // Add industry skill if selected
      if (industry && INDUSTRY_SKILL_IDS[industry]) {
        skills.push(INDUSTRY_SKILL_IDS[industry]);
        systemPrompt += ` INDUSTRY: ${industry} — see the industry skill references for sector-specific KPIs, chart types, and vocabulary.`;
      }

      // Force JSON output in text (not in container files)
      systemPrompt += '\n\nCRITICAL OUTPUT FORMAT: Return your final answer as a JSON object directly in your text response: { "files": { "src/App.jsx": "...", ... } }. Do NOT write files to the container. Return the complete JSON as TEXT.';
    } else {
      // Standard mode: full monolithic prompt (fallback)
      systemPrompt = SYSTEM_PROMPT;
      if (dbContext) systemPrompt += DB_PROXY_PROMPT;
      else if (excelData) systemPrompt += DATA_INJECTION_PROMPT;
    }

    let userMessage = '';
    if (existingApp) {
      userMessage = `Code actuel:\n\n`;
      for (const [p, c] of Object.entries(existingApp)) userMessage += `--- ${p} ---\n${c}\n\n`;
      userMessage += `\nMODIFICATION: ${prompt}${rulesContext}${dataContext}${analysisContext}\n\nRetourne le JSON complet.`;
    } else {
      userMessage = `Genere une app React dashboard pour: ${prompt}${rulesContext}${dataContext}${analysisContext}`;
    }

    // Determine model: review/vision use their own model, else default Sonnet
    const effectiveModel = modelHint === 'review' ? REVIEW_MODEL
      : modelHint === 'vision' ? VISION_MODEL
      : 'claude-sonnet-4-20250514';

    const generateLabel = modelHint === 'review' ? 'review-fallback' : 'generate';
    const message = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      skills,
      model: effectiveModel,
      label: generateLabel,
    });

    const content = extractResponseText(message);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Pas de JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    for (const [fp, code] of Object.entries(parsed.files)) parsed.files[fp] = fixJsxCode(code);

    // Include analysis result so frontend can cache it for subsequent calls
    if (analysisResult && !cachedAnalysis) {
      parsed._analysisResult = analysisResult;
    }
    return reply(200, parsed);
  } catch (error) {
    console.error('Generate error:', error);
    return reply(500, { error: error.message });
  }
};
