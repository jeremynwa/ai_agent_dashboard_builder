// lambda-v2/automation-execute/index.mjs — Automation execution engine
// Function URL with path routing: /start, /status/:jobId, /results/:jobId, /tools
// Uses Claude's tool-calling as agentic orchestrator for workflow execution
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { authenticateRequest } from './auth.mjs';
import { randomUUID } from 'crypto';
import { getAvailableTools, getClaudeToolDefinitions, getToolByName, getToolCatalog } from './tool-registry.mjs';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const secretsManager = new SecretsManagerClient({ region: process.env.MY_REGION || 'eu-north-1' });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.MY_REGION || 'eu-north-1' }));
const kms = new KMSClient({ region: process.env.MY_REGION || 'eu-north-1' });
const BUCKET = process.env.PUBLISH_BUCKET;
const SECRETS_ID = process.env.SECRETS_ID || 'app-factory/automation-secrets';
const USER_SECRETS_TABLE = process.env.USER_SECRETS_TABLE || 'UserSecrets';
const MODEL = process.env.AUTOMATION_EXECUTE_MODEL || 'claude-sonnet-4-20250514';
const JOB_PREFIX = 'automation-executions/jobs';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const reply = (code, body) => ({
  statusCode: code,
  headers: HEADERS,
  body: JSON.stringify(body),
});

// ============ SECRETS CACHE ============
let secretsCache = null;
let secretsCacheTime = 0;
const SECRETS_CACHE_TTL = 300000; // 5 minutes

async function getSecrets() {
  const now = Date.now();
  if (secretsCache && (now - secretsCacheTime) < SECRETS_CACHE_TTL) {
    return secretsCache;
  }

  try {
    const res = await secretsManager.send(new GetSecretValueCommand({ SecretId: SECRETS_ID }));
    secretsCache = JSON.parse(res.SecretString || '{}');
    secretsCacheTime = now;
    return secretsCache;
  } catch (err) {
    console.warn('Failed to load secrets:', err.message);
    return {};
  }
}

// ============ USER SECRETS (DynamoDB + KMS) ============
async function getUserSecrets(userId) {
  try {
    const result = await ddb.send(new GetCommand({
      TableName: USER_SECRETS_TABLE,
      Key: { userId },
    }));
    if (!result.Item) return {};

    const flat = {};
    for (const [integrationId, data] of Object.entries(result.Item)) {
      if (integrationId === 'userId' || integrationId === 'updatedAt') continue;
      if (typeof data !== 'object') continue;

      const secretFields = data._secretFields || [];
      for (const [key, val] of Object.entries(data)) {
        if (key === '_secretFields') continue;
        // Decrypt secret fields
        if (secretFields.includes(key) && val) {
          try {
            const decrypted = await kms.send(new DecryptCommand({
              CiphertextBlob: Buffer.from(val, 'base64'),
            }));
            flat[key] = new TextDecoder().decode(decrypted.Plaintext);
          } catch {
            flat[key] = val; // fallback if decryption fails (dev mode)
          }
        } else {
          flat[key] = val;
        }
      }
    }
    return flat;
  } catch (err) {
    console.warn('Failed to load user secrets:', err.message);
    return {};
  }
}

/**
 * Merge org-level secrets with user-level secrets.
 * User secrets override org secrets (per key).
 */
async function getMergedSecrets(userId) {
  const [orgSecrets, userSecrets] = await Promise.all([
    getSecrets(),
    getUserSecrets(userId),
  ]);
  return { ...orgSecrets, ...userSecrets };
}

// ============ JOB STORE (S3-backed) ============
async function saveJob(jobId, data) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${JOB_PREFIX}/${jobId}.json`,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}

async function loadJob(jobId) {
  try {
    const res = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: `${JOB_PREFIX}/${jobId}.json`,
    }));
    return JSON.parse(await res.Body.transformToString());
  } catch {
    return null;
  }
}

// ============ EXECUTION SYSTEM PROMPT ============
const EXECUTION_SYSTEM_PROMPT = `Tu es un moteur d'exécution d'automatisations. Tu reçois un workflow composé d'étapes connectées et tu dois les exécuter dans l'ordre en utilisant les outils disponibles.

