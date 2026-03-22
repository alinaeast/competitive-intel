import React, { useState } from 'react';

const MAX_COMPETITORS = 5;
const MAX_EXTRA_URLS = 4;

function makeEntry() {
  return {
    id: Date.now() + Math.random(),
    name: '',
    product_name: '',
    product_url: '',
    additional_urls: [],
    notes: '',
  };
}

function UrlListEditor({ urls, onChange }) {
  const add = () => {
    if (urls.length >= MAX_EXTRA_URLS) return;
    onChange([...urls, '']);
  };
  const remove = (i) => onChange(urls.filter((_, idx) => idx !== i));
  const update = (i, val) => onChange(urls.map((u, idx) => (idx === i ? val : u)));

  return (
    <div className="flex flex-col gap-2">
      {urls.map((url, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none cursor-pointer px-1 shrink-0"
            aria-label="Remove URL"
          >
            ×
          </button>
        </div>
      ))}
      {urls.length < MAX_EXTRA_URLS && (
        <button
          type="button"
          onClick={add}
          className="text-sm text-indigo-400 hover:text-indigo-300 text-left transition-colors cursor-pointer"
        >
          + Add URL
        </button>
      )}
    </div>
  );
}

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600';
const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

function CompetitorRow({ entry, index, showRemove, onChange, onRemove }) {
  const set = (field, val) => onChange(entry.id, field, val);

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

      {/* Company Name */}
      <div>
        <label className={labelCls}>
          Company Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={entry.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Salesforce"
          autoFocus={index === 0}
          className={inputCls}
        />
      </div>

      {/* Product Name */}
      <div>
        <label className={labelCls}>
          Product Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={entry.product_name}
          onChange={(e) => set('product_name', e.target.value)}
          placeholder="e.g. Sales Cloud"
          className={inputCls}
        />
      </div>

      {/* Product URL */}
      <div>
        <label className={labelCls}>
          Product URL <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          value={entry.product_url}
          onChange={(e) => set('product_url', e.target.value)}
          placeholder="https://salesforce.com/sales"
          className={inputCls}
        />
      </div>

      {/* Additional URLs */}
      <div>
        <label className={labelCls}>
          Additional URLs{' '}
          <span className="text-gray-500 font-normal text-xs">optional · up to 4</span>
        </label>
        <UrlListEditor
          urls={entry.additional_urls}
          onChange={(val) => set('additional_urls', val)}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>
          Notes <span className="text-gray-500 font-normal text-xs">optional</span>
        </label>
        <textarea
          value={entry.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="e.g. focus on enterprise pricing, recently raised Series B…"
          className={`${inputCls} resize-none`}
        />
      </div>
    </div>
  );
}

export default function NewResearchModal({ onSubmit, onClose }) {
  const [entries, setEntries] = useState([makeEntry()]);
  const [loading, setLoading] = useState(false);

  const handleChange = (id, field, value) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleAdd = () => {
    if (entries.length >= MAX_COMPETITORS) return;
    setEntries((prev) => [...prev, makeEntry()]);
  };

  const handleRemove = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const validEntries = entries.filter(
    (e) => e.name.trim() && e.product_name.trim() && e.product_url.trim()
  );
  const isValid = validEntries.length > 0;
  const atMax = entries.length >= MAX_COMPETITORS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    await onSubmit(validEntries);
    setLoading(false);
  };

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
          {/* Scrollable list */}
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
