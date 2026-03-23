import React, { useState } from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Battle Cards ──────────────────────────────────────────────────────────────

function SwCard({ item, variant }) {
  const isStrength = variant === 'strength';
  return (
    <div className={`rounded-xl border shadow-sm bg-white overflow-hidden`}>
      <div className={`px-4 py-3 border-b flex items-center gap-2 ${isStrength ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
        <span className={`text-sm font-bold ${isStrength ? 'text-emerald-600' : 'text-red-500'}`}>
          {isStrength ? '✓' : '✗'}
        </span>
        <span className={`text-sm font-semibold ${isStrength ? 'text-emerald-800' : 'text-red-800'}`}>{item.title}</span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <p className="text-sm text-gray-700 leading-relaxed">{item.explanation}</p>
        {(item.source_label || item.source_url) && (
          <div className="flex justify-end">
            <SourceBadge label={item.source_label} url={item.source_url} />
          </div>
        )}
      </div>
    </div>
  );
}

function BattleCards({ data }) {
  if (!data) return null;
  return (
    <section>
      <SectionHeader title="Battle Cards" />
      {data.positioning_summary && (
        <Card className="px-5 py-4 mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Positioning Summary</div>
          <p className="text-sm text-gray-700 leading-relaxed">{data.positioning_summary}</p>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Strengths</div>
          {(data.strengths || []).length === 0
            ? <EmptySection message="No strengths data." />
            : (data.strengths || []).map((s, i) => <SwCard key={i} item={s} variant="strength" />)
          }
        </div>
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-500">Weaknesses</div>
          {(data.weaknesses || []).length === 0
            ? <EmptySection message="No weaknesses data." />
            : (data.weaknesses || []).map((w, i) => <SwCard key={i} item={w} variant="weakness" />)
          }
        </div>
      </div>
    </section>
  );
}

// ── Objection Handling ────────────────────────────────────────────────────────

function ObjectionRow({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-gray-800">{item.objection}</span>
        <span className={`shrink-0 mt-0.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
          {(item.talking_points || []).length > 0 && (
            <div className="pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 mb-2">Talking Points</div>
              <ul className="flex flex-col gap-2">
                {item.talking_points.map((tp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {tp}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.evidence && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Evidence</div>
              <p className="text-sm text-gray-600 italic">{item.evidence}</p>
            </div>
          )}
          {(item.source_label || item.source_url) && (
            <div className="flex justify-end">
              <SourceBadge label={item.source_label} url={item.source_url} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectionHandling({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Objection Handling" subtitle="Expandable — click any row to see the counter" />
      {list.length === 0
        ? <EmptySection message="No objection handling data." />
        : <div className="flex flex-col gap-2">{list.map((item, i) => <ObjectionRow key={i} item={item} />)}</div>
      }
    </section>
  );
}

// ── Landmines to Watch ────────────────────────────────────────────────────────

function LandminesToWatch({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Landmines to Watch For" subtitle="What they plant against us in deals" />
      {list.length === 0 ? (
        <EmptySection message="No landmine data found." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 shrink-0">⚡</span>
                  <p className="text-sm font-semibold text-red-800">{item.statement}</p>
                </div>
              </div>
              <div className="px-4 py-3 grid sm:grid-cols-2 gap-4">
                {item.context && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Context</div>
                    <p className="text-sm text-gray-600">{item.context}</p>
                  </div>
                )}
                {item.how_to_neutralize && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">How to Neutralize</div>
                    <p className="text-sm text-gray-700">{item.how_to_neutralize}</p>
                  </div>
                )}
                {(item.source_label || item.source_url) && (
                  <div className="sm:col-span-2 flex justify-end">
                    <SourceBadge label={item.source_label} url={item.source_url} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Landmines to Plant ────────────────────────────────────────────────────────

function LandminesToPlant({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Landmines to Plant" subtitle="Questions and doubts we can introduce in deals" />
      {list.length === 0 ? (
        <EmptySection message="No landmine data found." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">Topic</div>
                <p className="text-sm font-semibold text-emerald-900">{item.topic}</p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-3">
                {item.suggested_language && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Suggested Language</div>
                    <blockquote className="bg-gray-50 border-l-4 border-indigo-400 rounded-r-lg px-4 py-2.5 text-sm text-gray-800 italic">
                      "{item.suggested_language}"
                    </blockquote>
                  </div>
                )}
                {item.rationale && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Rationale</div>
                    <p className="text-sm text-gray-600">{item.rationale}</p>
                  </div>
                )}
                {(item.source_label || item.source_url) && (
                  <div className="flex justify-end">
                    <SourceBadge label={item.source_label} url={item.source_url} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Sales tab ─────────────────────────────────────────────────────────────────

export default function Sales({ data }) {
  if (!data) return <EmptySection message="Run research to see sales data." />;
  return (
    <div className="flex flex-col gap-8">
      <BattleCards       data={data.battle_cards} />
      <ObjectionHandling items={data.objection_handling} />
      <LandminesToWatch  items={data.landmines_to_watch} />
      <LandminesToPlant  items={data.landmines_to_plant} />
    </div>
  );
}
