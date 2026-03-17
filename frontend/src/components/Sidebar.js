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

export default function Sidebar({ competitors, jobStatuses, selectedId, onSelect, onDelete, loading }) {
  const [cancelling, setCancelling]         = useState(null); // job id
  const [confirmingDelete, setConfirming]   = useState(null); // competitor id
  const [deleting, setDeleting]             = useState(null); // competitor id

  // ── cancel a pending/running job ─────────────────────────────────────────
  const handleCancel = async (e, job) => {
    e.stopPropagation();
    if (cancelling === job.id) return;
    setCancelling(job.id);
    await supabase.from('research_jobs').update({ status: 'failed' }).eq('id', job.id);
    setCancelling(null);
  };

  // ── delete competitor + all related rows ─────────────────────────────────
  const handleDeleteConfirm = async (competitorId) => {
    setDeleting(competitorId);
    // Delete child rows first to respect foreign-key order
    await supabase.from('research_outputs').delete().eq('competitor_id', competitorId);
    await supabase.from('research_jobs').delete().eq('competitor_id', competitorId);
    await supabase.from('competitors').delete().eq('id', competitorId);
    setDeleting(null);
    setConfirming(null);
    onDelete(competitorId);
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
          const job          = jobStatuses[c.id];
          const isSelected   = c.id === selectedId;
          const isCancellable = job && CANCELLABLE.has(job.status);
          const isCancelling  = job && cancelling === job.id;
          const isConfirming  = confirmingDelete === c.id;
          const isDeleting    = deleting === c.id;

          // ── inline delete-confirmation row ──────────────────────────────
          if (isConfirming) {
            return (
              <div
                key={c.id}
                className={`border-l-2 border-red-500 bg-gray-800 px-3 py-3`}
              >
                <p className="text-xs text-gray-300 mb-2 truncate">
                  Delete <span className="font-semibold text-white">{c.name}</span>?
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  This removes all jobs and research data.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={isDeleting}
                    className="flex-1 py-1 text-xs rounded border border-gray-600 text-gray-400 hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteConfirm(c.id)}
                    disabled={isDeleting}
                    className="flex-1 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    {isDeleting ? (
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin block" />
                    ) : 'Delete'}
                  </button>
                </div>
              </div>
            );
          }

          // ── normal row ──────────────────────────────────────────────────
          return (
            <div
              key={c.id}
              className={`group relative flex items-center border-l-2 transition-colors ${
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
                {/* extra right padding so text doesn't slide under icons */}
                <span className="text-sm font-medium truncate pr-10">{c.name}</span>
                {job ? (
                  <StatusBadge status={job.status} />
                ) : (
                  <span className="text-xs text-gray-600">No jobs yet</span>
                )}
              </button>

              {/* Icon group — visible on row hover */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5
                              opacity-0 group-hover:opacity-100 transition-opacity">

                {/* Trash — always shown on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(c.id); }}
                  title="Delete competitor"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Cancel ✕ — only for pending/running */}
                {isCancellable && (
                  <button
                    onClick={(e) => handleCancel(e, job)}
                    disabled={isCancelling}
                    title="Cancel job"
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-yellow-400 hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? (
                      <span className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <span className="text-xs leading-none">✕</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
