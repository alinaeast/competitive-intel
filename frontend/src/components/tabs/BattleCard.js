import React from 'react';

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function TagList({ items, color = 'indigo' }) {
  if (!items || items.length === 0) return <span className="text-gray-500 text-sm">—</span>;
  const colors = {
    indigo: 'bg-indigo-900/50 text-indigo-300 border-indigo-700',
    green:  'bg-green-900/50 text-green-300 border-green-700',
    red:    'bg-red-900/50 text-red-300 border-red-700',
    yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-xs px-2 py-1 rounded-md border ${colors[color] || colors.indigo}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function BattleCard({ data }) {
  if (!data) return <div className="text-sm text-gray-500">No battle card data.</div>;

  const d = typeof data === 'string' ? JSON.parse(data) : data;

  return (
    <div className="max-w-3xl space-y-1">
      <Section title="Positioning">
        <p className="text-sm text-gray-200 leading-relaxed">{d.positioning || '—'}</p>
      </Section>

      <Section title="Pricing">
        <p className="text-sm text-gray-200 leading-relaxed">{d.pricing || '—'}</p>
      </Section>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Strengths</h3>
          <TagList items={d.strengths} color="green" />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Weaknesses</h3>
          <TagList items={d.weaknesses} color="red" />
        </div>
      </div>

      <Section title="Objection Handling">
        {d.objection_handling && d.objection_handling.length > 0 ? (
          <ul className="space-y-2">
            {d.objection_handling.map((item, i) => (
              <li key={i} className="text-sm text-gray-200 flex gap-2">
                <span className="text-indigo-400 mt-0.5">▸</span>
                <span>{typeof item === 'object' ? `${item.objection}: ${item.response}` : item}</span>
              </li>
            ))}
          </ul>
        ) : <span className="text-gray-500 text-sm">—</span>}
      </Section>

      <Section title="Landmines">
        <TagList items={d.landmines} color="yellow" />
      </Section>
    </div>
  );
}
