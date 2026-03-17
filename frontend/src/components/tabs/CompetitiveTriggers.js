import React from 'react';

const EVENT_CONFIG = {
  funding: {
    icon: '💰',
    label: 'Funding',
    dot:   'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  launch: {
    icon: '🚀',
    label: 'Launch',
    dot:   'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  pricing: {
    icon: '💲',
    label: 'Pricing',
    dot:   'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  hire: {
    icon: '👤',
    label: 'Hire',
    dot:   'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  press: {
    icon: '📰',
    label: 'Press',
    dot:   'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
};

const FALLBACK = {
  icon: '📌', label: 'Event', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200',
};

function EventBadge({ type }) {
  const cfg = EVENT_CONFIG[type?.toLowerCase()] || FALLBACK;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

export default function CompetitiveTriggers({ data }) {
  if (!data) {
    return <div className="text-sm text-gray-400 py-16 text-center">No trigger data.</div>;
  }

  const d = typeof data === 'string' ? JSON.parse(data) : data;

  // Normalise object → flat event array
  let events = [];
  if (Array.isArray(d)) {
    events = d;
  } else {
    const typeMap = {
      recent_funding:  'funding',
      product_launches:'launch',
      pricing_changes: 'pricing',
      key_hires:       'hire',
      bad_press:       'press',
    };
    Object.entries(typeMap).forEach(([key, type]) => {
      const items = d[key];
      if (!items) return;
      (Array.isArray(items) ? items : [items]).forEach((item) => {
        if (!item) return;
        events.push({
          type,
          date:         item.date,
          summary:      item.summary,
          source_label: item.source_label || null,
          source_url:   item.source_url   || null,
        });
      });
    });
  }

  // Newest first
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  if (events.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-16 text-center">No significant triggers found.</div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="relative">
        {/* Vertical timeline spine */}
        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200" />

        <div className="space-y-5">
          {events.map((e, i) => {
            const cfg = EVENT_CONFIG[e.type?.toLowerCase()] || FALLBACK;
            const dateStr = e.date
              ? new Date(e.date).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })
              : null;

            // Source badge
            const sourceEl = e.source_label ? (
              e.source_url ? (
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="no-underline inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5
                             rounded-full bg-gray-100 text-gray-500 border border-gray-200
                             hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  via {e.source_label}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5
                                 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  via {e.source_label}
                </span>
              )
            ) : null;

            return (
              <div key={i} className="relative flex gap-5 pl-10">
                {/* Timeline dot */}
                <span
                  className={`absolute left-[9px] top-[18px] w-3 h-3 rounded-full border-2 border-white shadow-sm ${cfg.dot}`}
                />

                {/* Event card */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <EventBadge type={e.type} />
                    {dateStr && (
                      <span className="text-xs text-gray-400 font-medium">{dateStr}</span>
                    )}
                    {sourceEl}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{e.summary}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
