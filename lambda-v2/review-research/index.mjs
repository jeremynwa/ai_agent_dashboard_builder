// review-research Lambda — Google Maps review analysis with Claude
// Function URL with path routing: /start, /status/:jobId, /results/:jobId, /estimate
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { authenticateRequest } from './auth.mjs';
import { randomUUID } from 'crypto';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const s3 = new S3Client({ region: process.env.MY_REGION || 'eu-north-1' });
const BUCKET = process.env.BUCKET_NAME || 'app-factory-published-apps';
const OUTSCRAPER_API_KEY = process.env.OUTSCRAPER_API_KEY || '';
const MODEL = process.env.REVIEW_RESEARCH_MODEL || 'claude-sonnet-4-20250514';

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

// ============ JOB STORE (S3-backed) ============
// Jobs are stored in S3 as JSON: review-research/jobs/<jobId>.json
const JOB_PREFIX = 'review-research/jobs';

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

// ============ PROMPT BUILDER ============
function buildAnalysisPrompt(config) {
  const criteriaBlock = config.criteria
    .map((c, i) => `${i + 1}. **${c.id}** - ${c.question}`)
    .join('\n');

  const scaleBlock = {
    '1-100': 'Score de 10 a 100, par multiples de 10. 100=excellent, 50=acceptable, 10=tres mauvais.',
    '1-10': 'Score de 1 a 10. 10=excellent, 5=moyen, 1=tres mauvais.',
    '1-5': 'Score de 1 a 5. 5=excellent, 3=moyen, 1=tres mauvais.',
    'binary': '1 si le critere est mentionne positivement, 0 sinon.',
  }[config.scale] || 'Score de 1 a 100.';

  const jsonFields = config.criteria
    .map(c => `"${c.id}_score": <score>, "${c.id}_keyword": "<mot-cle>"`)
    .join(',\n  ');

  return `Tu es un expert en analyse d'avis clients dans le secteur ${config.industry}.

Pour chaque avis client, evalue les criteres suivants :

${criteriaBlock}

## Echelle de notation
- ${scaleBlock}
- "N/A" si le critere n'est pas mentionne dans l'avis.

## Mot-cle associe
- 1 a 3 mots identifiant le produit/service concerne.
- "Personnel" si une personne est mentionnee.
- "N/A" si non applicable.

## Regles strictes
- Ne JAMAIS extrapoler ou inventer un score.
- Evaluer UNIQUEMENT sur le texte de l'avis, PAS sur la note numerique.
- Repondre UNIQUEMENT en JSON valide, sans texte additionnel.

## Format de sortie
{
  ${jsonFields}
}`;
}

// ============ OUTSCRAPER SCRAPING ============
async function scrapeGoogleMaps(query, location, maxReviews) {
  if (!OUTSCRAPER_API_KEY) {
    throw new Error('OUTSCRAPER_API_KEY not configured');
  }

  // Outscraper Reviews API
  const searchQuery = `${query}, ${location}`;
  const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(searchQuery)}&reviewsLimit=${maxReviews}&limit=1&async=false&language=fr`;

  const res = await fetch(url, {
    headers: { 'X-API-KEY': OUTSCRAPER_API_KEY },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Outscraper API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  // Outscraper returns { data: [[{reviews_data: [...]}]] }
  const place = data?.data?.[0]?.[0];
  if (!place?.reviews_data) return [];

  return place.reviews_data.map(r => ({
    text: r.review_text || '',
    author: r.author_title || 'Anonymous',
    rating: r.review_rating || null,
    date: r.review_datetime_utc || null,
    place: place.name || query,
    address: place.address || location,
  }));
}

// ============ ANALYZE SINGLE REVIEW ============
async function analyzeReview(systemPrompt, review, config) {
  const userMessage = `Avis a analyser :
