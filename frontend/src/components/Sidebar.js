import React, { useState } from 'react';
import { supabase } from '../supabase';

const STATUS_STYLES = {
  pending:  { dot: 'bg-yellow-400', label: 'Pending',  text: 'text-yellow-400' },
  running:  { dot: 'bg-blue-400 animate-pulse', label: 'Running', text: 'text-blue-400' },
  complete: { dot: 'bg-green-400', label: 'Complete', text: 'text-green-400' },
  failed:   { dot: 'bg-red-400', label: 'Failed', text: 'text-red-400' },
};

const CANCELLABLE = new Set(['pending', 'running']);

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
  const [cancelling, setCancelling] = useState(null); // job id being cancelled

  const handleCancel = async (e, job) => {
    e.stopPropagation(); // don't select the competitor row
    if (cancelling === job.id) return;
    setCancelling(job.id);
    await supabase
      .from('research_jobs')
      .update({ status: 'failed' })
      .eq('id', job.id);
    setCancelling(null);
  };

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
          const isCancellable = job && CANCELLABLE.has(job.status);
          const isCancelling = job && cancelling === job.id;

          return (
            <div
              key={c.id}
              className={`relative flex items-center border-l-2 transition-colors ${
                isSelected
                  ? 'border-indigo-500 bg-gray-800'
                  : 'border-transparent hover:bg-gray-800/60'
              }`}
            >
              {/* Selectable area */}
              <button
                onClick={() => onSelect(c.id)}
                className={`flex-1 text-left px-4 py-3 flex flex-col gap-0.5 cursor-pointer min-w-0 ${
                  isSelected ? 'text-white' : 'text-gray-300'
                }`}
              >
                <span className="text-sm font-medium truncate pr-5">{c.name}</span>
                {job ? (
                  <StatusBadge status={job.status} />
                ) : (
                  <span className="text-xs text-gray-600">No jobs yet</span>
                )}
              </button>

              {/* Cancel button — only for pending/running */}
              {isCancellable && (
                <button
                  onClick={(e) => handleCancel(e, job)}
                  disabled={isCancelling}
                  title="Cancel job"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCancelling ? (
                    <span className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    <span className="text-xs leading-none">✕</span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
