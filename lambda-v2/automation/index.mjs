// lambda-v2/automation/index.mjs — Automation templates: list, generate, save
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from './auth.mjs';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const BUCKET = process.env.PUBLISH_BUCKET;
const PREFIX = 'automation-templates/';
const MODEL = process.env.AUTOMATION_MODEL || 'claude-sonnet-4-20250514';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

// ============ S3 HELPERS ============

async function listTemplates() {
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: PREFIX,
  }));

  const keys = (result.Contents || [])
    .map(o => o.Key)
    .filter(k => k.endsWith('.json'));

  const templates = [];
  for (const key of keys) {
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const text = await obj.Body.transformToString();
      const tmpl = JSON.parse(text);
      // Return metadata only (no steps/code) for listing
      templates.push({
        id: tmpl.id,
        name: tmpl.name,
        description: tmpl.description,
        tags: tmpl.tags || [],
        author: tmpl.author,
        createdAt: tmpl.createdAt,
      });
    } catch (e) {
      console.warn(`Failed to parse template ${key}:`, e.message);
    }
  }

  return templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getTemplate(id) {
  const key = `${PREFIX}${id}.json`;
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const text = await obj.Body.transformToString();
  return JSON.parse(text);
}

async function saveTemplate(template) {
  const key = `${PREFIX}${template.id}.json`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(template, null, 2),
    ContentType: 'application/json',
  }));
}

// ============ CLAUDE GENERATION ============

const SYSTEM_PROMPT = `Tu es un architecte d'automatisation expert. Tu aides les consultants à créer des workflows d'automatisation pour leurs processus métier.

RÈGLES:
1. Chaque automatisation est un workflow composé d'étapes connectées (steps)
2. Types d'étapes: "trigger" (déclencheur), "action" (traitement), "condition" (branchement), "output" (résultat final)
3. Chaque étape a: id, type, label (court), description (détaillée), code (pseudocode/code réel), dependsOn (liste d'IDs)
4. Les connections suivent les dependsOn: si step-2 dependsOn ["step-1"], alors step-1 → step-2
5. Commence toujours par un trigger et termine par un output
6. Génère du code réaliste et utile (Python, JavaScript, ou pseudocode selon le contexte)
7. Les labels et descriptions sont en français
8. Génère entre 3 et 8 étapes selon la complexité

FORMAT DE RÉPONSE (JSON strict):
{
  "name": "Nom de l'automatisation",
  "description": "Description courte",
  "tags": ["tag1", "tag2"],
  "steps": [
    {
      "id": "step-1",
      "type": "trigger",
      "label": "Label court",
      "description": "Description détaillée",
      "code": "// code de l'étape",
      "dependsOn": []
    }
  ],
  "connections": [
    { "from": "step-1", "to": "step-2" }
  ],
  "metadata": {
    "estimatedDuration": "~X min par exécution",
    "requiredIntegrations": ["integration1"],
    "complexity": "simple|medium|complex"
  }
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans markdown, sans backticks, sans texte avant ou après.`;

async function generateAutomation(prompt, templates) {
  // Step 1: Ask Claude to find a matching template (if any exist)
  let matchedTemplate = null;

  if (templates.length > 0) {
    const templateList = templates.map(t =>
      `- ID: ${t.id} | "${t.name}" — ${t.description} [tags: ${(t.tags || []).join(', ')}]`
    ).join('\n');

    const matchResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      temperature: 0,
      system: `Tu reçois une liste de templates d'automatisation existants et une demande utilisateur. Si un template existant est très similaire à la demande (>60% de correspondance), retourne son ID. Sinon retourne "none". Réponds UNIQUEMENT avec l'ID ou "none", rien d'autre.`,
      messages: [{
        role: 'user',
        content: `Demande: "${prompt}"\n\nTemplates existants:\n${templateList}`,
      }],
    });

    const matchId = matchResponse.content[0]?.text?.trim();
    if (matchId && matchId !== 'none') {
      try {
        matchedTemplate = await getTemplate(matchId);
        console.log(`Matched template: ${matchId} ("${matchedTemplate.name}")`);
      } catch (e) {
        console.warn(`Failed to fetch matched template ${matchId}:`, e.message);
      }
    }
  }

  // Step 2: Generate automation (from scratch or adapt template)
  let userMessage = `Crée une automatisation pour: "${prompt}"`;

  if (matchedTemplate) {
    userMessage += `\n\nUn template similaire existe déjà. Adapte-le à la demande:\n${JSON.stringify(matchedTemplate, null, 2)}\n\nModifie les étapes, labels, descriptions et code pour correspondre exactement à la demande de l'utilisateur. Garde la structure si elle est pertinente, mais n'hésite pas à ajouter/supprimer des étapes.`;
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0]?.text?.trim();

  // Parse JSON response
  let automation;
  try {
    automation = JSON.parse(text);
  } catch {
    // Try extracting JSON from potential markdown wrapping
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      automation = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse automation JSON from Claude response');
    }
  }

  return { automation, matchedTemplateId: matchedTemplate?.id || null };
}

// ============ HANDLER ============

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  const method = event.requestContext?.http?.method;
  const path = event.requestContext?.http?.path || '';

  try {
    // GET /automation/templates — list all templates
    if (method === 'GET' && path.includes('/templates')) {
      const templates = await listTemplates();
      return reply(200, { templates });
    }

    // POST /automation/generate — generate automation from prompt
    if (method === 'POST' && path.includes('/generate')) {
      const body = JSON.parse(event.body || '{}');
      const { prompt } = body;

      if (!prompt || prompt.trim().length < 5) {
        return reply(400, { error: 'Prompt is required (min 5 characters)' });
      }

      // List existing templates for matching
      const templates = await listTemplates();
      const result = await generateAutomation(prompt, templates);

      return reply(200, result);
    }

    // POST /automation/templates — save a new template
    if (method === 'POST' && path.includes('/templates') && !path.includes('/generate')) {
      const body = JSON.parse(event.body || '{}');

      const template = {
        id: body.id || randomUUID(),
        name: body.name || 'Untitled Automation',
        description: body.description || '',
        tags: body.tags || [],
        author: user.email || user.sub,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        steps: body.steps || [],
        connections: body.connections || [],
        metadata: body.metadata || {},
      };

      await saveTemplate(template);
      return reply(200, { success: true, templateId: template.id });
    }

    return reply(405, { error: 'Method or path not supported' });

  } catch (error) {
    console.error('Automation Lambda error:', error);
    return reply(500, { error: error.message });
  }
};
