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

const SYSTEM_PROMPT = `Tu es un expert React senior. Tu génères des applications React PROFESSIONNELLES et MODERNES.

RÈGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide, rien d'autre
- Structure: { "files": { "src/App.jsx": "code ici" } }
- Le code doit compiler sans erreur

DESIGN OBLIGATOIRE:
- Design moderne et épuré, style SaaS/startup
- Palette de couleurs professionnelle (pas de couleurs criardes)
- Utilise des dégradés subtils, ombres douces, border-radius
- Typographie claire avec bonne hiérarchie (titres, sous-titres, texte)
- Espacement généreux (padding, margin)
- JAMAIS d'emojis, JAMAIS d'icônes unicode
- Utilise des mots pour les boutons (ex: "Ajouter" pas "+")

STYLE CSS (inline avec style={{}}):
- Fond: dégradés de gris/bleu foncé (#0f172a, #1e293b, #334155)
- Texte: blanc (#ffffff) ou gris clair (#e2e8f0, #94a3b8)
- Accents: bleu (#3b82f6), indigo (#6366f1), ou emeraude (#10b981)
- Boutons: dégradés, hover states, transitions
- Cards: fond semi-transparent, bordures subtiles, ombres
- Inputs: fond sombre, bordures au focus, placeholder visible

CODE REACT:
- Composants fonctionnels avec hooks (useState, useEffect)
- Noms de variables clairs et explicites
- Gestion des états propre
- Pour afficher < ou > dans le texte, utilise {"<"} ou {">"}
- Pour | utilise le mot "ou"

EXEMPLE DE STYLE:
{
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '40px', fontFamily: 'system-ui, sans-serif' },
  card: { background: 'rgba(30, 41, 59, 0.8)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(148, 163, 184, 0.1)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' },
  title: { fontSize: '28px', fontWeight: '600', color: '#ffffff', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#94a3b8', marginBottom: '32px' },
  button: { background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: '500', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
  input: { width: '100%', padding: '12px 16px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px', color: '#ffffff', fontSize: '14px' }
}`;

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