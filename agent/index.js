require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

// Parse JSON bodies. Also accept requests where Content-Type is missing or
// set to text/plain (common from n8n HTTP Request nodes).
app.use(express.json({ type: ['application/json', 'text/plain', '*/*'] }));

// Log every incoming request so we can see what arrives before any handler runs
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} | content-type: ${req.headers['content-type'] || 'none'}`);
  next();
});

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ─── helpers ────────────────────────────────────────────────────────────────

async function setJobStatus(jobId, status) {
  const update = { status };
  if (status === 'complete') update.completed_at = new Date().toISOString();
  await supabase.from('research_jobs').update(update).eq('id', jobId);
}

/**
 * Fetch all four product config keys from Supabase.
 * Returns an object: { company_name, company_url, product_name, product_description }
 */
async function getProductConfig() {
  const { data } = await supabase
    .from('config')
    .select('key, value')
    .in('key', ['company_name', 'company_url', 'product_name', 'product_description']);

  if (!data || data.length === 0) return {};
  return Object.fromEntries(data.map((d) => [d.key, d.value]));
}

// ─── prompts ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(config) {
  const { company_name, company_url, product_name, product_description } = config;

  let ourProduct = '\n\nOUR PRODUCT: (no product details provided — use a general competitive analysis perspective)';

  if (company_name || product_name || product_description) {
    ourProduct = '\n\nOUR PRODUCT CONTEXT:';
    if (company_name) ourProduct += `\n- Company: ${company_name}`;
    if (company_url)  ourProduct += `\n- Website: ${company_url}`;
    if (product_name) ourProduct += `\n- Product name: ${product_name}`;
    if (product_description) ourProduct += `\n- Description: ${product_description}`;
  }

  return `You are a competitive intelligence analyst. Your job is to research competitors thoroughly using web search and synthesize findings into structured JSON.${ourProduct}

IMPORTANT RULES:
- Return ONLY valid JSON. No markdown, no preamble, no explanations outside the JSON.
- All string values must be properly escaped.
- If you cannot find data for a field, use null or an empty array — never omit keys.
- Use web_search to look up real, current information. Do NOT hallucinate.`;
}

function buildResearchPrompt(competitorName, config) {
  const { company_name, product_name } = config;

  // Use product name if available, fall back to company name, then generic "Us"
  const ourLabel = product_name || company_name || 'Us';
  const ourContext = product_name && company_name
    ? `${product_name} by ${company_name}`
    : product_name || company_name || 'our product';

  return `Research the competitor "${competitorName}" thoroughly. Search for:
1. Their homepage and about page
2. Pricing page
3. Recent product changelog or release notes
4. G2 and Capterra reviews
5. Google News mentions (last 12 months)
6. LinkedIn company page
7. Reddit and Hacker News discussions
8. SEC filings (if they appear to be a public company)

After gathering all information, return a single JSON object with EXACTLY these four top-level keys.

IMPORTANT for head_to_head: the "us" column represents ${ourContext}. Make comparisons specific to our actual product capabilities — do not be generic.
IMPORTANT for battle_card: objection handling and landmines should be specific to winning deals against ${competitorName} when selling ${ourContext}.

{
  "battle_card": {
    "positioning": "string — how ${competitorName} positions itself in the market",
    "pricing": "string — pricing model, tiers, and approximate costs",
    "strengths": ["array", "of", "strings"],
    "weaknesses": ["array", "of", "strings"],
    "objection_handling": [
      { "objection": "string — a common objection when prospects prefer ${competitorName}", "response": "string — how to counter it when selling ${ourContext}" }
    ],
    "landmines": ["things to watch out for or avoid saying when competing against ${competitorName}"]
  },
  "competitive_triggers": {
    "recent_funding": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "product_launches": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "pricing_changes": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "key_hires": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "bad_press": [{ "date": "YYYY-MM-DD or null", "summary": "string" }]
  },
  "head_to_head": {
    "summary": "string — 2-3 sentence overall comparison of ${ourContext} vs ${competitorName}",
    "feature_matrix": [
      {
        "feature": "string",
        "us": "string — capability of ${ourLabel}",
        "them": "string — capability of ${competitorName}",
        "advantage": "us | them | neutral"
      }
    ]
  },
  "related_competitors": [
    {
      "name": "string",
      "website": "string — full URL",
      "reason_flagged": "closest substitute | closest substitute | emerging threat",
      "one_line_summary": "string"
    }
  ]
}

