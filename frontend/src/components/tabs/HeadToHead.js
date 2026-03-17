import React from 'react';

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
    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
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

export default function HeadToHead({ data, related, onRunResearchFor }) {
  const h = data    ? (typeof data    === 'string' ? JSON.parse(data)    : data)    : null;
  const r = related ? (typeof related === 'string' ? JSON.parse(related) : related) : [];

  if (!h && r.length === 0) {
    return <div className="text-sm text-gray-400 py-16 text-center">No head-to-head data yet.</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
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
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/4">
                      Feature
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/4">
                      Us
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/4">
                      Them
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/4">
                      Advantage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {h.feature_matrix.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{row.feature}</td>
                      <td className="px-5 py-3.5 text-center text-gray-600 text-xs leading-snug">{row.us}</td>
                      <td className="px-5 py-3.5 text-center text-gray-600 text-xs leading-snug">{row.them}</td>
                      <td className="px-5 py-3.5 text-center">
                        <AdvBadge value={row.advantage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
