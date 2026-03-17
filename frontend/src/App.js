import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import NewResearchModal from './components/NewResearchModal';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [competitors, setCompetitors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [jobStatuses, setJobStatuses] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCompetitors = useCallback(async () => {
    const { data: comps } = await supabase
      .from('competitors')
      .select('*')
      .order('created_at', { ascending: false });

    if (!comps) return;
    setCompetitors(comps);

    const ids = comps.map((c) => c.id);
    if (ids.length > 0) {
      const { data: jobs } = await supabase
        .from('research_jobs')
        .select('*')
        .in('competitor_id', ids)
        .order('created_at', { ascending: false });

      const latest = {};
      (jobs || []).forEach((j) => {
        if (!latest[j.competitor_id]) latest[j.competitor_id] = j;
      });
      setJobStatuses(latest);

      setSelectedId((prev) => prev ?? (comps.length > 0 ? comps[0].id : null));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCompetitors();
  }, [loadCompetitors]);

  useEffect(() => {
    const jobChannel = supabase
      .channel('research_jobs_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'research_jobs' },
        (payload) => {
          const job = payload.new || payload.old;
          if (!job) return;
          setJobStatuses((prev) => {
            const existing = prev[job.competitor_id];
            if (!existing || job.created_at >= existing.created_at) {
              return { ...prev, [job.competitor_id]: job };
            }
            return prev;
          });
        }
      )
      .subscribe();

    const compChannel = supabase
      .channel('competitors_rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'competitors' },
        () => loadCompetitors()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(compChannel);
    };
  }, [loadCompetitors]);

  // Single-competitor handler — used by HeadToHead "Run Full Research" button
  const handleNewResearch = async ({ competitorName, competitorWebsite }) => {
    await queueResearch(competitorName, competitorWebsite || null);
  };

  // Multi-competitor handler — used by the New Research modal
  const handleBatchResearch = async (entries) => {
    let firstId = null;
    for (const entry of entries) {
      const id = await queueResearch(entry.name.trim(), entry.website?.trim() || null);
      if (!firstId && id) firstId = id;
    }
    if (firstId) setSelectedId(firstId);
    setShowModal(false);
  };

  // Core logic: upsert competitor + create job + fire webhook; returns competitor id
  const queueResearch = async (competitorName, website = null) => {
    let { data: existing } = await supabase
      .from('competitors')
      .select('*')
      .ilike('name', competitorName)
      .maybeSingle();

    let competitorId;
    if (!existing) {
      const { data: inserted } = await supabase
        .from('competitors')
        .insert({ name: competitorName, website, is_known: true })
        .select()
        .single();
      competitorId = inserted.id;
      setCompetitors((prev) => [inserted, ...prev]);
    } else {
      competitorId = existing.id;
    }

    const { data: job } = await supabase
      .from('research_jobs')
      .insert({ competitor_id: competitorId, status: 'pending', triggered_by: 'user' })
      .select()
      .single();

    setJobStatuses((prev) => ({ ...prev, [competitorId]: job }));

    const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL;
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor_name: competitorName, job_id: job.id }),
    }).catch(console.error);

    return competitorId;
  };

  const handleDeleteCompetitor = (competitorId) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== competitorId));
    setJobStatuses((prev) => {
      const next = { ...prev };
      delete next[competitorId];
      return next;
    });
    // If the deleted competitor was selected, move to the next available one
    setSelectedId((prev) => {
      if (prev !== competitorId) return prev;
      const remaining = competitors.filter((c) => c.id !== competitorId);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  };

  const selectedCompetitor = competitors.find((c) => c.id === selectedId);
  const selectedJob = selectedId ? jobStatuses[selectedId] : null;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            CI
          </div>
          <span className="font-semibold text-lg tracking-tight">Competitive Intel</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 text-sm transition-colors cursor-pointer"
            title="My Product"
          >
            ⚙ My Product
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors cursor-pointer"
          >
            + New Research
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          competitors={competitors}
          jobStatuses={jobStatuses}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={handleDeleteCompetitor}
          loading={loading}
        />
        <MainPanel
          competitor={selectedCompetitor}
          job={selectedJob}
          onRunResearchFor={(name) => handleNewResearch({ competitorName: name })}
        />
      </div>

      {showModal && (
        <NewResearchModal onSubmit={handleBatchResearch} onClose={() => setShowModal(false)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