RÈGLES:
1. Exécute chaque étape dans l'ordre défini par les connections (respecte les dépendances)
2. Pour chaque étape de type "action" ou "output", utilise l'outil approprié via tool_use
3. Pour les étapes "condition", évalue la condition et choisis la branche appropriée
4. Les étapes "trigger" sont le point de départ — elles fournissent le contexte initial
5. Passe les résultats d'une étape aux étapes suivantes quand c'est pertinent
6. Si une étape échoue, arrête l'exécution et explique l'erreur
7. À la fin, fais un résumé de ce qui a été exécuté et des résultats obtenus

FORMAT DE RÉPONSE FINAL:
Après avoir exécuté toutes les étapes, retourne un résumé structuré:
- Nombre d'étapes exécutées
- Résultat de chaque étape (succès/échec + détails)
- Fichiers générés (URLs si applicable)
- Erreurs rencontrées (le cas échéant)`;

// ============ AGENTIC EXECUTION LOOP ============
async function executeWorkflow(jobId, workflow, secrets) {
  const availableTools = getAvailableTools(secrets);
  const claudeTools = getClaudeToolDefinitions(availableTools);
  const toolMap = Object.fromEntries(availableTools.map(t => [t.name, t]));

  const stepsJson = JSON.stringify(workflow.steps, null, 2);
  const connectionsJson = JSON.stringify(workflow.connections, null, 2);
  const inputDataJson = workflow.inputData ? JSON.stringify(workflow.inputData, null, 2) : 'Aucune donnée d\'entrée fournie.';

  const messages = [{
    role: 'user',
    content: `Exécute cette automatisation étape par étape.

WORKFLOW: "${workflow.name}"
DESCRIPTION: ${workflow.description || 'N/A'}

ÉTAPES:
${stepsJson}

CONNECTIONS:
${connectionsJson}

DONNÉES D'ENTRÉE:
${inputDataJson}

