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

const SYSTEM_PROMPT = `Tu es un expert React senior. Tu génères des applications React PROFESSIONNELLES au style SK Design System.

RÈGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide, rien d'autre
- Structure: { "files": { "src/App.jsx": "code ici" } }
- Le code doit compiler sans erreur

DESIGN SYSTEM SK (OBLIGATOIRE):
Couleurs de fond:
- Base: #0F0F12
- Raised (cards): #16161A
- Overlay: #1C1C21
- Subtle: #232329
- Borders: #2E2E36

Couleurs de texte:
- Primary: #FFFFFF
- Secondary: #A1A1AA
- Tertiary: #71717A
- Muted: #52525B

Couleur accent principale: #00765F (vert SK)
- Hover: #00A382
- Glow: 0 0 40px -10px rgba(0, 118, 95, 0.5)

Accents secondaires:
- Amber: #F59E0B
- Emerald: #34D399
- Sky: #38BDF8
- Coral: #EF4444

Typography:
- Font: Inter, system-ui, sans-serif
- Labels: 10px, uppercase, letter-spacing 0.05em, color #71717A
- Values: 28px, font-weight 600
- Body: 14px

Composants:
- Cards: background #16161A, border-radius 16px, border 1px solid #2E2E36, padding 24px, box-shadow 0 4px 24px -4px rgba(0,0,0,0.4)
- Buttons primary: background #00765F, padding 10px 20px, border-radius 8px
- Inputs: background #1C1C21, border 1px solid #2E2E36, border-radius 8px, padding 10px 14px
- KPI Cards: label en haut (petit, uppercase, gris), valeur grande en dessous, icône à droite dans un box vert transparent

RÈGLES STRICTES:
- JAMAIS d'emojis
- JAMAIS d'icônes unicode
- Design épuré et professionnel
- Hover states avec transitions (transition: all 0.2s ease)
- Pour < ou > dans le texte, utilise {"<"} ou {">"}

EXEMPLE DE CODE:
const styles = {
  container: { minHeight: '100vh', background: '#0F0F12', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', color: '#FFFFFF' },
  card: { background: '#16161A', borderRadius: '16px', padding: '24px', border: '1px solid #2E2E36', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.4)' },
  label: { fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717A' },
  value: { fontSize: '28px', fontWeight: '600', color: '#FFFFFF', marginTop: '8px' },
  button: { background: '#00765F', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s ease' }
};`;

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