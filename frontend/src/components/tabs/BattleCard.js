import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────── */
/* Shared primitives                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </h3>
  );
}

function Empty() {
  return <span className="text-gray-400 text-sm">—</span>;
}

function SourceBadge({ label, url }) {
  if (!label) return null;
  const inner = (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                     bg-gray-100 text-gray-500 border border-gray-200 hover:bg-indigo-50
                     hover:text-indigo-600 hover:border-indigo-200 transition-colors">
      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      via {label}
    </span>
  );
  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="no-underline">
        {inner}
      </a>
    );
  }
  return inner;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Positioning                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function PositioningSection({ positioning }) {
  // Legacy: plain string
  if (!positioning || typeof positioning === 'string') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-l-indigo-500">
        <p className="text-gray-700 text-sm leading-relaxed">{positioning || '—'}</p>
      </div>
    );
  }

  // Rich object
  const { core_message, insights = [] } = positioning;
  return (
    <div className="space-y-3">
      {core_message && (
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Core Message</span>
          <span className="text-sm font-semibold text-indigo-800">{core_message}</span>
        </div>
      )}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4
                                    border-l-4 border-l-indigo-400 flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-800 leading-tight">{ins.headline}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{ins.explanation}</p>
              <SourceBadge label={ins.source_label} url={ins.source_url} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Pricing                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

function PricingSection({ pricing }) {
  // Legacy: plain string
  if (!pricing || typeof pricing === 'string') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm">💲</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Pricing Overview
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{pricing}</p>
        </div>
      </div>
    );
  }

  // Rich object
  const { tiers = [], recent_changes, recent_change_note, source_label, source_url } = pricing;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm">💲</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Pricing Tiers
          </span>
        </div>
        <div className="flex items-center gap-2">
          {recent_changes && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5
                             rounded-full bg-red-50 text-red-600 border border-red-200">
              ⚠ Recent Change
            </span>
          )}
          <SourceBadge label={source_label} url={source_url} />
        </div>
      </div>

      {recent_change_note && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700">
          {recent_change_note}
        </div>
      )}

      {tiers.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">For</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={i} className={`border-t border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-5 py-3 font-semibold text-gray-800">{t.tier}</td>
                <td className="px-5 py-3 font-mono text-indigo-700 font-semibold text-sm">{t.price}</td>
                <td className="px-5 py-3 text-gray-600 text-xs">{t.target_customer}</td>
                <td className="px-5 py-3 text-gray-400 text-xs hidden sm:table-cell">{t.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-5 py-4 text-sm text-gray-500">Pricing details unavailable.</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Strengths / Weaknesses                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

function SwCard({ item, type }) {
  const [open, setOpen] = useState(false);

  // Legacy: plain string
  const isLegacy = typeof item === 'string';
  const title       = isLegacy ? item : item.title;
  const explanation = isLegacy ? null  : item.explanation;
  const deal_tip    = isLegacy ? null  : item.deal_tip;

  const borderCls = type === 'strength'
    ? 'border-l-emerald-400'
    : 'border-l-red-400';
  const iconCls = type === 'strength'
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-red-600 bg-red-50 border-red-200';
  const icon = type === 'strength' ? '✓' : '✗';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 ${borderCls} overflow-hidden`}>
      <button
        onClick={() => deal_tip && setOpen(!open)}
        className={`w-full text-left px-4 py-3.5 flex items-start gap-3 ${deal_tip ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} transition-colors`}
      >
        <span className={`text-xs font-bold w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${iconCls}`}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
          {explanation && (
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{explanation}</p>
          )}
        </div>
        {deal_tip && (
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {open && deal_tip && (
        <div className="px-4 pb-3.5 pt-1 border-t border-dashed border-gray-200 bg-teal-50">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-widest mb-1">
            💡 Deal Tip
          </p>
          <p className="text-sm text-teal-800 leading-relaxed">{deal_tip}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Objection Handling                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

function AccordionItem({ item, index }) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);

  const objection = typeof item === 'object' ? item.objection : item;
  const response  = typeof item === 'object' ? item.response  : '';

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-800 leading-snug">{objection}</span>
        </div>
        <svg
          className={`ml-3 w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && response && (
        <div className="px-4 py-3.5 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed pl-8 mb-3">{response}</p>
          <div className="pl-8">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                         bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50
                         hover:text-indigo-700 hover:border-indigo-200 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="4" width="7" height="7" rx="1"/>
                    <path d="M1 8V1h7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copy talk track
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Landmines                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

function LandmineCard({ item, index }) {
  // Legacy: plain string
  const isLegacy   = typeof item === 'string';
  const statement  = isLegacy ? item : item.statement;
  const explanation = isLegacy ? null : item.explanation;

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
      <span className="text-base shrink-0 mt-0.5">🚩</span>
      <div className="min-w-0">
        <div className="flex gap-2 items-baseline mb-0.5">
          <span className="text-xs font-bold text-amber-700 shrink-0">{index + 1}.</span>
          <p className="text-sm font-semibold text-amber-900 leading-snug">{statement}</p>
        </div>
        {explanation && (
          <p className="text-xs text-amber-700 leading-relaxed mt-1 ml-4">{explanation}</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Sources footer                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

function SourcesSection({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div>
      <SectionLabel>Sources</SectionLabel>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {sources.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-gray-700 shrink-0">{s.label}</span>
              {s.description && (
                <span className="text-xs text-gray-400 truncate hidden sm:block">— {s.description}</span>
              )}
            </div>
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-500 hover:underline shrink-0 ml-3 truncate max-w-[200px]"
              >
                {s.url.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main component                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function BattleCard({ data }) {
  if (!data) {
    return <div className="text-sm text-gray-400 py-16 text-center">No battle cards data yet.</div>;
  }

  const d = typeof data === 'string' ? JSON.parse(data) : data;

  // Normalise strengths / weaknesses — handle both legacy strings and rich objects
  const strengths  = (d.strengths  || []);
  const weaknesses = (d.weaknesses || []);

  return (
    <div className="max-w-3xl space-y-8">

      {/* ── Positioning ──────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Positioning</SectionLabel>
        <PositioningSection positioning={d.positioning} />
      </div>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Pricing</SectionLabel>
        <PricingSection pricing={d.pricing} />
      </div>

      {/* ── Strengths / Weaknesses ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <SectionLabel>Strengths</SectionLabel>
          {strengths.length > 0 ? (
            <div className="space-y-2">
              {strengths.map((s, i) => <SwCard key={i} item={s} type="strength" />)}
            </div>
          ) : <Empty />}
        </div>
        <div>
          <SectionLabel>Weaknesses</SectionLabel>
          {weaknesses.length > 0 ? (
            <div className="space-y-2">
              {weaknesses.map((w, i) => <SwCard key={i} item={w} type="weakness" />)}
            </div>
          ) : <Empty />}
        </div>
      </div>

      {/* ── Objection Handling ───────────────────────────────────────────── */}
      <div>
        <SectionLabel>Objection Handling</SectionLabel>
        {d.objection_handling?.length > 0 ? (
          <div className="space-y-2">
            {d.objection_handling.map((item, i) => (
              <AccordionItem key={i} item={item} index={i} />
            ))}
          </div>
        ) : <Empty />}
      </div>

      {/* ── Landmines ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Landmines</SectionLabel>
        {d.landmines?.length > 0 ? (
          <div className="space-y-2">
            {d.landmines.map((item, i) => <LandmineCard key={i} item={item} index={i} />)}
          </div>
        ) : <Empty />}
      </div>

      {/* ── Sources ──────────────────────────────────────────────────────── */}
      <SourcesSection sources={d.sources} />

    </div>
  );
}
