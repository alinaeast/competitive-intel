import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────────────────────── */
/* Shared                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

const ADV_CONFIG = {
  us:      { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '✓ Us'    },
  them:    { cls: 'bg-red-50 text-red-700 border-red-200',             label: 'Them'    },
  neutral: { cls: 'bg-gray-100 text-gray-500 border-gray-200',         label: 'Neutral' },
};

const REASON_CONFIG = {
  'closest substitute': { cls: 'bg-orange-50 text-orange-700 border-orange-200', icon: '⚡' },
  'emerging threat':    { cls: 'bg-red-50 text-red-700 border-red-200',           icon: '⚠️' },
};
const REASON_FALLBACK = { cls: 'bg-gray-100 text-gray-500 border-gray-200', icon: '🔍' };

function AdvBadge({ value }) {
  const v = value?.toLowerCase() || 'neutral';
  const s = ADV_CONFIG[v] || ADV_CONFIG.neutral;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
}

function SourceBadge({ label, url }) {
  if (!label) return null;
  const inner = (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded
                     bg-gray-100 text-gray-400 border border-gray-200 hover:bg-indigo-50
                     hover:text-indigo-600 hover:border-indigo-200 transition-colors">
      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </span>
  );
  if (url) return <a href={url} target="_blank" rel="noreferrer" className="no-underline">{inner}</a>;
  return inner;
}

function ReasonBadge({ reason }) {
  if (!reason) return null;
  const r = REASON_CONFIG[reason.toLowerCase()] || REASON_FALLBACK;
  return (
    <span className={`self-start inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${r.cls}`}>
      {r.icon} {reason}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Feature row (expandable)                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function FeatureRow({ row, index }) {
  const [open, setOpen] = useState(false);
  const hasTalkingPoint = !!row.talking_point;

  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';

  return (
    <>
      <tr
        className={`border-t border-gray-100 ${rowBg} ${hasTalkingPoint ? 'cursor-pointer hover:bg-indigo-50/40' : ''} transition-colors`}
        onClick={() => hasTalkingPoint && setOpen(!open)}
      >
        {/* Feature */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">{row.feature}</span>
            {row.source_label && (
              <SourceBadge label={row.source_label} url={row.source_url} />
            )}
          </div>
        </td>

        {/* Us */}
        <td className="px-4 py-3.5 text-xs text-gray-600 leading-snug align-top">
          {row.us || '—'}
        </td>

        {/* Them */}
        <td className="px-4 py-3.5 text-xs text-gray-600 leading-snug align-top">
          {row.them || '—'}
        </td>

        {/* Advantage */}
        <td className="px-4 py-3.5 align-top">
          <AdvBadge value={row.advantage} />
        </td>

        {/* Talking Point */}
        <td className="px-4 py-3.5 align-top">
          {hasTalkingPoint ? (
            <div className="flex items-start gap-1.5">
              <span className="text-xs text-gray-600 leading-snug flex-1">{row.talking_point}</span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
      </tr>

      {/* Expanded detail row */}
      {open && (
        <tr className={`${rowBg} border-t border-indigo-100`}>
          <td colSpan={5} className="px-4 pb-4 pt-2">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">
                💬 Rep Talking Point
              </p>
              <p className="text-sm text-indigo-800 leading-relaxed">{row.talking_point}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Related competitor card                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

function RelatedCard({ comp, onRun }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{comp.name}</p>
          {comp.website && (
            <a
              href={comp.website}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-500 hover:underline block truncate mt-0.5"
            >
              {comp.website}
            </a>
          )}
        </div>
        <button
          onClick={() => onRun(comp.name)}
          className="shrink-0 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
        >
          Run Research
        </button>
      </div>
      <ReasonBadge reason={comp.reason_flagged} />
      <p className="text-sm text-gray-600 leading-snug">{comp.one_line_summary}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Main component                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function HeadToHead({ data, related, onRunResearchFor }) {
  const h = data    ? (typeof data    === 'string' ? JSON.parse(data)    : data)    : null;
  const r = related ? (typeof related === 'string' ? JSON.parse(related) : related) : [];

  if (!h && r.length === 0) {
    return <div className="text-sm text-gray-400 py-16 text-center">No head-to-head data yet.</div>;
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* ── Feature matrix ─────────────────────────────────────────────── */}
      {h && (
        <div>
          {h.summary && (
            <div className="bg-white border border-gray-200 border-l-4 border-l-blue-500 rounded-xl shadow-sm p-5 mb-5">
              <p className="text-sm text-gray-700 leading-relaxed">{h.summary}</p>
            </div>
          )}

          {h.feature_matrix?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-[18%]">
                      Feature
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-[18%]">
                      Us
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-[18%]">
                      Them
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-[12%]">
                      Advantage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-[34%]">
                      Talking Point
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h.feature_matrix.map((row, i) => (
                    <FeatureRow key={i} row={row} index={i} />
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  Click any row with a talking point to expand it.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Also in this space ──────────────────────────────────────────── */}
      {r.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Also in This Space
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {r.map((comp, i) => (
              <RelatedCard key={i} comp={comp} onRun={onRunResearchFor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