- Etablissement : ${review.place}
- Adresse : ${review.address || 'N/A'}
- Auteur : ${review.author || 'Anonyme'}
- Note : ${review.rating || 'N/A'}/5
- Date : ${review.date || 'N/A'}
- Texte : "${review.text}"`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0]?.text || '';
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'No JSON in response', raw: text };

    const scores = JSON.parse(jsonMatch[0]);
    return {
      ...scores,
      _meta: {
        author: review.author,
        place: review.place,
        rating: review.rating,
        date: review.date,
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        cacheRead: response.usage?.cache_read_input_tokens || 0,
        cacheCreation: response.usage?.cache_creation_input_tokens || 0,
      },
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ============ ORCHESTRATOR — ANALYZE ALL REVIEWS ============
async function runAnalysis(jobId, config, reviews) {
  const systemPrompt = buildAnalysisPrompt(config);
  const total = reviews.length;
  const results = [];
  let analyzed = 0;
  let errors = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Phase 1: First review alone (cache warm-up)
  if (reviews.length > 0) {
    const first = await analyzeReview(systemPrompt, reviews[0], config);
    results.push(first);
    analyzed = 1;
    if (first.error) errors++;
    totalInputTokens += first._meta?.inputTokens || 0;
    totalOutputTokens += first._meta?.outputTokens || 0;

    await saveJob(jobId, {
      status: 'running',
      progress: analyzed / total,
      analyzed,
      total,
      errors,
      eta: estimateEta(total - analyzed, 0.5), // ~0.5s per review with cache
    });

    // Wait for cache propagation
    await new Promise(r => setTimeout(r, 3000));
  }

  // Phase 2: Remaining reviews in batches
  const BATCH_SIZE = 10;
  const remaining = reviews.slice(1);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(review => analyzeReview(systemPrompt, review, config))
    );

    for (const r of batchResults) {
      results.push(r);
      analyzed++;
      if (r.error) errors++;
      totalInputTokens += r._meta?.inputTokens || 0;
      totalOutputTokens += r._meta?.outputTokens || 0;
    }

    // Update progress
    await saveJob(jobId, {
      status: 'running',
      progress: analyzed / total,
      analyzed,
      total,
      errors,
      eta: estimateEta(total - analyzed, 0.5),
    });
  }

  // Compute average scores
  const avgScores = computeAverageScores(results, config);
  const groupSummary = computeScoresByGroup(results, config);

  // Compute cost
  const pricing = { input: 3.0, output: 15.0, cacheWrite: 3.75, cacheRead: 0.30 };
  const analysisCost = (totalInputTokens / 1e6) * pricing.input + (totalOutputTokens / 1e6) * pricing.output;

  // Generate Excel (HTML-based .xls)
  const excelXml = generateExcelHtml(results, config, groupSummary);
  const excelKey = `review-research/results/${jobId}.xls`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: excelKey,
    Body: excelXml,
    ContentType: 'application/vnd.ms-excel',
  }));
  const region = process.env.MY_REGION || 'eu-north-1';
  const excelUrl = `https://${BUCKET}.s3.${region}.amazonaws.com/${excelKey}`;

  // Save final results
  const finalData = {
    status: 'completed',
    progress: 1,
    analyzed,
    total,
    errors,
    results,
    excelUrl,
    summary: {
      totalReviews: total,
      analyzedReviews: analyzed - errors,
      skipped: errors,
      avgScores,
      groupSummary,
      cost: {
        scraping: config.dataSource === 'scrape' ? (total / 1000) * 1.50 : 0,
        analysis: Math.round(analysisCost * 100) / 100,
        total: Math.round((analysisCost + (config.dataSource === 'scrape' ? (total / 1000) * 1.50 : 0)) * 100) / 100,
      },
    },
  };

  // Save results as downloadable JSON
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `review-research/results/${jobId}.json`,
    Body: JSON.stringify(finalData.results, null, 2),
    ContentType: 'application/json',
  }));

  await saveJob(jobId, finalData);
  return finalData;
}