Commence par le trigger, puis exécute chaque étape en suivant les connections. Utilise les outils disponibles pour chaque action.`,
  }];

  const executionLog = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let stepIndex = 0;

  let response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    temperature: 0,
    system: EXECUTION_SYSTEM_PROMPT,
    tools: claudeTools,
    messages,
  });

  totalInputTokens += response.usage?.input_tokens || 0;
  totalOutputTokens += response.usage?.output_tokens || 0;

  // Agentic loop: Claude calls tools, we execute, return results
  while (response.stop_reason === 'tool_use') {
    const toolCalls = response.content.filter(c => c.type === 'tool_use');
    const toolResults = [];

    for (const call of toolCalls) {
      stepIndex++;
      const tool = toolMap[call.name];
      const logEntry = {
        step: stepIndex,
        tool: call.name,
        input: call.input,
        timestamp: new Date().toISOString(),
      };

      if (!tool) {
        logEntry.status = 'error';
        logEntry.error = `Tool not found: ${call.name}`;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify({ error: `Tool "${call.name}" not available` }),
          is_error: true,
        });
      } else {
        try {
          console.log(JSON.stringify({
            event: 'tool_execute',
            jobId,
            tool: call.name,
            step: stepIndex,
          }));

          const result = await tool.execute(call.input, secrets);
          logEntry.status = 'success';
          logEntry.result = result;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          logEntry.status = 'error';
          logEntry.error = err.message;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: JSON.stringify({ error: err.message }),
            is_error: true,
          });
        }
      }

      executionLog.push(logEntry);

      // Update job progress
      await saveJob(jobId, {
        status: 'running',
        currentStep: call.name,
        stepsExecuted: stepIndex,
        totalSteps: workflow.steps.length,
        progress: Math.min(stepIndex / workflow.steps.length, 0.95),
        log: executionLog,
      });
    }

    // Continue conversation with tool results
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      temperature: 0,
      system: EXECUTION_SYSTEM_PROMPT,
      tools: claudeTools,
      messages,
    });

    totalInputTokens += response.usage?.input_tokens || 0;
    totalOutputTokens += response.usage?.output_tokens || 0;
  }

  // Extract final summary from Claude's response
  const summary = response.content
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n');

  // Compute cost estimate
  const cost = ((totalInputTokens / 1e6) * 3.0) + ((totalOutputTokens / 1e6) * 15.0);

  return {
    summary,
    log: executionLog,
    tokens: { input: totalInputTokens, output: totalOutputTokens },
    cost: Math.round(cost * 100) / 100,
    stepsExecuted: stepIndex,
  };
}

// ============ HANDLER ============
export const handler = async (event) => {
  // CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') return reply(200, {});

  const { user, error: authError, statusCode } = await authenticateRequest(event);
  if (authError) return reply(statusCode, { error: authError });

  const method = event.requestContext?.http?.method;
  const path = event.rawPath || event.requestContext?.http?.path || '';

  try {
    // GET /tools — list available tools (filtered by user's configured secrets)
    if (method === 'GET' && path.endsWith('/tools')) {
      const secrets = await getMergedSecrets(user.sub);
      const availableTools = getAvailableTools(secrets);
      return reply(200, {
        tools: availableTools.map(t => ({
          name: t.name,
          category: t.category,
          displayName: t.displayName,
          icon: t.icon,
          description: t.description,
        })),
      });
    }

    // GET /catalog — full tool catalog (for design-time)
    if (method === 'GET' && path.endsWith('/catalog')) {
      return reply(200, { tools: getToolCatalog() });
    }

    // POST /start — start automation execution
    if (method === 'POST' && path.endsWith('/start')) {
      const body = JSON.parse(event.body || '{}');
      const { workflow } = body;

      if (!workflow?.steps?.length) {
        return reply(400, { error: 'Workflow with steps is required' });
      }

      const jobId = randomUUID();
      const userId = user.sub;

      // Save initial job
      await saveJob(jobId, {
        status: 'starting',
        progress: 0,
        stepsExecuted: 0,
        totalSteps: workflow.steps.length,
        userId,
        workflowName: workflow.name,
        createdAt: new Date().toISOString(),
      });

      // Load org + user secrets (user overrides org)
      const secrets = await getMergedSecrets(user.sub);

      console.log(JSON.stringify({
        event: 'execution_start',
        jobId,
        userId,
        workflowName: workflow.name,
        stepCount: workflow.steps.length,
      }));

      const result = await executeWorkflow(jobId, workflow, secrets);

      // Save final results
      await saveJob(jobId, {
        status: 'completed',
        progress: 1,
        stepsExecuted: result.stepsExecuted,
        totalSteps: workflow.steps.length,
        summary: result.summary,
        log: result.log,
        tokens: result.tokens,
        cost: result.cost,
        userId,
        workflowName: workflow.name,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      console.log(JSON.stringify({
        event: 'execution_complete',
        jobId,
        stepsExecuted: result.stepsExecuted,
        cost: result.cost,
        tokens: result.tokens,
      }));

      return reply(200, { jobId, status: 'completed', ...result });
    }

    // GET /status/:jobId
    if (method === 'GET' && path.includes('/status/')) {
      const jobId = path.split('/status/')[1]?.split('?')[0];
      if (!jobId) return reply(400, { error: 'Missing jobId' });

      const job = await loadJob(jobId);
      if (!job) return reply(404, { error: 'Job not found' });

      return reply(200, {
        status: job.status,
        progress: job.progress || 0,
        currentStep: job.currentStep || null,
        stepsExecuted: job.stepsExecuted || 0,
        totalSteps: job.totalSteps || 0,
        error: job.error || null,
      });
    }

    // GET /results/:jobId
    if (method === 'GET' && path.includes('/results/')) {
      const jobId = path.split('/results/')[1]?.split('?')[0];
      if (!jobId) return reply(400, { error: 'Missing jobId' });

      const job = await loadJob(jobId);
      if (!job) return reply(404, { error: 'Job not found' });
      if (job.status !== 'completed' && job.status !== 'error') {
        return reply(400, { error: 'Job not finished yet' });
      }

      return reply(200, {
        status: job.status,
        summary: job.summary,
        log: job.log,
        tokens: job.tokens,
        cost: job.cost,
        stepsExecuted: job.stepsExecuted,
        totalSteps: job.totalSteps,
        workflowName: job.workflowName,
        completedAt: job.completedAt,
      });
    }

    return reply(404, { error: 'Not found' });

  } catch (error) {
    console.error('AutomationExecute Lambda error:', error);
    return reply(500, { error: error.message });
  }
};
