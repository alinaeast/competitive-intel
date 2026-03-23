import React from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Company Snapshot ─────────────────────────────────────────────────────────

function CompanySnapshot({ data }) {
  if (!data) return null;
  const stats = [
    { label: 'Founded',           value: data.founded },
    { label: 'Employees',         value: data.employees },
    { label: 'Funding / Revenue', value: data.funding_arr },
    { label: 'HQ',                value: data.hq },
  ].filter((s) => s.value);

  return (
    <section>
      <SectionHeader title="Company Snapshot" />
      <Card className="p-5">
        {data.one_liner && (
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{data.one_liner}</p>
        )}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{s.label}</div>
                <div className="text-sm font-medium text-gray-800">{s.value}</div>
              </div>
            ))}
          </div>
        )}
        {(data.source_label || data.source_url) && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <SourceBadge label={data.source_label} url={data.source_url} />
          </div>
        )}
      </Card>
    </section>
  );
}

// ── Product Focus ─────────────────────────────────────────────────────────────

function ProductFocus({ data }) {
  if (!data) return null;
  return (
    <section>
      <SectionHeader title="Product Focus" subtitle="What this product does and who it's for" />
      <Card className="p-5">

        {/* 1. One-liner product description — full width at top */}
        {data.product_description && (
          <p className="text-sm font-medium text-gray-800 mb-5 pb-4 border-b border-gray-100 leading-relaxed">
            {data.product_description}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-5">

          {/* 2. Target customer */}
          {data.target_customer && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Target Customer</div>
              <p className="text-sm text-gray-700">{data.target_customer}</p>
            </div>
          )}

          {/* 3. Problem it solves */}
          {data.problem_solved && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Problem Solved</div>
              <p className="text-sm text-gray-700">{data.problem_solved}</p>
            </div>
          )}

          {/* 4. Key differentiators — spans full width */}
          {data.key_differentiators?.length > 0 && (
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Key Differentiators</div>
              <ul className="flex flex-col gap-1.5">
                {data.key_differentiators.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(data.source_label || data.source_url) && (
            <div className="sm:col-span-2 pt-3 border-t border-gray-100 flex justify-end">
              <SourceBadge label={data.source_label} url={data.source_url} />
            </div>
          )}

        </div>
      </Card>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection({ data }) {
  if (!data) return null;
  const tiers = data.tiers || [];
  return (
    <section>
      <SectionHeader title="Pricing" />
      {tiers.length === 0 ? (
        <EmptySection message="No pricing data found." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">Tier</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">Price</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">What's Included</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">Limitations</th>
                <th className="px-4 py-3 border-b border-gray-200" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers.map((t, i) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    t.includes_product
                      ? 'bg-indigo-50/60 hover:bg-indigo-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span>{t.tier}</span>
                    {t.includes_product && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        Includes product
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-indigo-700">{t.price}</td>
                  <td className="px-4 py-3 text-gray-600">{t.included || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.limitations || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <SourceBadge label={t.source_label} url={t.source_url} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

export default function Overview({ data }) {
  if (!data) {
    return <EmptySection message="Run research to see the overview." />;
  }
  return (
    <div className="flex flex-col gap-8">
      <CompanySnapshot data={data.company_snapshot} />
      <ProductFocus    data={data.product_focus} />
      <PricingSection  data={data.pricing} />
    </div>
  );
}
