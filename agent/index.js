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
    .in('key', [
      'company_name',
      'product_name',
      'product_url',
      'product_additional_urls',
      'product_notes',
      // legacy keys — kept for backwards compat with older config rows
      'company_url',
      'product_description',
    ]);

  if (!data || data.length === 0) return {};
  const m = Object.fromEntries(data.map((d) => [d.key, d.value]));

  // Normalise: new key names take priority over legacy ones
  return {
    company_name: m.company_name || '',
    product_name: m.product_name || '',
    product_url: m.product_url || m.company_url || '',
    additional_urls: m.product_additional_urls ? JSON.parse(m.product_additional_urls) : [],
    notes: m.product_notes || m.product_description || '',
  };
}

// ─── prompts ─────────────────────────────────────────────────────────────────

function buildSystemPrompt(config) {
  const { company_name, product_name, product_url, additional_urls, notes } = config;

  let ourProduct = '\n\nOUR PRODUCT: (no product details provided — use a general competitive analysis perspective)';

  if (company_name || product_name) {
    ourProduct = '\n\nOUR PRODUCT CONTEXT:';
    if (company_name)  ourProduct += `\n- Company: ${company_name}`;
    if (product_name)  ourProduct += `\n- Product name: ${product_name}`;
    if (product_url)   ourProduct += `\n- Primary URL: ${product_url}`;
    if (additional_urls?.length) ourProduct += `\n- Additional URLs: ${additional_urls.join(', ')}`;
    if (notes)         ourProduct += `\n- Notes: ${notes}`;
  }

  return `You are a competitive intelligence analyst. Your job is to research competitors thoroughly using web search and synthesize findings into structured JSON.${ourProduct}

SOURCE CREDIBILITY — CRITICAL:
Only use sources that meet one of these criteria:
- Official company websites (any domain owned by the company being researched)
- Provided URLs passed in this request (always credible by definition)
- Recognised press: TechCrunch, Forbes, WSJ, Reuters, Bloomberg, Business Insider, CNBC, The Verge, Wired, Ars Technica, VentureBeat
- Analyst/review platforms: G2, Capterra, Gartner, Forrester, IDC, Trustpilot
- Professional networks: LinkedIn (company pages and verified profiles)
- Regulatory filings: SEC EDGAR, Companies House, or equivalent
- The company's own verified social channels (Twitter/X, YouTube, official blog)
Do NOT crawl or cite: content aggregators (Techmeme, AllTop), link farms, SEO content farms, anonymous wikis, forum roundup sites, or any source where the author and publication date cannot be clearly identified. If a source is ambiguous, skip it and note the claim as "unverified".

CITATION RULES — CRITICAL:
- Every factual claim in your output must include a source_label and source_url.
- If a claim comes from a provided URL (listed in this request), cite that exact URL.
- If a claim comes from an external source, cite the full URL and include the publication or page date where available.
- If a claim cannot be verified from a credible source, set source_label to "unverified" and source_url to null — never present unverified information as confirmed fact.
- Do not group citations at the bottom. Every individual claim carries its own citation inline.

OUTPUT FORMAT — CRITICAL:
- You must respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after the JSON.
- Do NOT wrap the JSON in \`\`\`json fences or any other formatting.
- Do NOT include any preamble, summary, or commentary — the very first character of your response must be { and the very last must be }.
- All string values must be properly escaped (no raw newlines inside strings).
- If you cannot find data for a field, use null or an empty array — never omit keys.
- Use web_search to look up real, current information. Do NOT hallucinate.`;
}

function buildRetryPrompt() {
  return `Your previous response was not valid JSON — it contained text before or after the JSON object, or was wrapped in markdown code fences.

Respond now with ONLY the raw JSON object. No explanation, no apology, no markdown. Start your response with { and end with }. Nothing else.`;
}

