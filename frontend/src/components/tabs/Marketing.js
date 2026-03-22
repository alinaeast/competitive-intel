import React from 'react';
import { SourceBadge, SectionHeader, EmptySection, Card } from './Shared';

// ── Positioning Analysis ──────────────────────────────────────────────────────

function PositioningAnalysis({ data }) {
  if (!data) return null;
  return (
    <section>
      <SectionHeader title="Positioning Analysis" />
      <Card className="p-5 grid sm:grid-cols-2 gap-5">
        {data.category_claimed && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Category Claimed</div>
            <p className="text-sm text-gray-700">{data.category_claimed}</p>
          </div>
        )}
        {data.target_audience && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Target Audience</div>
            <p className="text-sm text-gray-700">{data.target_audience}</p>
          </div>
        )}
        {data.overall_positioning && (
          <div className="sm:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Overall Positioning</div>
            <p className="text-sm text-gray-700 leading-relaxed">{data.overall_positioning}</p>
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

// ── Key Messages ──────────────────────────────────────────────────────────────

function KeyMessages({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Key Messages" subtitle="What they lead with and repeat across channels" />
      {list.length === 0 ? (
        <EmptySection message="No key messages found." />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((item, i) => (
            <Card key={i} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-relaxed">"{item.message}"</p>
                {item.appears_in && (
                  <p className="text-xs text-gray-500 mt-1">Found in: {item.appears_in}</p>
                )}
              </div>
              <SourceBadge label={item.source_label} url={item.source_url} />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Messaging Gaps ────────────────────────────────────────────────────────────

function MessagingGaps({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Messaging Gaps" subtitle="What they avoid — and where we can own the conversation" />
      {list.length === 0 ? (
        <EmptySection message="No messaging gaps identified." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((item, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Their Gap</div>
                <p className="text-sm font-medium text-gray-800">{item.gap}</p>
              </div>
              <div className="px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 mb-0.5">Our Opportunity</div>
                <p className="text-sm text-gray-700">{item.opportunity}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Voice of Customer ─────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  positive: { cls: 'bg-emerald-50 border-emerald-200', barCls: 'bg-emerald-400', label: 'Positive' },
  negative: { cls: 'bg-red-50 border-red-200',         barCls: 'bg-red-400',     label: 'Negative' },
  mixed:    { cls: 'bg-amber-50 border-amber-200',     barCls: 'bg-amber-400',   label: 'Mixed' },
};

function VoiceOfCustomer({ items }) {
  const list = items || [];
  return (
    <section>
      <SectionHeader title="Voice of Customer" subtitle="Real quotes from reviews — verbatim, not paraphrased" />
      {list.length === 0 ? (
        <EmptySection message="No customer quotes found from credible sources." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((item, i) => {
            const cfg = SENTIMENT_CONFIG[item.sentiment] || SENTIMENT_CONFIG.mixed;
            return (
              <div key={i} className={`rounded-xl border shadow-sm overflow-hidden ${cfg.cls}`}>
                <div className={`h-1 w-full ${cfg.barCls}`} />
                <div className="px-4 py-4 flex flex-col gap-3">
                  <p className="text-sm text-gray-800 italic leading-relaxed">"{item.quote}"</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {item.source_platform && (
                        <span className="text-[11px] text-gray-500 font-medium">{item.source_platform}</span>
                      )}
                      {item.date && (
                        <span className="text-[11px] text-gray-400">{item.date}</span>
                      )}
                    </div>
                    <SourceBadge label={item.source_platform} url={item.source_url} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Social Presence ───────────────────────────────────────────────────────────

function SocialPresence({ data }) {
  if (!data) return null;
  return (
    <section>
      <SectionHeader title="Social Presence & Tone of Voice" />
      <Card className="p-5 flex flex-col gap-5">
        <div className="grid sm:grid-cols-2 gap-5">
          {(data.platforms || []).length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Platforms</div>
              <div className="flex flex-wrap gap-1.5">
                {data.platforms.map((p, i) => (
                  <span key={i} className="text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.posting_frequency && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Posting Frequency</div>
              <p className="text-sm text-gray-700">{data.posting_frequency}</p>
            </div>
          )}
          {data.tone && (
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Tone of Voice</div>
              <p className="text-sm text-gray-700 leading-relaxed">{data.tone}</p>
            </div>
          )}
          {(data.content_themes || []).length > 0 && (
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Content Themes</div>
              <div className="flex flex-wrap gap-1.5">
                {data.content_themes.map((t, i) => (
                  <span key={i} className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        {(data.source_label || data.source_url) && (
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <SourceBadge label={data.source_label} url={data.source_url} />
          </div>
        )}
      </Card>
    </section>
  );
}

// ── Marketing tab ─────────────────────────────────────────────────────────────

export default function Marketing({ data }) {
  if (!data) return <EmptySection message="Run research to see marketing data." />;
  return (
    <div className="flex flex-col gap-8">
      <PositioningAnalysis data={data.positioning_analysis} />
      <KeyMessages         items={data.key_messages} />
      <MessagingGaps       items={data.messaging_gaps} />
      <VoiceOfCustomer     items={data.voice_of_customer} />
      <SocialPresence      data={data.social_presence} />
    </div>
  );
}
