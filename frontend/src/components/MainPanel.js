import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import Overview  from './tabs/Overview';
import Sales     from './tabs/Sales';
import Product   from './tabs/Product';
import Marketing from './tabs/Marketing';

const TABS = ['Overview', 'Sales', 'Product', 'Marketing'];

export default function MainPanel({ competitor, job, onRunResearchFor, onUpdateCompetitor }) {
  const [activeTab, setActiveTab] = useState(0);
  const [output, setOutput] = useState(null);

  // Reset tab and load output whenever the selected competitor changes
  useEffect(() => {
    if (!competitor) { setOutput(null); return; }
    setActiveTab(0);
    setOutput(null);

    const load = async () => {
      const { data } = await supabase
        .from('research_outputs')
        .select('*')
        .eq('competitor_id', competitor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setOutput(data || null);
    };
    load();

    // Realtime: pick up the new row the moment research completes
    const channel = supabase
      .channel(`output_${competitor.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'research_outputs', filter: `competitor_id=eq.${competitor.id}` },
        (payload) => setOutput(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [competitor]);

  if (!competitor) {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 text-sm">Select a competitor or run new research.</p>
        </div>
      </main>
    );
  }

  const isPending = job?.status === 'pending';
  const isRunning = job?.status === 'running';
  const isFailed  = job?.status === 'failed';

  // Detect v2 schema: battle_card contains { overview, sales, product, marketing }
  const v2 = output?.battle_card?.overview != null;
  const schema = v2 ? output.battle_card : null;

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shadow-sm shrink-0 px-8 pt-6 pb-0">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
              {competitor.product_name || competitor.name}
            </h1>
            {competitor.product_name && competitor.product_name !== competitor.name && (
              <p className="text-xs text-gray-400 mt-0.5">{competitor.name}</p>
            )}
            {competitor.website && (
              <a
                href={competitor.website}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-500 hover:underline mt-0.5 inline-block"
              >
                {competitor.website}
              </a>
            )}
          </div>
          <StatusBar job={job} output={output} />
        </div>

        {/* Missing URL banner — shown when competitor has no product URL saved */}
        {!competitor.website && onUpdateCompetitor && (
          <MissingUrlBanner
            competitor={competitor}
            onSave={(updates) => onUpdateCompetitor(competitor.id, updates)}
          />
        )}

        {/* Underline tab bar */}
        <div className="flex">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                activeTab === i
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-7">
        {(isPending || isRunning) && !output && (
          <LoadingState status={job.status} />
        )}
        {isFailed && !output && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 text-sm">
            <span className="text-lg shrink-0">⚠️</span>
            <span>Research job failed. Please try running again.</span>
          </div>
        )}

        {output && !v2 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-800 text-sm">
            <span className="text-lg shrink-0">↻</span>
            <span>This research was generated with an older schema. Re-run research to see the new dashboard.</span>
          </div>
        )}

        {schema && (
          <>
            {activeTab === 0 && (
              <Overview
                data={schema.overview}
                onRunResearch={(name, website) => onRunResearchFor && onRunResearchFor(name, website)}
              />
            )}
            {activeTab === 1 && <Sales    data={schema.sales} />}
            {activeTab === 2 && <Product  data={schema.product} />}
            {activeTab === 3 && <Marketing data={schema.marketing} />}
          </>
        )}

        {!output && !isPending && !isRunning && !isFailed && (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 text-gray-400 text-sm shadow-sm">
            No research data yet. Run a new job to see results here.
          </div>
        )}
      </div>
    </main>
  );
}

// ── MissingUrlBanner ───────────────────────────────────────────────────────
// Shown in the header when a competitor has no product URL saved. Collapses
// into an inline edit form when the user clicks "Add URL".
const MAX_EXTRA = 4;

function MissingUrlBanner({ competitor, onSave }) {
  const [open, setOpen]       = useState(false);
  const [url,  setUrl]        = useState('');
  const [extra, setExtra]     = useState([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const inputRef              = useRef(null);

  // Focus the URL input when the form expands
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const addExtra = () => { if (extra.length < MAX_EXTRA) setExtra((p) => [...p, '']); };
  const removeExtra = (i) => setExtra((p) => p.filter((_, idx) => idx !== i));
  const updateExtra = (i, val) => setExtra((p) => p.map((u, idx) => (idx === i ? val : u)));

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError('Product URL is required'); return; }
    try { new URL(trimmed); } catch { setError('Enter a valid URL (include https://)'); return; }
    setError('');
    setSaving(true);
    await onSave({
      website:         trimmed,
      additional_urls: extra.map((u) => u.trim()).filter(Boolean),
    });
    setSaving(false);
    setOpen(false);
  };

  const inputCls = 'flex-1 bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400';

  if (!open) {
    return (
      <div className="flex items-center gap-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
        <span className="shrink-0">⚠</span>
        <span className="flex-1">No product URL saved — add one to improve research accuracy</span>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 transition-colors cursor-pointer"
        >
          Add URL
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold">Add product URL for {competitor.product_name || competitor.name}</span>
        <button onClick={() => setOpen(false)} className="text-amber-600 hover:text-amber-900 text-lg leading-none cursor-pointer">×</button>
      </div>

      {/* Primary URL */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-amber-800 mb-1">
          Product URL <span className="text-red-500">*</span>
        </label>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          placeholder="https://example.com/product"
          className={inputCls + ' w-full'}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Additional URLs */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-amber-800 mb-1">
          Additional URLs <span className="font-normal text-amber-600">(optional · up to {MAX_EXTRA})</span>
        </label>
        <div className="flex flex-col gap-1.5">
          {extra.map((u, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="url"
                value={u}
                onChange={(e) => updateExtra(i, e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeExtra(i)}
                className="text-amber-600 hover:text-red-500 text-lg leading-none cursor-pointer shrink-0 px-1"
              >
                ×
              </button>
            </div>
          ))}
          {extra.length < MAX_EXTRA && (
            <button
              type="button"
              onClick={addExtra}
              className="text-xs text-amber-700 hover:text-amber-900 text-left transition-colors cursor-pointer"
            >
              + Add URL
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold transition-colors cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function StatusBar({ job, output }) {
  if (!job) return null;

  const STATUS = {
    pending:  { pill: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500',              label: 'Pending'  },
    running:  { pill: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500 animate-pulse', label: 'Running…' },
    complete: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500',            label: 'Complete' },
    failed:   { pill: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-500',                label: 'Failed'   },
  };

  const s = STATUS[job.status] || STATUS.pending;
  const lastUpdated = output?.created_at
    ? new Date(output.created_at).toLocaleString()
    : null;

  return (
    <div className="text-right shrink-0 ml-4">
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
      {lastUpdated && (
        <div className="text-xs text-gray-400 mt-1">Last updated {lastUpdated}</div>
      )}
    </div>
  );
}

function LoadingState({ status }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">
          {status === 'pending' ? 'Job queued…' : 'Claude is researching this competitor…'}
        </p>
        <p className="text-xs text-gray-400 mt-1">This usually takes 30–90 seconds</p>
      </div>
    </div>
  );
}