function computeAverageScores(results, config) {
  const validResults = results.filter(r => !r.error);
  if (validResults.length === 0) return {};

  const scores = {};
  for (const c of config.criteria) {
    const key = `${c.id}_score`;
    const vals = validResults
      .map(r => r[key])
      .filter(v => v !== 'N/A' && v !== undefined && v !== null)
      .map(Number)
      .filter(n => !isNaN(n));
    if (vals.length > 0) {
      scores[c.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }
  return scores;
}

function computeScoresByGroup(results, config) {
  const validResults = results.filter(r => !r.error);
  const groups = {};
  for (const r of validResults) {
    const key = r._meta?.place || r._query || 'Unknown';
    const type = r._type || 'brand';
    if (!groups[key]) groups[key] = { type, results: [] };
    groups[key].results.push(r);
  }

  const summary = {};
  for (const [name, group] of Object.entries(groups)) {
    summary[name] = { type: group.type, scores: {}, count: group.results.length };
    for (const c of config.criteria) {
      const scoreKey = `${c.id}_score`;
      const vals = group.results
        .map(r => r[scoreKey])
        .filter(v => v !== 'N/A' && v !== undefined && v !== null)
        .map(Number)
        .filter(n => !isNaN(n));
      if (vals.length > 0) {
        summary[name].scores[c.id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
  }
  return summary;
}

// ============ EXCEL GENERATOR (HTML-based .xls) ============
function generateExcelHtml(results, config, groupSummary) {
  const validResults = results.filter(r => !r.error);
  const criteriaHeaders = config.criteria.map(c => c.id.replace(/_/g, ' '));
  const criteriaIds = config.criteria.map(c => c.id);

  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const buildSheet = (name, rows) => {
    let html = `<Worksheet ss:Name="${esc(name)}"><Table>\n`;
    // Header row
    html += '<Row>';
    html += '<Cell><Data ss:Type="String">Place</Data></Cell>';
    html += '<Cell><Data ss:Type="String">Author</Data></Cell>';
    html += '<Cell><Data ss:Type="String">Rating</Data></Cell>';
    html += '<Cell><Data ss:Type="String">Date</Data></Cell>';
    html += '<Cell><Data ss:Type="String">Type</Data></Cell>';
    for (const h of criteriaHeaders) html += `<Cell><Data ss:Type="String">${esc(h)} (score)</Data></Cell>`;
    for (const h of criteriaHeaders) html += `<Cell><Data ss:Type="String">${esc(h)} (keyword)</Data></Cell>`;
    html += '</Row>\n';
    // Data rows
    for (const r of rows) {
      html += '<Row>';
      html += `<Cell><Data ss:Type="String">${esc(r._meta?.place)}</Data></Cell>`;
      html += `<Cell><Data ss:Type="String">${esc(r._meta?.author)}</Data></Cell>`;
      html += `<Cell><Data ss:Type="Number">${r._meta?.rating || 0}</Data></Cell>`;
      html += `<Cell><Data ss:Type="String">${esc(r._meta?.date)}</Data></Cell>`;
      html += `<Cell><Data ss:Type="String">${esc(r._type || 'brand')}</Data></Cell>`;
      for (const id of criteriaIds) html += `<Cell><Data ss:Type="${r[`${id}_score`] === 'N/A' ? 'String' : 'Number'}">${r[`${id}_score`] ?? 'N/A'}</Data></Cell>`;
      for (const id of criteriaIds) html += `<Cell><Data ss:Type="String">${esc(r[`${id}_keyword`] || 'N/A')}</Data></Cell>`;
      html += '</Row>\n';
    }
    html += '</Table></Worksheet>\n';
    return html;
  };

  const buildSummarySheet = () => {
    let html = '<Worksheet ss:Name="Summary"><Table>\n';
    html += '<Row><Cell><Data ss:Type="String">Name</Data></Cell><Cell><Data ss:Type="String">Type</Data></Cell><Cell><Data ss:Type="String">Reviews</Data></Cell>';
    for (const h of criteriaHeaders) html += `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`;
    html += '</Row>\n';
    for (const [name, data] of Object.entries(groupSummary)) {
      html += '<Row>';
      html += `<Cell><Data ss:Type="String">${esc(name)}</Data></Cell>`;
      html += `<Cell><Data ss:Type="String">${esc(data.type)}</Data></Cell>`;
      html += `<Cell><Data ss:Type="Number">${data.count}</Data></Cell>`;
      for (const id of criteriaIds) html += `<Cell><Data ss:Type="${data.scores[id] != null ? 'Number' : 'String'}">${data.scores[id] ?? 'N/A'}</Data></Cell>`;
      html += '</Row>\n';
    }
    html += '</Table></Worksheet>\n';
    return html;
  };

  const brandRows = validResults.filter(r => (r._type || 'brand') === 'brand');
  const compRows = validResults.filter(r => r._type === 'competitor');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += buildSheet('Brands', brandRows);
  if (compRows.length > 0) xml += buildSheet('Competitors', compRows);
  xml += buildSummarySheet();
  xml += '</Workbook>';

  return xml;
}

function estimateEta(remaining, secPerReview) {
  const secs = Math.ceil(remaining * secPerReview);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ============ COST ESTIMATION ============
function estimateCost(config) {
  const n = ((config.brands?.length || 1) + (config.competitors?.filter(c => c.trim()).length || 0)) * (config.maxReviewsPerBrand || 500);
  const scrapingCost = config.dataSource === 'scrape' ? (n / 1000) * 1.50 : 0;

  const avgInputTokens = 1800;
  const avgOutputTokens = 600;
  const cachedTokens = 1661;
  const dynamicTokens = avgInputTokens - cachedTokens;

  const firstReviewCost = (avgInputTokens * 3.75 + avgOutputTokens * 15) / 1_000_000;
  const cachedReviewCost = ((cachedTokens * 0.30 + dynamicTokens * 3.0) + avgOutputTokens * 15) / 1_000_000;
  const missReviewCost = firstReviewCost;

  const subsequent = Math.max(n - 1, 0);
  const hits = subsequent * 0.98;
  const misses = subsequent * 0.02;
  const analysisCost = firstReviewCost + (hits * cachedReviewCost) + (misses * missReviewCost);

  return {
    scraping: Math.round(scrapingCost * 100) / 100,
    analysis: Math.round(analysisCost * 100) / 100,
    total: Math.round((scrapingCost + analysisCost) * 100) / 100,
    reviewCount: n,
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
    // POST /estimate
    if (method === 'POST' && path.endsWith('/estimate')) {
      const body = JSON.parse(event.body || '{}');
      const cost = estimateCost(body.config || body);
      return reply(200, cost);
    }

    // POST /start
    if (method === 'POST' && path.endsWith('/start')) {
      const body = JSON.parse(event.body || '{}');
      const config = body.config || body;

      if (!config.brands?.length || !config.criteria?.length) {
        return reply(400, { error: 'Missing brands or criteria' });
      }

      const jobId = randomUUID();
      const userId = user.sub;

      // Save initial job state
      await saveJob(jobId, {
        status: 'starting',
        progress: 0,
        analyzed: 0,
        total: 0,
        errors: 0,
        userId,
        config,
        createdAt: new Date().toISOString(),
      });

      // Start async processing
      // Note: Lambda has 300s timeout. For large jobs, consider Step Functions.
      // For now, we run synchronously and poll from frontend.
      const brands = config.brands.filter(b => b.trim());
      const competitors = (config.competitors || []).filter(c => c.trim());
      const allReviews = [];

      if (config.dataSource === 'scrape') {
        // Scrape reviews for each brand
        for (const brand of brands) {
          try {
            const reviews = await scrapeGoogleMaps(brand, config.location, config.maxReviewsPerBrand);
            allReviews.push(...reviews.map(r => ({ ...r, _type: 'brand', _query: brand })));
          } catch (err) {
            console.error(`Scraping failed for ${brand}:`, err.message);
          }
        }
        // Scrape reviews for each competitor
        for (const comp of competitors) {
          try {
            const reviews = await scrapeGoogleMaps(comp, config.location, config.maxReviewsPerBrand);
            allReviews.push(...reviews.map(r => ({ ...r, _type: 'competitor', _query: comp })));
          } catch (err) {
            console.error(`Scraping failed for competitor ${comp}:`, err.message);
          }
        }
      } else if (config.dataSource === 'upload' && config.reviews) {
        // Reviews already parsed and sent in the payload
        allReviews.push(...config.reviews.map(r => ({ ...r, _type: r._type || 'brand' })));
      }

      if (allReviews.length === 0) {
        await saveJob(jobId, { status: 'error', error: 'No reviews found or scraped' });
        return reply(200, { jobId, status: 'error', error: 'No reviews found' });
      }

      // Run analysis (this blocks until done — frontend polls /status)
      await runAnalysis(jobId, config, allReviews);

      return reply(200, { jobId, status: 'started', estimatedCost: estimateCost(config) });
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
        analyzed: job.analyzed || 0,
        total: job.total || 0,
        errors: job.errors || 0,
        eta: job.eta || null,
        error: job.error || null,
      });
    }

    // GET /results/:jobId
    if (method === 'GET' && path.includes('/results/')) {
      const jobId = path.split('/results/')[1]?.split('?')[0];
      if (!jobId) return reply(400, { error: 'Missing jobId' });

      const job = await loadJob(jobId);
      if (!job) return reply(404, { error: 'Job not found' });
      if (job.status !== 'completed') return reply(400, { error: 'Job not completed' });

      const region = process.env.MY_REGION || 'eu-north-1';
      return reply(200, {
        summary: job.summary,
        excelUrl: job.excelUrl || `https://${BUCKET}.s3.${region}.amazonaws.com/review-research/results/${jobId}.xls`,
        jsonUrl: `https://${BUCKET}.s3.${region}.amazonaws.com/review-research/results/${jobId}.json`,
      });
    }

    return reply(404, { error: 'Not found' });

  } catch (error) {
    console.error('ReviewResearch Lambda error:', error);
    return reply(500, { error: error.message });
  }
};
