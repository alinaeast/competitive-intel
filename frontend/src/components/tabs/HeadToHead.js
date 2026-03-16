import React from 'react';

const ADV_STYLES = {
  us:      { cls: 'bg-green-900/40 text-green-300 border-green-700', label: 'Us' },
  them:    { cls: 'bg-red-900/40 text-red-300 border-red-700', label: 'Them' },
  neutral: { cls: 'bg-gray-800 text-gray-400 border-gray-700', label: 'Neutral' },
};

function AdvBadge({ value }) {
  const v = value?.toLowerCase() || 'neutral';
  const s = ADV_STYLES[v] || ADV_STYLES.neutral;
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function RelatedCard({ comp, onRun }) {
  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{comp.name}</p>
          {comp.website && (
            <a href={comp.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">
              {comp.website}
            </a>
          )}
        </div>
        <button
          onClick={() => onRun(comp.name)}
          className="shrink-0 px-3 py-1 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer"
        >
          Run Research
        </button>
      </div>
      {comp.reason_flagged && (
        <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 self-start">
          {comp.reason_flagged}
        </span>
      )}
      <p className="text-sm text-gray-300 leading-snug">{comp.one_line_summary}</p>
    </div>
  );
}

export default function HeadToHead({ data, related, onRunResearchFor }) {
  const h = data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
  const r = related ? (typeof related === 'string' ? JSON.parse(related) : related) : [];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Feature matrix */}
      {h && (
        <div>
          {h.summary && (
            <p className="text-sm text-gray-300 leading-relaxed mb-4">{h.summary}</p>
          )}
          {h.feature_matrix && h.feature_matrix.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-4 py-2.5 text-left">Feature</th>
                    <th className="px-4 py-2.5 text-center">Us</th>
                    <th className="px-4 py-2.5 text-center">Them</th>
                    <th className="px-4 py-2.5 text-center">Advantage</th>
                  </tr>
                </thead>
                <tbody>
                  {h.feature_matrix.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t border-gray-800 ${i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-200">{row.feature}</td>
                      <td className="px-4 py-2.5 text-center text-gray-300">{row.us}</td>
                      <td className="px-4 py-2.5 text-center text-gray-300">{row.them}</td>
                      <td className="px-4 py-2.5 text-center">
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

      {/* Related competitors */}
      {r.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            Related Competitors
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {r.map((comp, i) => (
              <RelatedCard key={i} comp={comp} onRun={onRunResearchFor} />
            ))}
          </div>
        </div>
      )}

      {!h && r.length === 0 && (
        <div className="text-sm text-gray-500">No head-to-head data.</div>
      )}
    </div>
  );
}
