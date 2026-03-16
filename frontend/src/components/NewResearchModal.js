import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function NewResearchModal({ onSubmit, onClose }) {
  const [competitorName, setCompetitorName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  // Pre-fill saved config values so returning users don't re-enter their product details
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('config')
        .select('key, value')
        .in('key', ['company_name', 'company_url', 'product_name', 'product_description']);
      if (data) {
        const m = Object.fromEntries(data.map((d) => [d.key, d.value]));
        setCompanyName(m.company_name || '');
        setCompanyUrl(m.company_url || '');
        setProductName(m.product_name || '');
        setProductDescription(m.product_description || '');
      }
      setConfigLoading(false);
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!competitorName.trim() || !companyName.trim() || !companyUrl.trim()) return;
    setLoading(true);

    // Persist all four config values to Supabase
    const entries = [
      { key: 'company_name', value: companyName.trim() },
      { key: 'company_url', value: companyUrl.trim() },
      { key: 'product_name', value: productName.trim() },
      { key: 'product_description', value: productDescription.trim() },
    ];
    await supabase.from('config').upsert(entries, { onConflict: 'key' });

    await onSubmit({ competitorName: competitorName.trim() });
    setLoading(false);
  };

  const isValid = competitorName.trim() && companyName.trim() && companyUrl.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">New Competitor Research</h2>
        <p className="text-sm text-gray-400 mb-5">
          Enter the competitor to research, plus your product details for accurate comparisons.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* ── Competitor ── */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Competitor Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              placeholder="e.g. Salesforce, HubSpot…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
            />
          </div>

          {/* ── Our product ── */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Your Product
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  disabled={configLoading}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Company Website <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://acme.com"
                  disabled={configLoading}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Product Name{' '}
                  <span className="text-gray-600 font-normal text-xs">optional</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Acme Sales Platform"
                  disabled={configLoading}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Product Description{' '}
                  <span className="text-gray-600 font-normal text-xs">optional</span>
                </label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe your product and target market…"
                  disabled={configLoading}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600 resize-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {loading ? 'Starting…' : 'Run Research'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
