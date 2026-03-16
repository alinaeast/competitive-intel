import React, { useState, useEffect } from 'react';

const AGENT_URL = process.env.REACT_APP_AGENT_URL || 'http://localhost:3001';

export default function SettingsModal({ onClose }) {
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${AGENT_URL}/api/config/product-description`)
      .then((r) => r.json())
      .then((d) => setDescription(d.product_description || ''))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`${AGENT_URL}/api/config/product-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-1">Product Settings</h2>
        <p className="text-sm text-gray-400 mb-4">
          Describe your product in one paragraph. Claude will use this for head-to-head comparisons.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="e.g. We're a B2B SaaS platform that helps sales teams automate outreach and CRM hygiene…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 resize-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium transition-colors cursor-pointer"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
