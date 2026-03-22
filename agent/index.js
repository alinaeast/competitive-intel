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

// competitorName and competitorInfo are now passed in so the system prompt can
// open with an explicit RESEARCH TARGET block naming the exact product to research.
function buildSystemPrompt(config, competitorName = '', competitorInfo = {}) {
  const { company_name, product_name, product_url, additional_urls, notes } = config;
  const compProductName = competitorInfo.product_name || null;
  const compUrl         = competitorInfo.url          || null;
  const compLabel       = compProductName
    ? `${compProductName} (by ${competitorName})`
    : competitorName;

  // ── RESEARCH TARGET — named at the top so it's the first thing Claude sees ──
  let researchTarget = '';
  if (competitorName) {
    researchTarget += `RESEARCH TARGET — READ THIS BEFORE ANYTHING ELSE:\n`;
    if (compProductName) {
      researchTarget += `  Product being researched: ${compProductName}\n`;
      researchTarget += `  Made by: ${competitorName}\n`;
    } else {
      researchTarget += `  Product being researched: ${competitorName}\n`;
      researchTarget += `  Note: no specific product name was provided — treat "${competitorName}" as the product name and research it at the product level, not the company level.\n`;
    }
    if (compUrl) researchTarget += `  Primary product URL: ${compUrl}\n`;
    if (competitorInfo.additional_urls?.length) {
      researchTarget += `  Additional product URLs: ${competitorInfo.additional_urls.join(', ')}\n`;
    }
    researchTarget += `\n  Every section of your output must be about ${compLabel} specifically — not about ${competitorName} the company broadly, not their other products, not their platform.\n\n`;
  }

  // ── OUR PRODUCT context ──────────────────────────────────────────────────
  let ourProduct = '\n\nOUR PRODUCT: (no product details provided — use a general competitive analysis perspective)';

  if (company_name || product_name) {
    ourProduct = '\n\nOUR PRODUCT CONTEXT (for "us" columns and comparisons):';
    if (company_name)  ourProduct += `\n- Company: ${company_name}`;
    if (product_name)  ourProduct += `\n- Product name: ${product_name}`;
    if (product_url)   ourProduct += `\n- Primary URL: ${product_url}`;
    if (additional_urls?.length) ourProduct += `\n- Additional URLs: ${additional_urls.join(', ')}`;
    if (notes)         ourProduct += `\n- Notes: ${notes}`;
  }

  return `${researchTarget}You are a competitive intelligence researcher. Your job is to research a specific product — not the company that makes it.

Every output you produce must answer this question: what is true about this specific product?

Before writing any section, ask yourself: "Is this about the product I was asked to research, or is it about the company?" If it is about the company, do not include it unless it meets one of the narrow exceptions below.

You must research and write about:
- What this specific product does
- Who this specific product is built for
- How this specific product is priced
- What this specific product's features are
- How this specific product is positioned and marketed
- What customers say about this specific product
- What is changing about this specific product

You must NOT write about:
- The company's other products
- The company's overall platform or suite
- Company-wide strategy or vision unless it explicitly names this product
- Features that belong to other products in the company's lineup
- The company's overall target market if it is broader than this product's target market

Narrow exceptions — company-level information is only acceptable when:
- Support quality affects users of this specific product and is shared company-wide
- Pricing of this product is bundled inside a broader company plan — explain only what tier includes this product and at what cost
- The company is public — reference annual revenue, stock ticker, or earnings commentary only if it explicitly mentions this product or its category. Never mention fundraising rounds for public companies. For private companies, funding is acceptable only if it signals investment in or risk to this specific product.
- A leadership or org change directly affects this product's team
- Press coverage is specifically about this product

If you are unsure whether something belongs — leave it out.${ourProduct}

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

  const ourLabel   = product_name || company_name || 'Our Product';
  const ourContext = product_name && company_name
    ? `${product_name} by ${company_name}`
    : product_name || company_name || 'our product';

  const compLabel = compProductName
    ? `${compProductName} by ${competitorName}`
    : competitorName;

  // Build prioritised crawl lists
  const ourUrls  = [product_url, ...(ourAdditional || [])].filter(Boolean);
  const compUrls = [compUrl, ...compAdditional].filter(Boolean);

  let crawlSection = '';
  if (compUrls.length > 0) {
    crawlSection += `\n\nCOMPETITOR PROVIDED URLS — crawl first, treat as source of truth:`;
    compUrls.forEach((u, i) => { crawlSection += `\n${i + 1}. ${u}`; });
    crawlSection += `\nIf any external source contradicts these URLs, the provided URLs win.`;
  }
  if (ourUrls.length > 0) {
    crawlSection += `\n\nOUR PRODUCT PROVIDED URLS — use for the "us" column throughout:`;
    ourUrls.forEach((u, i) => { crawlSection += `\n${i + 1}. ${u}`; });
  }
  if (compNotes) {
    crawlSection += `\n\nADDITIONAL CONTEXT FROM REQUESTER: ${compNotes}`;
  }

  return `Research the competitor "${compLabel}" thoroughly and produce a complete competitive intelligence report.${crawlSection}

CRAWL ORDER — search for the specific product "${compLabel}", not the company broadly:
1. Provided URLs above (highest priority, source of truth)
2. Pricing page specifically for "${compLabel}" — not a generic company pricing page
3. "${compLabel}" changelog / release notes
4. G2 and Capterra reviews specifically for "${compLabel}"
5. Google News: "${compLabel}" past 24 months — only include results that are about this specific product
6. LinkedIn company page for ${competitorName} — used for social presence section only
7. ${competitorName} blog and official channels — only posts specifically about "${compLabel}"
8. If ${competitorName} is a public company: earnings calls or SEC filings for commentary about this product's category only

CITATION REQUIREMENT: Every single claim, data point, quote, and story must include source_label (publication or platform name) and source_url (direct URL). If a fact comes from a provided URL, cite that URL exactly. If you cannot verify a claim from a credible source, do NOT include it — return null or [] for that field rather than fabricating or guessing.

After gathering all information, return a single JSON object with EXACTLY this structure:

{
  "overview": {
    "company_snapshot": {
      "founded": "4-digit year string or null",
      "employees": "string e.g. '500–1,000' or null",
      "funding_arr": "string — PRIVATE companies: funding stage + total raised only if it signals product investment level or stability risk (e.g. 'Series B · $45M raised'). PUBLIC companies: annual revenue or earnings commentary specific to this product or its category (e.g. '$2.4B ARR · NYSE:CRM'). Do NOT report VC funding rounds for public companies. Use null if not applicable or not product-relevant.",
      "hq": "string e.g. 'San Francisco, CA' or null",
      "one_liner": "string — one sentence on what THIS SPECIFIC PRODUCT does, not what the company does broadly",
      "source_label": "string or null",
      "source_url": "string or null"
    },
    "product_focus": {
      "core_use_case": "string — the primary job their product does",
      "target_customer": "string — who buys this: role, company size, industry",
      "key_differentiators": ["string — 3-4 specific, verifiable differentiators"],
      "problem_solved": "string — the specific pain their product addresses",
      "source_label": "string or null",
      "source_url": "string or null"
    },
    "pricing": {
      "tiers": [
        {
          "tier": "string — tier name e.g. Free, Pro, Enterprise",
          "price": "string — e.g. '$49/seat/mo' or 'Custom'",
          "included": "string — key inclusions for this tier",
          "limitations": "string or null — notable limits or caps",
          "source_label": "string or null",
          "source_url": "string or null"
        }
      ],
      "recent_change": false,
      "recent_change_note": "string or null — describe if recent_change is true",
      "recent_change_date": "YYYY-MM-DD or null"
    },
    "competitive_triggers": [
      {
        "date": "YYYY-MM-DD or null",
        "type": "pricing_change | product_launch | funding | key_hire | bad_press",
        "summary": "string — one sentence describing the event as it relates to ${compLabel} specifically. Only include events that directly concern this product — not general company announcements.",
        "source_label": "string — publication or platform name",
        "source_url": "string or null"
      }
    ],
    "related_competitors": [
      {
        "name": "string — company name",
        "product_name": "string or null",
        "website": "string — full URL",
        "tag": "closest substitute | emerging threat",
        "summary": "string — one sentence on why this competitor is relevant"
      }
    ]
  },
  "sales": {
    "battle_cards": {
      "positioning_summary": "string — 2-3 sentences on how ${compLabel} positions itself in the market",
      "strengths": [
        {
          "title": "string — 3-5 word label",
          "explanation": "string — one sentence",
          "source_label": "string or null",
          "source_url": "string or null"
        }
      ],
      "weaknesses": [
        {
          "title": "string — 3-5 word label",
          "explanation": "string — one sentence",
          "source_label": "string or null",
          "source_url": "string or null"
        }
      ]
    },
    "objection_handling": [
      {
        "objection": "string — specific thing a prospect says when preferring ${compLabel}",
        "talking_points": ["string — one sharp counter-point per item, 2-4 items total"],
        "evidence": "string — the supporting fact or data behind these talking points",
        "source_label": "string or null",
        "source_url": "string or null"
      }
    ],
    "landmines_to_watch": [
      {
        "statement": "string — the specific thing ${compLabel} says or plants against ${ourContext}",
        "context": "string — why they use this and when in the sales cycle",
        "how_to_neutralize": "string — specific reframe or response a rep can use",
        "source_label": "string or null",
        "source_url": "string or null"
      }
    ],
    "landmines_to_plant": [
      {
        "topic": "string — the area of ${compLabel}'s vulnerability",
        "suggested_language": "string — specific question or statement a rep can use verbatim",
        "rationale": "string — why this creates doubt or opens an advantage for ${ourContext}",
        "source_label": "string or null",
        "source_url": "string or null"
      }
    ],
    "win_loss_stories": [
      {
        "outcome": "win | loss",
        "story": "string — direct quote or very close paraphrase. Do NOT invent or pad.",
        "source_platform": "string — e.g. G2, Capterra, Reddit",
        "source_url": "string — direct link to the review or post",
        "date": "YYYY-MM-DD or null"
      }
    ]
  },
  "product": {
    "feature_matrix": [
      {
        "feature": "string — feature or capability name",
        "our_value": "string — brief capability of ${ourLabel}",
        "their_value": "string — brief capability of ${compLabel}",
        "edge": "us | them | neutral",
        "our_detail": "string — fuller description of ${ourLabel}'s implementation",
        "their_detail": "string — fuller description of ${compLabel}'s implementation",
        "customer_quotes": [
          {
            "quote": "string — verbatim or near-verbatim from a review",
            "source_label": "string — e.g. G2, Capterra",
            "source_url": "string or null",
            "date": "YYYY-MM-DD or null"
          }
        ],
        "source_label": "string or null",
        "source_url": "string or null"
      }
    ],
    "roadmap_signals": [
      {
        "signal": "string — what this signals about their product direction",
        "evidence": "string — the specific thing found (job title, changelog entry, press quote)",
        "source_type": "job_posting | changelog | launch | press",
        "source_label": "string",
        "source_url": "string or null",
        "date": "YYYY-MM-DD or null"
      }
    ],
    "product_gaps": [
      {
        "gap": "string — the missing or weak capability",
        "frequency": "common | occasional",
        "example_complaint": "string — direct quote or close paraphrase from a review",
        "source_label": "string",
        "source_url": "string or null",
        "date": "YYYY-MM-DD or null"
      }
    ]
  },
  "marketing": {
    "positioning_analysis": {
      "category_claimed": "string — what market category they claim to own",
      "target_audience": "string — who they are explicitly targeting in messaging",
      "overall_positioning": "string — 2-3 sentences summarising their positioning strategy",
      "source_label": "string or null",
      "source_url": "string or null"
    },
    "key_messages": [
      {
        "message": "string — the specific claim, quoted directly where possible",
        "appears_in": "string — where found e.g. 'homepage hero', 'pricing page', 'Google ad'",
        "source_label": "string",
        "source_url": "string or null"
      }
    ],
    "messaging_gaps": [
      {
        "gap": "string — what they conspicuously avoid or underplay",
        "opportunity": "string — how ${ourContext} can own this space in messaging"
      }
    ],
    "voice_of_customer": [
      {
        "quote": "string — verbatim from a review or post. Do NOT paraphrase.",
        "source_platform": "string — e.g. G2, Capterra, Reddit",
        "source_url": "string or null",
        "date": "YYYY-MM-DD or null",
        "sentiment": "positive | negative | mixed"
      }
    ],
    "social_presence": {
      "platforms": ["string — platforms they are active on"],
      "content_themes": ["string — 3-5 recurring themes in their content"],
      "tone": "string — describe their brand voice in 1-2 sentences",
      "posting_frequency": "string or null — e.g. 'Daily on LinkedIn'",
      "source_label": "string or null",
      "source_url": "string or null"
    }
  }
}

Rules:
- PRODUCT SCOPE: Every section, trigger, feature, quote, and story must be about ${compLabel} specifically. If a piece of information cannot be directly and clearly tied to this product, omit it — do not include company-wide context as filler.
- overview.company_snapshot: one_liner must describe what ${compLabel} does, not what ${competitorName} the company does.
- overview.competitive_triggers: only include events that directly concern ${compLabel}. All significant product-specific events from the last 24 months, newest first. Minimum 3 where available.
- overview.related_competitors: exactly 2 closest substitutes + 1 emerging threat at the product level (3 total).
- sales.battle_cards: strengths and weaknesses 4-6 items each, specific to ${compLabel}'s actual capabilities and user experience.
- sales.objection_handling: 4-6 objections specific to competing against ${compLabel} when selling ${ourContext}.
- sales.win_loss_stories: ONLY real stories from G2, Capterra, Reddit, or credible press that are explicitly about ${compLabel}. If none found, return []. Do NOT fabricate.
- product.feature_matrix: 6-10 rows covering ${compLabel}'s specific features. customer_quotes: only include if a verbatim review quote about that specific feature exists; otherwise [].
- marketing.voice_of_customer: ONLY verbatim or near-verbatim quotes from review platforms about ${compLabel} specifically. Min 3-5 where available. Do NOT paraphrase.
- If data for any field is not available from a credible source for this specific product, use null or [] — never fill with invented or company-level content.
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

  // Build prompts once (system prompt now knows which competitor product is being researched)
  const systemPrompt   = buildSystemPrompt(productConfig, competitorName, competitorInfo);
  const researchPrompt = buildResearchPrompt(competitorName, productConfig, competitorInfo);

  // ── Log exactly what is being sent to Claude ─────────────────────────────
  console.log(`\n[${jobId}] ══════════════════════════════════════════════════════`);
  console.log(`[${jobId}] COMPETITOR INFO RECEIVED:`, JSON.stringify(competitorInfo));
  console.log(`[${jobId}] ── SYSTEM PROMPT (full) ─────────────────────────────`);
  console.log(systemPrompt);
  console.log(`[${jobId}] ── RESEARCH PROMPT (first 600 chars) ───────────────`);
  console.log(researchPrompt.slice(0, 600));
  console.log(`[${jobId}] ══════════════════════════════════════════════════════\n`);

  const messages = [
    { role: 'user', content: researchPrompt },
  ];

  console.log(`[${jobId}] Calling Claude...`);
  let finalText = '';

  // Agentic loop — Claude may call web_search multiple times
  let continueLoop = true;
  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
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
        system: systemPrompt,   // same pre-built prompt — includes RESEARCH TARGET
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

  // Write to research_outputs.
  // New schema (v2): entire output stored in battle_card as { overview, sales, product, marketing }.
  // competitive_triggers and related_competitors columns are backfilled for any legacy queries.
  const { error: writeError } = await supabase.from('research_outputs').insert({
    competitor_id: competitorId,
    job_id: jobId,
    battle_card: parsed,
    competitive_triggers: parsed.overview?.competitive_triggers || null,
    head_to_head: null,
    related_competitors: parsed.overview?.related_competitors || null,
    raw_sources: null,
    version: 2,
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
