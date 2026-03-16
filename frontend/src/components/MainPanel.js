import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import BattleCard from './tabs/BattleCard';
import CompetitiveTriggers from './tabs/CompetitiveTriggers';
import HeadToHead from './tabs/HeadToHead';

const TABS = ['Battle Card', 'Competitive Triggers', 'Head-to-Head'];

export default function MainPanel({ competitor, job, onRunResearchFor }) {
  const [activeTab, setActiveTab] = useState(0);
  const [output, setOutput] = useState(null);

  useEffect(() => {
    if (!competitor) return;
    setOutput(null);

    const load = async () => {
      const { data } = await supabase
        .from('research_outputs')
        .select('*')
        .eq('competitor_id', competitor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setOutput(data || null);
    };

    load();

    // Realtime: refresh output when a new one lands
    const channel = supabase
      .channel(`output_${competitor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'research_outputs',
          filter: `competitor_id=eq.${competitor.id}`,
        },
        (payload) => setOutput(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [competitor]);

  if (!competitor) {
    return (
      <main className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        Select a competitor or run new research.
      </main>
    );
  }

  const isRunning = job?.status === 'running';
  const isPending = job?.status === 'pending';
  const isFailed = job?.status === 'failed';

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Competitor header */}
      <div className="px-6 pt-5 pb-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{competitor.name}</h1>
            {competitor.website && (
              <a
                href={competitor.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:underline"
              >
                {competitor.website}
              </a>
            )}
          </div>
          <StatusBar job={job} output={output} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === i
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {(isPending || isRunning) && !output && (
          <LoadingState status={job.status} />
        )}
        {isFailed && !output && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <span>Research job failed. Please try running again.</span>
          </div>
        )}
        {output && (
          <>
            {activeTab === 0 && <BattleCard data={output.battle_card} />}
            {activeTab === 1 && <CompetitiveTriggers data={output.competitive_triggers} />}
            {activeTab === 2 && (
              <HeadToHead
                data={output.head_to_head}
                related={output.related_competitors}
                onRunResearchFor={onRunResearchFor}
              />
            )}
          </>
        )}
        {!output && !isPending && !isRunning && !isFailed && (
          <div className="text-sm text-gray-500">No research data yet. Run a new job.</div>
        )}
      </div>
    </main>
  );
}

function StatusBar({ job, output }) {
  if (!job) return null;

  const STATUS_COLORS = {
    pending:  'text-yellow-400',
    running:  'text-blue-400',
    complete: 'text-green-400',
    failed:   'text-red-400',
  };

  const lastUpdated = output?.created_at
    ? new Date(output.created_at).toLocaleString()
    : null;

  return (
    <div className="text-right text-xs">
      <span className={`font-medium capitalize ${STATUS_COLORS[job.status] || 'text-gray-400'}`}>
        {job.status === 'running' ? '⟳ Running…' : job.status}
      </span>
      {lastUpdated && (
        <div className="text-gray-500 mt-0.5">Last updated: {lastUpdated}</div>
      )}
    </div>
  );
}

function LoadingState({ status }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">
        {status === 'pending' ? 'Job queued…' : 'Claude is researching this competitor…'}
      </p>
    </div>
  );
}