function buildResearchPrompt(competitorName, productConfig, competitorInfo = {}) {
  const { company_name, product_name, product_url, additional_urls: ourAdditional } = productConfig;
  const {
    product_name: compProductName,
    url: compUrl,
    additional_urls: compAdditional = [],
    notes: compNotes,
  } = competitorInfo;

  const ourLabel   = product_name || company_name || 'Us';
  const ourContext = product_name && company_name
    ? `${product_name} by ${company_name}`
    : product_name || company_name || 'our product';

  const compLabel = compProductName
    ? `${compProductName} by ${competitorName}`
    : competitorName;

  // Build crawl lists
  const ourUrls = [product_url, ...(ourAdditional || [])].filter(Boolean);
  const compUrls = [compUrl, ...compAdditional].filter(Boolean);

  let crawlSection = '';
  if (compUrls.length > 0) {
    crawlSection += `\n\nCOMPETITOR PROVIDED URLS — crawl these first, treat as source of truth:`;
    compUrls.forEach((u, i) => { crawlSection += `\n${i + 1}. ${u}`; });
    crawlSection += `\nIf any external source contradicts these URLs, the provided URLs win.`;
  }
  if (ourUrls.length > 0) {
    crawlSection += `\n\nOUR PRODUCT PROVIDED URLS — use for the "us" column in head_to_head:`;
    ourUrls.forEach((u, i) => { crawlSection += `\n${i + 1}. ${u}`; });
  }
  if (compNotes) {
    crawlSection += `\n\nADDITIONAL NOTES FROM REQUESTER: ${compNotes}`;
  }

  return `Research the competitor "${compLabel}" thoroughly.${crawlSection}

CRAWL ORDER:
1. Provided URLs above (both competitor and our product) — highest priority
2. ${competitorName} pricing page (if not already in provided URLs)
3. ${competitorName} product changelog or release notes
4. G2 and Capterra reviews for ${competitorName}
5. Google News: "${competitorName}" mentions in the last 12 months
6. LinkedIn company page for ${competitorName}
7. Reddit and Hacker News discussions about ${competitorName}
8. SEC filings if ${competitorName} appears to be a public company

CITATION REQUIREMENT: For every fact you include in the output, record the exact source URL where you found it. Use the provided URLs as citation sources where applicable. For external sources, include the page URL and date. If you cannot find a source for a claim, mark it source_label: "unverified", source_url: null.

After gathering all information, return a single JSON object with EXACTLY these top-level keys.

IMPORTANT for head_to_head: the "us" column represents ${ourContext}.
IMPORTANT for battle_card: objection handling and landmines must be specific to winning deals against ${compLabel} when selling ${ourContext}.

{
  "battle_card": {
    "positioning": {
      "core_message": "string — their single most memorable brand promise or tagline in one sentence",
      "insights": [
        {
          "headline": "string — bold 3-6 word title",
          "explanation": "string — 1-2 sentences expanding on this insight",
          "source_label": "string or null — e.g. G2, Homepage, TechCrunch",
          "source_url": "string or null — direct URL"
        }
      ]
    },
    "pricing": {
      "tiers": [
        {
          "tier": "string — tier name e.g. Free, Pro, Enterprise",
          "price": "string — e.g. $0/mo, $49/seat/mo, Custom",
          "target_customer": "string — who this tier is for",
          "notes": "string or null — key limits or inclusions"
        }
      ],
      "recent_changes": false,
      "recent_change_note": "string or null — describe the change if recent_changes is true",
      "source_label": "string or null",
      "source_url": "string or null"
    },
    "strengths": [
      {
        "title": "string — bold 3-5 word strength label",
        "explanation": "string — one sentence describing this strength",
        "deal_tip": "string — one sentence coaching tip for reps: how to use this in a competitive deal"
      }
    ],
    "weaknesses": [
      {
        "title": "string — bold 3-5 word weakness label",
        "explanation": "string — one sentence describing this weakness",
        "deal_tip": "string — one sentence coaching tip for reps: how to exploit this weakness in a deal"
      }
    ],
    "objection_handling": [
      {
        "objection": "string — a common objection when prospects prefer ${competitorName}",
        "response": "string — full talk track, 2-4 sentences, how to counter it when selling ${ourContext}"
      }
    ],
    "landmines": [
      {
        "statement": "string — the specific thing to avoid saying or doing",
        "explanation": "string — one sentence on why this is dangerous in a competitive deal"
      }
    ],
    "sources": [
      {
        "label": "string — short source name e.g. G2, Pricing Page, TechCrunch",
        "url": "string — full URL",
        "description": "string — one short phrase on what this source provided"
      }
    ]
  },
  "competitive_triggers": {
    "recent_funding":   [{ "date": "YYYY-MM-DD or null", "summary": "string", "source_label": "string or null", "source_url": "string or null" }],
    "product_launches": [{ "date": "YYYY-MM-DD or null", "summary": "string", "source_label": "string or null", "source_url": "string or null" }],
    "pricing_changes":  [{ "date": "YYYY-MM-DD or null", "summary": "string", "source_label": "string or null", "source_url": "string or null" }],
    "key_hires":        [{ "date": "YYYY-MM-DD or null", "summary": "string", "source_label": "string or null", "source_url": "string or null" }],
    "bad_press":        [{ "date": "YYYY-MM-DD or null", "summary": "string", "source_label": "string or null", "source_url": "string or null" }]
  },
  "head_to_head": {
    "summary": "string — 2-3 sentence overall comparison of ${ourContext} vs ${competitorName}",
    "feature_matrix": [
      {
        "feature": "string — feature or capability name",
        "us": "string — capability of ${ourLabel}",
        "them": "string — capability of ${competitorName}",
        "advantage": "us | them | neutral",
        "talking_point": "string — one sharp sentence a sales rep can say on a call about this specific comparison",
        "source_label": "string or null",
        "source_url": "string or null"
      }
    ]
  },
  "related_competitors": [
    {
      "name": "string",
      "website": "string — full URL",
      "reason_flagged": "closest substitute | emerging threat",
      "one_line_summary": "string"
    }
  ]
}

Rules:
- Return exactly 2 closest substitutes and 1 emerging threat in related_competitors (3 total).
- positioning.insights: return 3-4 items.
- strengths and weaknesses: return 4-6 items each.
- feature_matrix: return 6-10 rows covering the most important capability comparisons.
- sources in battle_card.sources: list every URL you actually visited, 5-10 total.
- If you cannot find real data for a field, use null or [] — never fabricate.
- Return ONLY this JSON object — nothing else.`;
}

