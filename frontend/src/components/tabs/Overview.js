import React from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Company Snapshot ──────────────────────────────────────────────────────────
// Company-level information only: founding year, headcount, HQ,
// revenue / funding, and one sentence on what the company does.

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
// Reverted to original structure with two additions:
//   1. product_description — one sentence at the top of the card
//   2. launched — launch / GA date; shows "No data found" when the agent
//      returned null (key present but empty)

function ProductFocus({ data }) {
  if (!data) return null;
  return (
    <section>
      <SectionHeader title="Product Focus" subtitle="What this product does and who it's for" />
      <Card className="p-5">
        {/* One-sentence product description — full-width intro at the top */}
        {data.product_description && (
          <p className="text-sm font-medium text-gray-800 leading-relaxed mb-4 pb-4 border-b border-gray-100">
            {data.product_description}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Launch date — shown whenever the key exists; "No data found" when null */}
          {'launched' in data && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Launched</div>
              <p className="text-sm text-gray-700">{data.launched || 'No data found'}</p>
            </div>
          )}

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
      <SectionHeader title="Pricing">
        {data.recent_change && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Recent Change{data.recent_change_date ? ` · ${data.recent_change_date}` : ''}
          </span>
        )}
      </SectionHeader>

      {data.recent_change && data.recent_change_note && (
        <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{data.recent_change_note}</span>
        </div>
      )}

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

// ── Related Competitors ───────────────────────────────────────────────────────

const TAG_STYLES = {
  'closest substitute': 'bg-orange-50 text-orange-700 border-orange-200',
  'emerging threat':    'bg-red-50 text-red-700 border-red-200',
};

function RelatedCompetitors({ competitors, onRunResearch }) {
  const items = competitors || [];
  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Also in This Space" subtitle="Other competitors worth watching" />
      <div className="grid sm:grid-cols-3 gap-4">
        {items.map((c, i) => (
          <Card key={i} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                {c.product_name && (
                  <div className="text-xs text-gray-500 mt-0.5">{c.product_name}</div>
                )}
              </div>
              <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TAG_STYLES[c.tag] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {c.tag}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed flex-1">{c.summary}</p>
            <button
              onClick={() => onRunResearch && onRunResearch(c.name, c.website)}
              className="w-full text-xs font-medium py-1.5 rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Run full research →
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
// Section order (competitive triggers removed):
//   Company Snapshot → Product Focus → Pricing → Also in This Space

export default function Overview({ data, onRunResearch }) {
  if (!data) {
    return <EmptySection message="Run research to see the overview." />;
  }
  return (
    <div className="flex flex-col gap-8">
      <CompanySnapshot data={data.company_snapshot} />
      <ProductFocus    data={data.product_focus} />
      <PricingSection  data={data.pricing} />
      <RelatedCompetitors competitors={data.related_competitors} onRunResearch={onRunResearch} />
    </div>
  );
}
