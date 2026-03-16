require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ─── helpers ────────────────────────────────────────────────────────────────

async function setJobStatus(jobId, status) {
  const update = { status };
  if (status === 'complete') update.completed_at = new Date().toISOString();
  await supabase.from('research_jobs').update(update).eq('id', jobId);
}

async function getOrPromptProductDescription() {
  // Check config table for our product description
  const { data } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'product_description')
    .maybeSingle();
  return data?.value || null;
}

// ─── main research prompt ────────────────────────────────────────────────────

function buildSystemPrompt(productDescription) {
  const ourProduct = productDescription
    ? `\n\nOUR PRODUCT DESCRIPTION:\n${productDescription}`
    : '\n\nOUR PRODUCT: (no description provided — use general competitive analysis perspective)';

  return `You are a competitive intelligence analyst. Your job is to research competitors thoroughly using web search and synthesize findings into structured JSON.${ourProduct}

IMPORTANT RULES:
- Return ONLY valid JSON. No markdown, no preamble, no explanations outside the JSON.
- All string values must be properly escaped.
- If you cannot find data for a field, use null or an empty array — never omit keys.
- Use web_search to look up real, current information. Do NOT hallucinate.`;
}

function buildResearchPrompt(competitorName) {
  return `Research the competitor "${competitorName}" thoroughly. Search for:
1. Their homepage and about page
2. Pricing page
3. Recent product changelog or release notes
4. G2 and Capterra reviews
5. Google News mentions (last 12 months)
6. LinkedIn company page
7. Reddit and Hacker News discussions
8. SEC filings (if they appear to be a public company)

After gathering all information, return a single JSON object with EXACTLY these four top-level keys:

{
  "battle_card": {
    "positioning": "string — how they position themselves in the market",
    "pricing": "string — pricing model, tiers, and approximate costs",
    "strengths": ["array", "of", "strings"],
    "weaknesses": ["array", "of", "strings"],
    "objection_handling": [
      { "objection": "string", "response": "string" }
    ],
    "landmines": ["things to watch out for or avoid saying in competitive deals"]
  },
  "competitive_triggers": {
    "recent_funding": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "product_launches": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "pricing_changes": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "key_hires": [{ "date": "YYYY-MM-DD or null", "summary": "string" }],
    "bad_press": [{ "date": "YYYY-MM-DD or null", "summary": "string" }]
  },
  "head_to_head": {
    "summary": "string — 2-3 sentence overall comparison",
    "feature_matrix": [
      {
        "feature": "string",
        "us": "string — our capability",
        "them": "string — their capability",
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
  const { competitor_name, job_id } = req.body;

  if (!competitor_name || !job_id) {
    return res.status(400).json({ error: 'competitor_name and job_id are required' });
  }

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

  // Get product description (may be null)
  const productDescription = await getOrPromptProductDescription();

  // Run Claude with web_search tool
  console.log(`[${jobId}] Calling Claude...`);

  const messages = [
    { role: 'user', content: buildResearchPrompt(competitorName) },
  ];

  let finalText = '';

  // Agentic loop — Claude may call web_search multiple times
  let continueLoop = true;
  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: buildSystemPrompt(productDescription),
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
    });

    // Collect assistant message content
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract final text
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
      }
      continueLoop = false;
    } else if (response.stop_reason === 'tool_use') {
      // Process tool uses
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`[${jobId}] Tool call: ${block.name}(${JSON.stringify(block.input).slice(0, 120)})`);

        // Add small delay between searches
        await delay(1500);

        // The web_search tool is handled natively by Anthropic's API —
        // we just need to push the tool_result back.
        // For native tools, the result is already included in the response stream,
        // but the API pattern requires us to echo it back.
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Search executed.',
        });
      }

      messages.push({ role: 'user', content: toolResults });
    } else {
      // max_tokens or other stop — try to extract partial text
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
      }
      continueLoop = false;
    }
  }

  console.log(`[${jobId}] Claude finished. Parsing output...`);

  // Parse JSON from Claude's response
  let parsed;
  try {
    // Strip any accidental markdown fences
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

app.get('/api/config/product-description', async (req, res) => {
  const desc = await getOrPromptProductDescription();
  res.json({ product_description: desc });
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
