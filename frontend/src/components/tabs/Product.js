import React, { useState, useMemo } from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Feature Matrix ────────────────────────────────────────────────────────────

const EDGE_CONFIG = {
  us:      { label: 'We Win',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  them:    { label: 'They Win', cls: 'bg-red-50 text-red-700 border-red-200' },
  neutral: { label: 'Neutral',  cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

function EdgeBadge({ edge }) {
  const cfg = EDGE_CONFIG[edge] || EDGE_CONFIG.neutral;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls} shrink-0`}>
      {cfg.label}
    </span>
  );
}

function FeatureRow({ row, ourLabel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-sm"
      >
        <span className="font-medium text-gray-800">{row.feature}</span>
        <span className="text-gray-600">{row.our_value}</span>
        <span className="text-gray-600">{row.their_value}</span>
        <EdgeBadge edge={row.edge} />
        <span className={`text-gray-400 transition-transform text-xs ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 bg-indigo-50/50 border-t border-indigo-100 grid sm:grid-cols-2 gap-4 pt-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 mb-1.5">{ourLabel}</div>
            <p className="text-sm text-gray-700 leading-relaxed">{row.our_detail}</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Them</div>
            <p className="text-sm text-gray-700 leading-relaxed">{row.their_detail}</p>
          </div>
          {(row.customer_quotes || []).length > 0 && (
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Customer Quotes</div>
              <div className="flex flex-col gap-2">
                {row.customer_quotes.map((q, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                    <p className="text-sm text-gray-700 italic">"{q.quote}"</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <SourceBadge label={q.source_label} url={q.source_url} />
                      {q.date && <span className="text-[11px] text-gray-400">{q.date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(row.source_label || row.source_url) && (
            <div className="sm:col-span-2 flex justify-end">
              <SourceBadge label={row.source_label} url={row.source_url} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'us',      label: 'We Win' },
  { key: 'them',    label: 'They Win' },
  { key: 'neutral', label: 'Neutral' },
];

function FeatureMatrix({ rows, ourLabel }) {
  const [filter, setFilter] = useState('all');
  const allRows = useMemo(() => rows || [], [rows]);

  const counts = useMemo(() => ({
    all:     allRows.length,
    us:      allRows.filter((r) => r.edge === 'us').length,
    them:    allRows.filter((r) => r.edge === 'them').length,
    neutral: allRows.filter((r) => r.edge === 'neutral').length,
  }), [allRows]);

  const visible = filter === 'all' ? allRows : allRows.filter((r) => r.edge === filter);

  return (
    <section>
      <SectionHeader title="Feature Comparison" subtitle="Click any row to expand details and customer quotes">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {f.label} {counts[f.key] > 0 && <span className="opacity-60 ml-0.5">({counts[f.key]})</span>}
            </button>
          ))}
        </div>
      </SectionHeader>

      {visible.length === 0 ? (
        <EmptySection message="No features match this filter." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Feature</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">{ourLabel}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Them</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Edge</div>
            <div />
          </div>
          {visible.map((row, i) => (
            <FeatureRow key={i} row={row} ourLabel={ourLabel} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Product Gaps ──────────────────────────────────────────────────────────────

function ProductGaps({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Product Gaps" subtitle="Limitations sourced from official documentation" />
      {list.length === 0 ? (
        <EmptySection message="No documented product gaps found." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((item, i) => (
            <Card key={i} className="p-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-gray-800">{item.gap}</p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                {item.date && <span className="text-[11px] text-gray-400">{item.date}</span>}
                <SourceBadge label={item.source_label} url={item.source_url} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Product tab ───────────────────────────────────────────────────────────────

export default function Product({ data, ourLabel = 'Our Product' }) {
  if (!data) return <EmptySection message="Run research to see product data." />;
  return (
    <div className="flex flex-col gap-8">
      <FeatureMatrix rows={data.feature_matrix} ourLabel={ourLabel} />
      <ProductGaps   items={data.product_gaps} />
    </div>
  );
}
