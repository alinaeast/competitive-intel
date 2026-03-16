import React from 'react';

const TAG_STYLES = {
  funding:  { bg: 'bg-purple-900/50 border-purple-700 text-purple-300', label: 'Funding' },
  launch:   { bg: 'bg-blue-900/50 border-blue-700 text-blue-300', label: 'Launch' },
  pricing:  { bg: 'bg-yellow-900/50 border-yellow-700 text-yellow-300', label: 'Pricing' },
  hire:     { bg: 'bg-green-900/50 border-green-700 text-green-300', label: 'Hire' },
  press:    { bg: 'bg-red-900/50 border-red-700 text-red-300', label: 'Press' },
};

function TriggerTag({ type }) {
  const s = TAG_STYLES[type?.toLowerCase()] || { bg: 'bg-gray-800 border-gray-700 text-gray-400', label: type };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${s.bg}`}>
      {s.label}
    </span>
  );
}

export default function CompetitiveTriggers({ data }) {
  if (!data) return <div className="text-sm text-gray-500">No trigger data.</div>;

  const d = typeof data === 'string' ? JSON.parse(data) : data;

  // Normalize: data can be an object with keys (recent_funding, product_launches…) or array
  let events = [];
  if (Array.isArray(d)) {
    events = d;
  } else {
    const typeMap = {
      recent_funding: 'funding',
      product_launches: 'launch',
      pricing_changes: 'pricing',
      key_hires: 'hire',
      bad_press: 'press',
    };
    Object.entries(typeMap).forEach(([key, type]) => {
      const items = d[key];
      if (!items) return;
      (Array.isArray(items) ? items : [items]).forEach((item) => {
        if (!item) return;
        events.push({ type, date: item.date, summary: item.summary });
      });
    });
  }

  // Sort newest first
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  if (events.length === 0) {
    return <div className="text-sm text-gray-500">No significant triggers found.</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="relative border-l border-gray-700 ml-3 space-y-6">
        {events.map((e, i) => (
          <div key={i} className="pl-6 relative">
            <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-gray-700 border-2 border-gray-500" />
            <div className="flex items-center gap-2 mb-1">
              <TriggerTag type={e.type} />
              {e.date && (
                <span className="text-xs text-gray-500">
                  {new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{e.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
