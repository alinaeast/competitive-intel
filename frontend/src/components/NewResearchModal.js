import React, { useState } from 'react';

const MAX_COMPETITORS = 5;

function makeEntry() {
  return { id: Date.now() + Math.random(), name: '', website: '', notes: '' };
}

function CompetitorRow({ entry, index, showRemove, onChange, onRemove }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Competitor {index + 1}
        </span>
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none cursor-pointer"
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Competitor Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={entry.name}
          onChange={(e) => onChange(entry.id, 'name', e.target.value)}
          placeholder="e.g. Salesforce, HubSpot…"
          autoFocus={index === 0}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Competitor Website{' '}
          <span className="text-gray-600 font-normal text-xs">optional</span>
        </label>
        <input
          type="url"
          value={entry.website}
          onChange={(e) => onChange(entry.id, 'website', e.target.value)}
          placeholder="https://competitor.com"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Notes{' '}
          <span className="text-gray-600 font-normal text-xs">optional</span>
        </label>
        <input
          type="text"
          value={entry.notes}
          onChange={(e) => onChange(entry.id, 'notes', e.target.value)}
          placeholder="e.g. focus on pricing, recently raised Series B…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
        />
      </div>
    </div>
  );
}

export default function NewResearchModal({ onSubmit, onClose }) {
  const [entries, setEntries] = useState([makeEntry()]);
  const [loading, setLoading] = useState(false);

  const handleChange = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleAdd = () => {
    if (entries.length >= MAX_COMPETITORS) return;
    setEntries((prev) => [...prev, makeEntry()]);
  };

  const handleRemove = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const validEntries = entries.filter((e) => e.name.trim());
  const isValid = validEntries.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    await onSubmit(validEntries);
    setLoading(false);
  };

  const atMax = entries.length >= MAX_COMPETITORS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
        <div className="shrink-0 mb-5">
          <h2 className="text-lg font-semibold mb-1">New Competitor Research</h2>
          <p className="text-sm text-gray-400">
            Research up to {MAX_COMPETITORS} competitors at once. Each gets its own job.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-0 min-h-0 flex-1">
          {/* Scrollable competitor list */}
          <div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-1">
            {entries.map((entry, i) => (
              <CompetitorRow
                key={entry.id}
                entry={entry}
                index={i}
                showRemove={entries.length > 1}
                onChange={handleChange}
                onRemove={handleRemove}
              />
            ))}

            {/* Add another */}
            {!atMax && (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full py-2.5 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400 text-sm transition-colors cursor-pointer"
              >
                + Add Another Competitor
              </button>
            )}
            {atMax && (
              <p className="text-xs text-gray-600 text-center py-1">
                Maximum of {MAX_COMPETITORS} competitors per run.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-800 shrink-0">
            <span className="text-xs text-gray-600">
              {validEntries.length} competitor{validEntries.length !== 1 ? 's' : ''} queued
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !isValid}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                {loading
                  ? 'Queuing…'
                  : validEntries.length > 1
                  ? `Run Research (${validEntries.length})`
                  : 'Run Research'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
