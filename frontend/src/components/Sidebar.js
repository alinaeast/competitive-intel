import React from 'react';

const STATUS_STYLES = {
  pending:  { dot: 'bg-yellow-400', label: 'Pending',  text: 'text-yellow-400' },
  running:  { dot: 'bg-blue-400 animate-pulse', label: 'Running', text: 'text-blue-400' },
  complete: { dot: 'bg-green-400', label: 'Complete', text: 'text-green-400' },
  failed:   { dot: 'bg-red-400', label: 'Failed', text: 'text-red-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={`flex items-center gap-1 text-xs ${s.text}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export default function Sidebar({ competitors, jobStatuses, selectedId, onSelect, loading }) {
  return (
    <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col overflow-hidden">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Competitors
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-6 text-sm text-gray-500">Loading…</div>
        )}
        {!loading && competitors.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-500">No competitors yet.</div>
        )}
        {competitors.map((c) => {
          const job = jobStatuses[c.id];
          const isSelected = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 border-l-2 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 bg-gray-800 text-white'
                  : 'border-transparent text-gray-300 hover:bg-gray-800/60'
              }`}
            >
              <span className="text-sm font-medium truncate">{c.name}</span>
              {job ? (
                <StatusBadge status={job.status} />
              ) : (
                <span className="text-xs text-gray-600">No jobs yet</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
