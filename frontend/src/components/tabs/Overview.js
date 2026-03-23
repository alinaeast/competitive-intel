import React from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Company Snapshot ──────────────────────────────────────────────────────────

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

// ── Product Overview ──────────────────────────────────────────────────────────

function ProductOverview({ data }) {
  if (!data) return null;
  return (
    <section>
      <SectionHeader title="Product Overview" />
      <Card className="p-5">
        {data.one_sentence && (
          <p className="text-base font-medium text-gray-800 leading-relaxed mb-4">{data.one_sentence}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {data.problem_solved && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Problem Solved</div>
              <p className="text-sm text-gray-700 leading-relaxed">{data.problem_solved}</p>
            </div>
          )}
          {data.product_category && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Product Category</div>
              <p className="text-sm font-medium text-gray-800">{data.product_category}</p>
            </div>
          )}
        </div>
        {(data.source_label || data.source_url) && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <SourceBadge label={data.source_label} url={data.source_url} />
          </div>
        )}
      </Card>
    </section>
  );
}

// ── Product Launch ────────────────────────────────────────────────────────────

function ProductLaunch({ data }) {
  const milestones = data?.milestones || [];
  const hasInfo = data?.launched || data?.ga_date || milestones.length > 0;

  return (
    <section>
      <SectionHeader title="Product Launch" subtitle="When it launched and major milestones since" />
      {!hasInfo ? (
        <EmptySection message="No launch data found." />
      ) : (
        <Card className="p-5 flex flex-col gap-4">
          {(data.launched || data.ga_date) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.launched && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Launched</div>
                  <p className="text-sm font-medium text-gray-800">{data.launched}</p>
                </div>
              )}
              {data.ga_date && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Generally Available</div>
                  <p className="text-sm font-medium text-gray-800">{data.ga_date}</p>
                </div>
              )}
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Major Milestones</div>
              <div className="flex flex-col gap-0">
                {milestones.map((m, i) => (
                  <div key={i} className="flex gap-4 group">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1 shrink-0" />
                      {i < milestones.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    {/* Content */}
                    <div className="pb-4 flex-1 min-w-0">
                      {m.date && (
                        <div className="text-xs text-gray-400 font-mono mb-0.5">{m.date}</div>
                      )}
                      <p className="text-sm text-gray-700 leading-relaxed">{m.milestone}</p>
                      {(m.source_label || m.source_url) && (
                        <div className="mt-1.5">
                          <SourceBadge label={m.source_label} url={m.source_url} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.source_label || data.source_url) && (
            <div className="pt-1 border-t border-gray-100 flex justify-end">
              <SourceBadge label={data.source_label} url={data.source_url} />
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

// ── Target Customer ───────────────────────────────────────────────────────────

function TargetCustomer({ data }) {
  if (!data) return null;
  const useCases = data.use_cases || [];

  return (
    <section>
      <SectionHeader title="Target Customer" subtitle="Who buys this product, what they use it for, and when they evaluate it" />
      <Card className="p-5 flex flex-col gap-5">
        {(data.company_size || data.company_type) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.company_size && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Company Size</div>
                <p className="text-sm text-gray-700">{data.company_size}</p>
              </div>
            )}
            {data.company_type && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Company Type</div>
                <p className="text-sm text-gray-700">{data.company_type}</p>
              </div>
            )}
          </div>
        )}

        {useCases.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Common Use Cases</div>
            <ul className="flex flex-col gap-1.5">
              {useCases.map((uc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                  {uc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.evaluation_context && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Evaluation Context</div>
            <p className="text-sm text-gray-700 leading-relaxed">{data.evaluation_context}</p>
          </div>
        )}

        {(data.source_label || data.source_url) && (
          <div className="pt-3 border-t border-gray-100 flex justify-end">
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

// ── Key Differentiators ───────────────────────────────────────────────────────

function KeyDifferentiators({ data }) {
  if (!data) return null;
  const diffs = data.key_differentiators || [];

  return (
    <section>
      <SectionHeader title="Key Differentiators" subtitle="What sets this product apart from alternatives" />
      {diffs.length === 0 ? (
        <EmptySection message="No differentiators data found." />
      ) : (
        <Card className="p-5">
          <ul className="flex flex-col gap-2">
            {diffs.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {d}
              </li>
            ))}
          </ul>
          {(data.source_label || data.source_url) && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <SourceBadge label={data.source_label} url={data.source_url} />
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

export default function Overview({ data }) {
  if (!data) {
    return <EmptySection message="Run research to see the overview." />;
  }
  return (
    <div className="flex flex-col gap-8">
      <CompanySnapshot    data={data.company_snapshot} />
      <ProductOverview    data={data.product_overview} />
      <ProductLaunch      data={data.product_launch} />
      <TargetCustomer     data={data.target_customer} />
      <PricingSection     data={data.pricing} />
      <KeyDifferentiators data={data.product_focus} />
    </div>
  );
}
