import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const MAX_EXTRA_URLS = 4;

const CONFIG_KEYS = ['company_name', 'product_name', 'product_url', 'product_additional_urls', 'product_notes'];

function parseSaved(data) {
  const m = Object.fromEntries((data || []).map((d) => [d.key, d.value]));
  return {
    company_name: m.company_name || '',
    product_name: m.product_name || '',
    product_url: m.product_url || '',
    additional_urls: m.product_additional_urls ? JSON.parse(m.product_additional_urls) : [],
    notes: m.product_notes || '',
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
const readCls =
  'w-full px-3 py-2 text-sm text-gray-200 bg-gray-800/40 rounded-lg border border-gray-700/50 min-h-[38px]';
const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

export default function SettingsModal({ onClose }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(null); // null = loading
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('config').select('key, value').in('key', CONFIG_KEYS);
      const parsed = parseSaved(data);
      setSaved(parsed);
      setDraft(parsed);
      // Auto-open in edit mode if nothing has been configured yet
      if (!parsed.company_name && !parsed.product_name) setEditing(true);
    };
    load();
  }, []);

  const set = (field, val) => setDraft((prev) => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    const entries = [
      { key: 'company_name', value: draft.company_name.trim() },
      { key: 'product_name', value: draft.product_name.trim() },
      { key: 'product_url', value: draft.product_url.trim() },
      {
        key: 'product_additional_urls',
        value: JSON.stringify(draft.additional_urls.filter((u) => u.trim())),
      },
      { key: 'product_notes', value: draft.notes.trim() },
    ];
    await supabase.from('config').upsert(entries, { onConflict: 'key' });
    const next = { ...draft, additional_urls: draft.additional_urls.filter((u) => u.trim()) };
    setSaved(next);
    setDraft(next);
    setSaving(false);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(saved);
    setEditing(false);
  };

  const canSave =
    !saving &&
    draft.company_name?.trim() &&
    draft.product_name?.trim() &&
    draft.product_url?.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold">My Product</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Claude uses these details as the source of truth when generating competitive analysis.
            </p>
          </div>
          {!editing && saved && (
            <button
              onClick={() => setEditing(true)}
              className="ml-4 shrink-0 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700 rounded-md px-2.5 py-1 transition-colors cursor-pointer"
            >
              Edit
            </button>
          )}
        </div>

        {saveFlash && (
          <div className="mt-3 rounded-lg bg-green-900/40 border border-green-700 text-green-300 text-sm px-3 py-2">
            ✓ Saved
          </div>
        )}

        {/* Fields */}
        {saved === null ? (
          <div className="mt-8 text-center text-sm text-gray-500">Loading…</div>
        ) : (
          <div className="flex flex-col gap-4 mt-5">
            {/* Company Name */}
            <div>
              <label className={labelCls}>
                Company Name {editing && <span className="text-red-400">*</span>}
              </label>
              {editing ? (
                <input
                  type="text"
                  value={draft.company_name}
                  onChange={(e) => set('company_name', e.target.value)}
                  placeholder="e.g. Acme Corp"
                  autoFocus
                  className={inputCls}
                />
              ) : (
                <div className={readCls}>
                  {saved.company_name || <span className="text-gray-500 italic">Not set</span>}
                </div>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className={labelCls}>
                Product Name {editing && <span className="text-red-400">*</span>}
              </label>
              {editing ? (
                <input
                  type="text"
                  value={draft.product_name}
                  onChange={(e) => set('product_name', e.target.value)}
                  placeholder="e.g. Acme Sales Platform"
                  className={inputCls}
                />
              ) : (
                <div className={readCls}>
                  {saved.product_name || <span className="text-gray-500 italic">Not set</span>}
                </div>
              )}
            </div>

            {/* Product URL */}
            <div>
              <label className={labelCls}>
                Product URL {editing && <span className="text-red-400">*</span>}
              </label>
              {editing ? (
                <input
                  type="url"
                  value={draft.product_url}
                  onChange={(e) => set('product_url', e.target.value)}
                  placeholder="https://acme.com"
                  className={inputCls}
                />
              ) : (
                <div className={readCls}>
                  {saved.product_url ? (
                    <a
                      href={saved.product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      {saved.product_url}
                    </a>
                  ) : (
                    <span className="text-gray-500 italic">Not set</span>
                  )}
                </div>
              )}
            </div>

            {/* Additional URLs */}
            <div>
              <label className={labelCls}>
                Additional URLs{' '}
                <span className="text-gray-500 font-normal text-xs">
                  {editing ? 'optional · up to 4' : 'optional'}
                </span>
              </label>
              {editing ? (
                <UrlListEditor
                  urls={draft.additional_urls}
                  onChange={(val) => set('additional_urls', val)}
                />
              ) : saved.additional_urls?.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {saved.additional_urls.map((u, i) => (
                    <div key={i} className={readCls}>
                      <a
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline"
                      >
                        {u}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={readCls}>
                  <span className="text-gray-500 italic">None added</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={labelCls}>
                Notes{' '}
                <span className="text-gray-500 font-normal text-xs">optional</span>
              </label>
              {editing ? (
                <textarea
                  value={draft.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                  placeholder="e.g. B2B SaaS for mid-market sales teams, primary differentiator is ease of use vs. Salesforce…"
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <div className={`${readCls} whitespace-pre-wrap`}>
                  {saved.notes || <span className="text-gray-500 italic">None</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