Return exactly 2 closest substitutes and 1 emerging threat in related_competitors (3 total).
Return ONLY this JSON object — nothing else.`;
}

// ─── /api/research ───────────────────────────────────────────────────────────

app.post('/api/research', async (req, res) => {
  // ── detailed intake logging ──────────────────────────────────────────────
  console.log('[/api/research] headers:', JSON.stringify(req.headers, null, 2));
  console.log('[/api/research] raw body type:', typeof req.body);
  console.log('[/api/research] body:', JSON.stringify(req.body, null, 2));

  const { competitor_name, job_id } = req.body ?? {};

  if (!competitor_name) {
    const msg = 'Missing required field: competitor_name';
    console.error('[/api/research] 400 –', msg, '| body was:', JSON.stringify(req.body));
    return res.status(400).json({ error: msg, received: req.body });
  }
  if (!job_id) {
    const msg = 'Missing required field: job_id';
    console.error('[/api/research] 400 –', msg, '| body was:', JSON.stringify(req.body));
    return res.status(400).json({ error: msg, received: req.body });
  }

  console.log(`[/api/research] accepted — competitor_name="${competitor_name}" job_id="${job_id}"`);

  // Respond immediately so n8n / caller doesn't time out
  res.json({ status: 'accepted', job_id });

  // Run research asynchronously
  runResearch(competitor_name, job_id).catch(async (err) => {
    console.error('Research error:', err);
    await setJobStatus(job_id, 'failed').catch(() => {});
  });
});

async function runResearch(competitorName, jobId) {
  console.log(`[${jobId}] Starting research for: ${competitorName}`);

  // Mark as running
  await setJobStatus(jobId, 'running');

  // Look up competitor_id from job
  const { data: job } = await supabase
    .from('research_jobs')
    .select('competitor_id')
    .eq('id', jobId)
    .single();

  if (!job) throw new Error('Job not found: ' + jobId);
  const competitorId = job.competitor_id;

  // Fetch all product config values
  const productConfig = await getProductConfig();
  console.log(`[${jobId}] Product config:`, JSON.stringify(productConfig));

  // Build initial messages
  const messages = [
    { role: 'user', content: buildResearchPrompt(competitorName, productConfig) },
  ];

  console.log(`[${jobId}] Calling Claude...`);
  let finalText = '';

  // Agentic loop — Claude may call web_search multiple times
  let continueLoop = true;
  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: buildSystemPrompt(productConfig),
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });

    // Collect assistant message content
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
      }
      continueLoop = false;
    } else if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        console.log(`[${jobId}] Tool call: ${block.name}(${JSON.stringify(block.input).slice(0, 120)})`);
        await delay(1500); // rate-limit courtesy delay
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Search executed.',
        });
      }
      messages.push({ role: 'user', content: toolResults });
    } else {
      // max_tokens or other stop — extract partial text
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
      }
      continueLoop = false;
    }
  }

  console.log(`[${jobId}] Claude finished. Parsing output...`);

  // Parse JSON — strip accidental markdown fences if present
  let parsed;
  try {
    const clean = finalText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error(`[${jobId}] JSON parse error. Raw response:\n${finalText.slice(0, 500)}`);
    throw new Error('Failed to parse Claude response as JSON: ' + err.message);
  }

  // Write to research_outputs
  const { error: writeError } = await supabase.from('research_outputs').insert({
    competitor_id: competitorId,
    job_id: jobId,
    battle_card: parsed.battle_card,
    competitive_triggers: parsed.competitive_triggers,
    head_to_head: parsed.head_to_head,
    related_competitors: parsed.related_competitors,
    raw_sources: null,
    version: 1,
  });

  if (writeError) {
    console.error(`[${jobId}] Supabase write error:`, writeError);
    throw writeError;
  }

  await setJobStatus(jobId, 'complete');
  console.log(`[${jobId}] Research complete.`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── /api/config ─────────────────────────────────────────────────────────────

// Legacy endpoint kept for backwards compat — new config is written directly from frontend
app.get('/api/config/product-description', async (req, res) => {
  const config = await getProductConfig();
  res.json({ product_description: config.product_description || null });
});

app.post('/api/config/product-description', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });

  const { error } = await supabase
    .from('config')
    .upsert({ key: 'product_description', value: description }, { onConflict: 'key' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ─── health ──────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Agent listening on port ${PORT}`));
