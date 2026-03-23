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
- Provided URLs passed in this request (always credible by definition — highest priority)
- Recognised press: TechCrunch, Forbes, WSJ, Reuters, Bloomberg, Business Insider, CNBC, The Verge, Wired, Ars Technica, VentureBeat
- Analyst/review platforms: G2, Capterra, Gartner, Forrester, IDC, Trustpilot
- Professional networks: LinkedIn (company pages and verified profiles only)
- Regulatory filings: SEC EDGAR, Companies House, or equivalent
- The company's own verified social channels (Twitter/X, YouTube, official blog)
Do NOT use: personal blogs, design blogs, community-submitted content, content aggregators (Techmeme, AllTop), link farms, SEO content farms, anonymous wikis, forum roundup sites, or any source where the institutional author and publication date cannot be clearly identified.
Do NOT use the competitor's own blog posts as a source for claims about the competitor — blog posts are marketing, not evidence.
If a source is ambiguous or the author cannot be identified as an institutional source, skip it entirely.

COMPANY SNAPSHOT SOURCING:
The company_snapshot section uses company-level data. For this section only, use:
- Official company website ("About", "Careers", or investor relations pages)
- SEC filings (for public companies)
- Recognised press: WSJ, Reuters, Bloomberg, Forbes, TechCrunch
Do NOT use personal blogs, design blogs, or any non-institutional source for company_snapshot data.

LANGUAGE PRECISION:
Use the exact product and feature terminology that appears on the company's official website and documentation. Do not paraphrase, genericise, or invent synonyms. If the product calls a feature "Workspaces", use "Workspaces" — not "shared spaces" or "team areas". Precision matters because sales reps use this output verbatim in customer conversations.