// ─── /api/research ───────────────────────────────────────────────────────────

app.post('/api/research', async (req, res) => {
  // ── detailed intake logging ──────────────────────────────────────────────
  console.log('[/api/research] headers:', JSON.stringify(req.headers, null, 2));
  console.log('[/api/research] raw body type:', typeof req.body);
  console.log('[/api/research] body:', JSON.stringify(req.body, null, 2));

  const {
    competitor_name,
    job_id,
    competitor_product_name,
    competitor_url,
    competitor_additional_urls,
    competitor_notes,
  } = req.body ?? {};

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

  const competitorInfo = {
    product_name: competitor_product_name || null,
    url: competitor_url || null,
    additional_urls: Array.isArray(competitor_additional_urls) ? competitor_additional_urls : [],
    notes: competitor_notes || null,
  };

  // Run research asynchronously
  runResearch(competitor_name, job_id, competitorInfo).catch(async (err) => {
    console.error('Research error:', err);
    await setJobStatus(job_id, 'failed').catch(() => {});
  });
});

async function runResearch(competitorName, jobId, competitorInfo = {}) {
  console.log(`[${jobId}] Starting research for: ${competitorName}`, JSON.stringify(competitorInfo));

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
    { role: 'user', content: buildResearchPrompt(competitorName, productConfig, competitorInfo) },
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

  // ── JSON extraction helper ───────────────────────────────────────────────
  function extractJson(text) {
    // 1. Strip markdown fences if present
    let s = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    // 2. If there's leading non-JSON text, find the first { and trim to it
    const firstBrace = s.indexOf('{');
    const lastBrace  = s.lastIndexOf('}');
    if (firstBrace > 0) s = s.slice(firstBrace);
    if (lastBrace !== -1 && lastBrace < s.length - 1) s = s.slice(0, lastBrace + 1);
    return JSON.parse(s);
  }

  // ── First parse attempt ──────────────────────────────────────────────────
  let parsed;
  let parseError;
  try {
    parsed = extractJson(finalText);
  } catch (err) {
    parseError = err;
    console.error(`[${jobId}] JSON parse error (attempt 1): ${err.message}`);
    console.error(`[${jobId}] Raw Claude response (full):\n${finalText}`);
  }

  // ── Retry once with a stricter "JSON only" correction prompt ────────────
  if (!parsed) {
    console.log(`[${jobId}] Retrying with JSON-correction prompt...`);
    try {
      messages.push({ role: 'user', content: buildRetryPrompt() });

      const retryResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: buildSystemPrompt(productConfig),
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      });

      let retryText = '';
      for (const block of retryResponse.content) {
        if (block.type === 'text') retryText += block.text;
      }

      console.log(`[${jobId}] Retry response (first 300 chars): ${retryText.slice(0, 300)}`);
      parsed = extractJson(retryText);
      console.log(`[${jobId}] Retry parse succeeded.`);
    } catch (retryErr) {
      console.error(`[${jobId}] JSON parse error (attempt 2 / retry): ${retryErr.message}`);
      // Mark job failed with a human-readable error, then bail out
      await supabase
        .from('research_jobs')
        .update({ status: 'failed', error_message: `Claude returned non-JSON output after retry: ${retryErr.message}` })
        .eq('id', jobId);
      throw new Error(`Failed to parse Claude response as JSON after retry: ${retryErr.message}`);
    }
  }

  // Write to research_outputs
  // raw_sources: pull from battle_card.sources (the agent's collected source list)
  const rawSources = parsed.battle_card?.sources || null;

  const { error: writeError } = await supabase.from('research_outputs').insert({
    competitor_id: competitorId,
    job_id: jobId,
    battle_card: parsed.battle_card,
    competitive_triggers: parsed.competitive_triggers,
    head_to_head: parsed.head_to_head,
    related_competitors: parsed.related_competitors,
    raw_sources: rawSources,
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
