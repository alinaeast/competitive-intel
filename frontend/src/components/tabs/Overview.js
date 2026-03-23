import React from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Company Snapshot ─────────────────────────────────────────────────────────

function CompanySnapshot({ data }) {
  if (!data) return null;
  const stats = [
    { label: 'Founded',       value: data.founded },
    { label: 'Employees',     value: data.employees },
    { label: 'Funding / ARR', value: data.funding_arr },
    { label: 'HQ',            value: data.hq },
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
      <Card className="p-5 grid sm:grid-cols-2 gap-5">
        {data.core_use_case && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Core Use Case</div>
            <p className="text-sm text-gray-700">{data.core_use_case}</p>
          </div>
        )}
        {data.target_customer && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Target Customer</div>
            <p className="text-sm text-gray-700">{data.target_customer}</p>
          </div>
        )}
        {data.problem_solved && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Problem Solved</div>
            <p className="text-sm text-gray-700">{data.problem_solved}</p>
          </div>
        )}
        {data.key_differentiators?.length > 0 && (
          <div>
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
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{t.tier}</td>
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

export default function Overview({ data, onRunResearch }) {
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