QUOTES AND CUSTOMER EVIDENCE — STRICT RULES:
- Never fabricate, reconstruct, or invent customer quotes under any circumstances.
- Never paraphrase a customer quote beyond minor punctuation cleanup — use near-verbatim text only.
- If a real, sourced verbatim quote is not available for a field, return [] or null for that field.
- Do not fill empty quote fields with invented examples, hypothetical phrasings, or composite summaries.

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
      "funding_arr": "string — company-level. PUBLIC companies: stock ticker AND annual revenue both, e.g. 'NYSE:CRM · $2.4B FY2024 revenue'. Do NOT report funding rounds for public companies. PRIVATE companies: funding stage and total raised ONLY if it signals product-level investment, e.g. 'Series B · $45M raised'; use null if it does not signal meaningful product investment.",
      "hq": "string e.g. 'San Francisco, CA' or null",
      "one_liner": "string — one sentence on what the COMPANY does at the company level (not product-specific). Source from the official company 'About' page, SEC filing, or recognised press.",
      "source_label": "string or null — must be official company site, SEC filing, or recognised press. No personal blogs.",
      "source_url": "string or null"
    },
    "product_focus": {
      "product_description": "string — one sentence on what this specific product does. Source from the official product page only. Do not use the company's general tagline if it describes the company rather than this specific product.",
      "target_customer": "string — who uses this specific product: company size (e.g. 'SMB to mid-market, 50–500 employees'), typical buyer roles (e.g. 'Operations leads, PMs, team leads'), common use cases they are solving for, and the context in which they typically evaluate this product. 2–3 sentences. Source from official product page, G2 buyer data, or credible analyst data only.",
      "problem_solved": "string — the specific pain point this product addresses. Must be about this product specifically, not the company broadly.",
      "key_differentiators": ["string — what makes this specific product distinct from alternatives. Must be product-specific — not platform-wide or company-level claims. 3–5 items. Use exact product terminology from official documentation. Each item must be verifiable from an official or credible source."],
      "source_label": "string or null",
      "source_url": "string or null"
    },
    "pricing": {
      "tiers": [
        {
          "tier": "string — tier name e.g. Free, Pro, Business, Enterprise",
          "price": "string — e.g. '$49/seat/mo' or 'Custom'",
          "included": "string — key inclusions for this tier",
          "limitations": "string or null — notable limits or caps",
          "includes_product": "boolean — true if the specific product being researched is available in this tier; false if it is not. Be explicit: if the product is only available on certain plans, mark only those plans true.",
          "source_label": "string or null — must be the official pricing page for this product",
          "source_url": "string or null — direct link to the official pricing page"
        }
      ]
    }
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
            "quote": "string — verbatim text from a real, sourced review. Do NOT fabricate, reconstruct, or paraphrase. If no real verbatim quote exists for this feature, return [].",
            "source_label": "string — e.g. G2, Capterra",
            "source_url": "string or null",
            "date": "YYYY-MM-DD or null"
          }
        ],
        "source_label": "string or null",
        "source_url": "string or null"
      }
    ],
    "product_gaps": [
      {
        "gap": "string — a missing or weak capability, sourced ONLY from the company's own official documentation, support pages, known limitations pages, or release notes. Do NOT source from customer reviews, third-party blogs, or any external opinion. Only include gaps that the company itself acknowledges or that are evident from the absence of a feature in their official documentation.",
        "source_label": "string — must be official company source (e.g. 'Asana Support', 'Official Docs')",
        "source_url": "string or null — link to the specific support page, doc page, or release note",
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
        "quote": "string — verbatim text copied directly from a real review on G2, Capterra, or a credible platform. Do NOT paraphrase, summarise, or reconstruct. If a real verbatim quote is not available, return [] for the entire voice_of_customer array.",
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

PRODUCT SCOPE:
- Every section, feature, quote, and data point must be about ${compLabel} specifically — not the company broadly, not their other products, not their platform.
- If a piece of information cannot be directly and clearly tied to this specific product, omit it entirely.

LANGUAGE PRECISION:
- Use the exact feature and product terminology from the company's official website and documentation. Do not genericise or invent synonyms.
- If the product calls a feature "Workspaces", use "Workspaces" — not "shared spaces" or "team areas".

COMPANY SNAPSHOT:
- Source exclusively from the competitor's official company website (About, Careers, Investor Relations pages) and SEC filings for public companies.
- one_liner describes what the COMPANY does at the company level — not this specific product.
- For public companies: include stock ticker AND annual revenue. Do not mention funding rounds.
- For private companies: include funding stage and total raised ONLY if it signals product-level investment; otherwise use null.
- No personal blogs, no non-institutional sources.

PRODUCT FOCUS:
- product_description: one sentence sourced from the official product page only. Do not use the company's general tagline.
- target_customer: include company size, typical buyer roles, common use cases, and the context in which they typically evaluate this product. Source from official product page, G2 buyer data, or credible analyst data.
- key_differentiators: must be product-specific claims, not company-wide or platform-level claims. Each must be verifiable from an official or credible third-party source.
- problem_solved: must describe the specific pain this product addresses, not a general category problem.

PRICING:
- Source ONLY from the official pricing page for this specific product.
- Do not infer pricing from company-wide plans unless this product is only sold as part of a bundle.
- includes_product: be explicit — mark true only for tiers where the specific product being researched is actually available.

QUOTES AND EVIDENCE — ABSOLUTE RULES:
- All quotes and examples must be real, sourced, and specific to ${compLabel} — not the company overall or their broader product suite.
- NEVER fabricate, reconstruct, paraphrase, or invent any quote, review excerpt, or customer story.
- If a real verbatim quote is not available, return [] or null — never fill the field with invented or composite content.
- customer_quotes in feature_matrix: return [] unless a real verbatim review quote specifically about that feature exists.
- marketing.voice_of_customer: ONLY verbatim text from real reviews on G2, Capterra, or equivalent. Return [] if no real verbatim quotes are available.

SOURCE HIERARCHY — apply in order:
1. Provided URLs passed in this request (highest priority — treat as source of truth)
2. Official company website and product pages
3. Credible press: TechCrunch, Forbes, WSJ, Reuters, Bloomberg, Business Insider, CNBC, The Verge, Wired, VentureBeat
4. Analyst and review platforms: G2, Capterra, Gartner, Forrester, IDC
5. Regulatory filings: SEC EDGAR, Companies House, or equivalent

NEVER USE:
- Competitor blog posts as evidence for claims about the competitor (blog posts are marketing, not evidence)
- Personal blogs, design blogs, community-submitted content, or content aggregators
- Any source where the institutional author and publication date cannot be clearly identified
- Forum roundup sites, SEO content farms, link farms, or anonymous wikis

CITATIONS:
- Every claim, data point, and quote must include a source_label and source_url.
- source_url must be a direct, clickable link to the specific page — not a homepage.
- Include the publication or page date in source_label where available, e.g. "G2 · March 2024".
- If a claim cannot be verified from a credible source, set source_label to "unverified" and source_url to null.
- product.product_gaps: source ONLY from official company documentation, support pages, or known limitations pages. Do NOT use customer reviews or third-party opinion for this section. Return [] if no official-source gaps are found.

If data for any field is not available from a credible source for this specific product, use null or [] — never fill with invented or company-level content.
Return ONLY this JSON object — nothing else.`;
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
    // prefixed field names (sent by frontend via n8n)
    competitor_product_name,
    competitor_url,
    competitor_additional_urls,
    competitor_notes,
    // un-prefixed fallbacks — n8n sometimes strips the "competitor_" prefix
    product_name:    body_product_name,
    url:             body_url,
    additional_urls: body_additional_urls,
    notes:           body_notes,
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

  // Accept both prefixed and un-prefixed field names — use whichever arrived
  const competitorInfo = {
    product_name: competitor_product_name || body_product_name || null,
    url:          competitor_url          || body_url          || null,
    additional_urls: Array.isArray(competitor_additional_urls) ? competitor_additional_urls
                   : Array.isArray(body_additional_urls)       ? body_additional_urls
                   : [],
    notes: competitor_notes || body_notes || null,
  };
  console.log('[/api/research] competitorInfo resolved:', JSON.stringify(competitorInfo));

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

  // ── Fetch competitor row from Supabase — authoritative source of truth ──
  // We do NOT rely on n8n passing product_name / url through the request body
  // because n8n may silently drop or rename fields.  The frontend always writes
  // to the competitors table before firing the webhook, so the DB is guaranteed
  // to have the latest values.
  const { data: competitorRow } = await supabase
    .from('competitors')
    .select('name, product_name, website, additional_urls, notes')
    .eq('id', competitorId)
    .single();

  console.log(`[${jobId}] Competitor row from Supabase:`, JSON.stringify(competitorRow));

  // Merge: DB values take priority; fall back to whatever arrived in the request body
  const resolvedInfo = {
    product_name:    competitorRow?.product_name    || competitorInfo.product_name    || null,
    url:             competitorRow?.website         || competitorInfo.url             || null,
    additional_urls: competitorRow?.additional_urls || competitorInfo.additional_urls || [],
    notes:           competitorRow?.notes           || competitorInfo.notes           || null,
  };

  console.log(`[${jobId}] resolvedInfo (DB + body merged):`, JSON.stringify(resolvedInfo));

  // Fetch all product config values
  const productConfig = await getProductConfig();
  console.log(`[${jobId}] Product config:`, JSON.stringify(productConfig));

  // Build prompts once (system prompt now knows which competitor product is being researched)
  const systemPrompt   = buildSystemPrompt(productConfig, competitorName, resolvedInfo);
  const researchPrompt = buildResearchPrompt(competitorName, productConfig, resolvedInfo);

  // ── Log exactly what is being sent to Claude ─────────────────────────────
  console.log(`\n[${jobId}] ══════════════════════════════════════════════════════`);
  console.log(`[${jobId}] COMPETITOR INFO FROM REQUEST BODY:`, JSON.stringify(competitorInfo));
  console.log(`[${jobId}] RESOLVED INFO (used for prompts):`, JSON.stringify(resolvedInfo));
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

  // ── Agentic loop ─────────────────────────────────────────────────────────
  //
  // web_search_20250305 is a SERVER-SIDE built-in tool.
  // When Claude calls it, Anthropic's API executes the search automatically
  // and returns BOTH the search request block (type: 'server_tool_use') AND
  // the results block (type: 'web_search_tool_result') in the SAME
  // response.content.
  //
  // Correct pattern:
  //   1. Push full response.content as the assistant message.
  //   2. If stop_reason === 'tool_use', loop — DO NOT add a user message
  //      with tool results; they are already inside the assistant message.
  //   3. If stop_reason === 'end_turn', collect text and exit.
  //
  // Previous bug: the code filtered for `block.type === 'tool_use'` which
  // never matches 'server_tool_use', so toolResults was always [], and we
  // pushed { role: 'user', content: [] } — an empty user message that put
  // the conversation in an invalid state and triggered the 400 error on the
  // next loop iteration.

  const MAX_ITERATIONS = 25;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });

    const blockTypes = response.content.map((b) => b.type).join(', ');
    console.log(`[${jobId}] Loop ${iterations}: stop_reason=${response.stop_reason} blocks=[${blockTypes}]`);

    // Always push the FULL assistant response (includes server_tool_use +
    // web_search_tool_result pairs for any searches Claude ran this turn)
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
      }
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Log each search for visibility
      for (const block of response.content) {
        if (block.type === 'server_tool_use' || block.type === 'tool_use') {
          console.log(`[${jobId}]   → ${block.name}(${JSON.stringify(block.input ?? {}).slice(0, 140)})`);
        }
      }
      // Results are already in response.content — just loop, no user message
      continue;
    }

    // Any other stop reason (max_tokens, stop_sequence, etc.) — grab
    // whatever text Claude managed to produce before stopping
    for (const block of response.content) {
      if (block.type === 'text') finalText += block.text;
    }
    console.log(`[${jobId}] Loop ended early: stop_reason=${response.stop_reason}`);
    break;
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(`[${jobId}] Hit MAX_ITERATIONS (${MAX_ITERATIONS}) — forcing exit`);
    // Collect any text that may exist in the last assistant message
    const lastAsst = messages[messages.length - 1];
    if (lastAsst?.role === 'assistant') {
      for (const block of (Array.isArray(lastAsst.content) ? lastAsst.content : [])) {
        if (block.type === 'text') finalText += block.text;
      }
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
      // Before appending the retry user message, ensure the conversation is
      // valid: the Anthropic API requires every web_search tool_use block in
      // an assistant message to be followed by a matching
      // web_search_tool_result block in the very next user message.
      // If the last assistant message contains any unresolved tool_use blocks
      // (e.g. Claude hit max_tokens mid-search), inject placeholder results
      // now so the conversation satisfies the API constraint.
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        // Guard against both 'tool_use' (client-side) and 'server_tool_use'
        // (web_search built-in). A server_tool_use block should already have a
        // matching web_search_tool_result in the same assistant message; we only
        // need to inject placeholders for any that are genuinely missing.
        const allContent = Array.isArray(lastMsg.content) ? lastMsg.content : [];
        const resolvedIds = new Set(
          allContent
            .filter((b) => b.type === 'web_search_tool_result' || b.type === 'tool_result')
            .map((b) => b.tool_use_id)
        );
        const unresolved = allContent.filter(
          (b) => (b.type === 'tool_use' || b.type === 'server_tool_use') && !resolvedIds.has(b.id)
        );
        if (unresolved.length > 0) {
          console.log(`[${jobId}] Injecting ${unresolved.length} placeholder tool_result(s) before retry`);
          messages.push({
            role: 'user',
            content: unresolved.map((b) => ({
              type: 'web_search_tool_result',
              tool_use_id: b.id,
              content: 'Search result not available.',
            })),
          });
          // Claude needs to respond to those tool results before we can ask
          // the correction question. Send a minimal "continue" message and
          // collect any partial text so we can try parsing again.
          const bridgeResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            system: systemPrompt,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages,
          });
          messages.push({ role: 'assistant', content: bridgeResponse.content });
          // Collect any text from the bridge response
          let bridgeText = '';
          for (const block of bridgeResponse.content) {
            if (block.type === 'text') bridgeText += block.text;
          }
          if (bridgeText) {
            // If the bridge response already has valid JSON, use it
            try {
              parsed = extractJson(bridgeText);
              console.log(`[${jobId}] Bridge response contained valid JSON — using it.`);
            } catch (_) {
              // No valid JSON yet — proceed to formal retry below
              console.log(`[${jobId}] Bridge response did not contain valid JSON — proceeding to retry prompt.`);
            }
          }
        }
      }

      // Only send the correction prompt if we still don't have parsed JSON
      if (!parsed) {
        messages.push({ role: 'user', content: buildRetryPrompt() });
      }

      if (!parsed) {
        const retryResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
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
      }
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
