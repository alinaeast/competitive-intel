import React, { useState } from 'react';

function SectionLabel({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
      {children}
    </h3>
  );
}

function Empty() {
  return <span className="text-gray-400 text-sm">—</span>;
}

/* ── Positioning ─── quote card with indigo left border ─────────────────── */
function PositioningCard({ text }) {
  if (!text) return <Empty />;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 border-l-indigo-500">
      <p className="text-gray-700 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

/* ── Pricing ─── styled card ─────────────────────────────────────────────── */
function PricingCard({ text }) {
  if (!text) return <Empty />;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm">💲</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Pricing Overview
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{text}</p>
      </div>
    </div>
  );
}

/* ── Strength / weakness chips ───────────────────────────────────────────── */
function Chip({ label, type }) {
  const styles = {
    strength: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    weakness: 'bg-red-50 text-red-700 border-red-200',
  };
  const icon = type === 'strength' ? '✓' : '✗';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${styles[type]}`}
    >
      <span className="font-bold">{icon}</span>
      {label}
    </span>
  );
}

/* ── Objection accordion item ────────────────────────────────────────────── */
function AccordionItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const objection = typeof item === 'object' ? item.objection : item;
  const response  = typeof item === 'object' ? item.response  : '';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-800 leading-snug">{objection}</span>
        </div>
        <svg
          className={`ml-3 w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && response && (
        <div className="px-4 py-3.5 bg-gray-50 border-t border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed pl-8">{response}</p>
        </div>
      )}
    </div>
  );
}

/* ── Landmine amber card ─────────────────────────────────────────────────── */
function LandmineCard({ item, index }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
      <span className="text-base shrink-0 mt-0.5">🚩</span>
      <div className="flex gap-2 min-w-0">
        <span className="text-xs font-bold text-amber-700 shrink-0 mt-0.5">{index + 1}.</span>
        <p className="text-sm text-amber-900 leading-relaxed">{item}</p>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function BattleCard({ data }) {
  if (!data) {
    return (
      <div className="text-sm text-gray-400 py-16 text-center">No battle card data yet.</div>
    );
  }

  const d = typeof data === 'string' ? JSON.parse(data) : data;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Positioning */}
      <div>
        <SectionLabel>Positioning</SectionLabel>
        <PositioningCard text={d.positioning} />
      </div>

      {/* Pricing */}
      <div>
        <SectionLabel>Pricing</SectionLabel>
        <PricingCard text={d.pricing} />
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <SectionLabel>Strengths</SectionLabel>
          {d.strengths?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {d.strengths.map((s, i) => <Chip key={i} label={s} type="strength" />)}
            </div>
          ) : <Empty />}
        </div>
        <div>
          <SectionLabel>Weaknesses</SectionLabel>
          {d.weaknesses?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {d.weaknesses.map((w, i) => <Chip key={i} label={w} type="weakness" />)}
            </div>
          ) : <Empty />}
        </div>
      </div>

      {/* Objection Handling — accordion */}
      <div>
        <SectionLabel>Objection Handling</SectionLabel>
        {d.objection_handling?.length > 0 ? (
          <div className="space-y-2">
            {d.objection_handling.map((item, i) => (
              <AccordionItem key={i} item={item} index={i} />
            ))}
          </div>
        ) : <Empty />}
      </div>

      {/* Landmines */}
      <div>
        <SectionLabel>Landmines</SectionLabel>
        {d.landmines?.length > 0 ? (
          <div className="space-y-2">
            {d.landmines.map((item, i) => (
              <LandmineCard key={i} item={item} index={i} />
            ))}
          </div>
        ) : <Empty />}
      </div>
    </div>
  );
}
