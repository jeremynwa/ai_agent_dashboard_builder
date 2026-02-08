import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function loadRules() {
  const rulesDir = path.join(__dirname, "rules");
  const rules = {};

  if (fs.existsSync(rulesDir)) {
    const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(rulesDir, file), "utf-8");
      const name = file.replace(".json", "");
      rules[name] = JSON.parse(content);
    }
  }

  return rules;
}

const SYSTEM_PROMPT = `Tu es un expert React senior. Tu génères des applications d'analyse PROFESSIONNELLES style App Factory.

RÈGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide
- Structure: { "files": { "src/App.jsx": "code" } }
- Le code doit compiler sans erreur
- JAMAIS d'emojis, JAMAIS d'icônes unicode

STRUCTURE OBLIGATOIRE DE L'APP:
Chaque app générée DOIT avoir:
1. Une SIDEBAR à gauche (240px) avec navigation
2. Un HEADER en haut avec le titre
3. Une zone de CONTENU avec KPIs + graphiques

LAYOUT EXEMPLE:
┌─────────────────────────────────────────┐
│ Header: Titre de l'App                  │
├──────────┬──────────────────────────────┤
│ Sidebar  │  KPI    KPI    KPI    KPI    │
│          │  ┌─────────┐ ┌─────────┐     │
│ Overview │  │ Chart   │ │ Chart   │     │
│ Analytics│  └─────────┘ └─────────┘     │
│ Reports  │  ┌─────────────────────┐     │
│ Settings │  │ Table / List        │     │
│          │  └─────────────────────┘     │
└──────────┴──────────────────────────────┘

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
KPILabel: { fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717A' }
KPIValue: { fontSize: '28px', fontWeight: '600', color: '#FFFFFF', marginTop: '8px' }
Card: { background: '#16161A', borderRadius: '16px', padding: '24px', border: '1px solid #2E2E36' }
Button: { background: '#00765F', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '500' }
Input: { background: '#1C1C21', border: '1px solid #2E2E36', borderRadius: '8px', padding: '12px 16px', color: '#FFFFFF' }

NAVIGATION SIDEBAR (adapter selon contexte):
- Finance: Overview, Revenue, Expenses, Reports
- Sales: Overview, Pipeline, Deals, Analytics
- HR: Overview, Headcount, Turnover, Departments
- Marketing: Overview, Campaigns, Performance, Audience
- General: Overview, Analytics, Data, Settings

RÈGLES DE CODE:
- Font: Inter, system-ui, sans-serif
- Transitions: all 0.2s ease
- Pour < ou > dans le texte: utilise {"<"} ou {">"}
- Hover states sur tous les éléments cliquables
- État actif dans la sidebar avec useState`;

// Fonction pour corriger les erreurs JSX courantes
function fixJsxCode(code) {
  // Remplacer les < et > dans le texte (pas dans les balises)
  // C'est une approche simple, on remplace les patterns problématiques
  let fixed = code;
  
  // Remplacer |X| > Y par des versions safe
  fixed = fixed.replace(/\|([^|]+)\|\s*>\s*(\d)/g, '{"|\u200B$1\u200B| > $2"}');
  fixed = fixed.replace(/\|([^|]+)\|\s*<\s*(\d)/g, '{"|\u200B$1\u200B| < $2"}');
  fixed = fixed.replace(/\|([^|]+)\|\s*=\s*(\d)/g, '{"|\u200B$1\u200B| = $2"}');
  
  // Remplacer E > 0, E < 0, etc.
  fixed = fixed.replace(/([A-Z])\s*>\s*(\d)/g, '{\"$1 > $2\"}');
  fixed = fixed.replace(/([A-Z])\s*<\s*(\d)/g, '{\"$1 < $2\"}');
  
  // Remplacer les flèches
  fixed = fixed.replace(/↑/g, '(hausse)');
  fixed = fixed.replace(/↓/g, '(baisse)');
  fixed = fixed.replace(/→/g, 'implique');
  
  return fixed;
}

app.post("/generate", async (req, res) => {
  try {
    const { prompt, useRules, excelData } = req.body;

    let rulesContext = "";
    if (useRules) {
      const rules = loadRules();
      if (Object.keys(rules).length > 0) {
        rulesContext = `\n\nRÈGLES MÉTIER:\n${JSON.stringify(rules, null, 2)}`;
      }
    }

    let dataContext = "";
    if (excelData) {
      dataContext = `\n\nDONNÉES À UTILISER (intègre ces données dans l'application):
Fichier: ${excelData.fileName}
Colonnes: ${excelData.headers.join(', ')}
Données (${excelData.data.length} lignes):
${JSON.stringify(excelData.data, null, 2)}

IMPORTANT: Utilise ces données réelles dans l'application. Affiche-les dans des tableaux, graphiques, ou cards selon le contexte.`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Génère une application React pour: ${prompt}${rulesContext}${dataContext}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = message.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Pas de JSON trouvé dans la réponse");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Corriger le code JSX
    for (const [filePath, code] of Object.entries(parsed.files)) {
      parsed.files[filePath] = fixJsxCode(code);
    }

    res.json(parsed);
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/rules", (req, res) => {
  const rules = loadRules();
  res.json(rules);
});

// Endpoint pour publier sur S3
app.post("/publish", async (req, res) => {
  try {
    const { files, appName } = req.body;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Créer un ID unique pour l'app
    const appId = appName ? appName.toLowerCase().replace(/[^a-z0-9]/g, '-') : `app-${Date.now()}`;
    
    // Créer un dossier temporaire
    const tempDir = path.join(__dirname, 'temp', appId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Écrire les fichiers
    const writeFiles = (obj, basePath) => {
      for (const [name, value] of Object.entries(obj)) {
        const fullPath = path.join(basePath, name);
        if (value.directory) {
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
          }
          writeFiles(value.directory, fullPath);
        } else if (value.file) {
          fs.writeFileSync(fullPath, value.file.contents);
        }
      }
    };
    
    writeFiles(files, tempDir);
    
    // npm install et build
    console.log('Installing dependencies...');
    await execAsync('npm install', { cwd: tempDir });
    
    console.log('Building...');
    await execAsync('npm run build', { cwd: tempDir });
    
    // Upload vers S3
    const distPath = path.join(tempDir, 'dist');
    const bucket = 'ai-app-builder-sk-2026';
    
    console.log('Uploading to S3...');
    await execAsync(`aws s3 sync "${distPath}" s3://${bucket}/${appId}`, { cwd: tempDir });
    
    // Nettoyer
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    const url = `http://${bucket}.s3-website.eu-north-1.amazonaws.com/${appId}/`;
    
    res.json({ success: true, url, appId });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(3001, () => {
  console.log("✅ Backend running on http://localhost:3001");
});