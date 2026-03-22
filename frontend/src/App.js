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
    // ── research_jobs: catch status transitions (pending → running → complete/failed)
    const jobChannel = supabase
      .channel('research_jobs_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'research_jobs' },
        (payload) => {
          const job = payload.new;
          if (!job || !job.competitor_id) return;
          console.log('[Realtime] research_jobs update:', job.competitor_id, job.status);
          setJobStatuses((prev) => {
            const existing = prev[job.competitor_id];
            if (!existing || job.created_at >= existing.created_at) {
              return { ...prev, [job.competitor_id]: job };
            }
            return prev;
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('[Realtime] research_jobs channel error:', err);
        else console.log('[Realtime] research_jobs channel status:', status);
      });

    // ── research_outputs: secondary signal — when an output row is inserted
    //    the job *must* be complete, so we update local job status directly.
    //    This fires even if Realtime isn't enabled on research_jobs itself.
    const outputChannel = supabase
      .channel('research_outputs_rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'research_outputs' },
        (payload) => {
          const output = payload.new;
          if (!output?.competitor_id) return;
          console.log('[Realtime] research_outputs insert for competitor:', output.competitor_id);
          setJobStatuses((prev) => {
            const existing = prev[output.competitor_id];
            if (!existing) return prev;
            return {
              ...prev,
              [output.competitor_id]: { ...existing, status: 'complete' },
            };
          });
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('[Realtime] research_outputs channel error:', err);
        else console.log('[Realtime] research_outputs channel status:', status);
      });

    // ── competitors: reload list when a new competitor is inserted
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
      supabase.removeChannel(outputChannel);
      supabase.removeChannel(compChannel);
    };
  }, [loadCompetitors]);

  // ── Polling fallback ───────────────────────────────────────────────────────
  // If any jobs are still pending/running, poll Supabase every 5 s.
  // This guarantees the UI updates even when Realtime isn't enabled on the table.
  useEffect(() => {
    const activeEntries = Object.entries(jobStatuses).filter(
      ([, j]) => j?.status === 'pending' || j?.status === 'running'
    );
    if (activeEntries.length === 0) return;

    const interval = setInterval(async () => {
      const activeIds = activeEntries.map(([competitorId]) => competitorId);
      const { data: jobs } = await supabase
        .from('research_jobs')
        .select('*')
        .in('competitor_id', activeIds)
        .order('created_at', { ascending: false });

      if (!jobs || jobs.length === 0) return;

      // Build latest-per-competitor map
      const latest = {};
      jobs.forEach((j) => {
        if (!latest[j.competitor_id]) latest[j.competitor_id] = j;
      });

      setJobStatuses((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.entries(latest).forEach(([cid, j]) => {
          if (prev[cid]?.status !== j.status) {
            console.log('[Poll] job status changed:', cid, prev[cid]?.status, '→', j.status);
            next[cid] = j;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [jobStatuses]);

  // Single-competitor handler — used by HeadToHead "Run Full Research" button
  const handleNewResearch = async ({ competitorName, competitorWebsite }) => {
    await queueResearch({ name: competitorName, product_url: competitorWebsite || null });
  };

  // Multi-competitor handler — used by the New Research modal
  const handleBatchResearch = async (entries) => {
    console.log('[handleBatchResearch] entries:', entries);
    let firstId = null;
    for (const entry of entries) {
      const id = await queueResearch({
        name: entry.name.trim(),
        product_name: entry.product_name?.trim() || null,
        product_url: entry.product_url?.trim() || null,
        additional_urls: (entry.additional_urls || []).filter((u) => u.trim()),
        notes: entry.notes?.trim() || null,
      });
      console.log('[handleBatchResearch] queued:', entry.name, '→ id:', id);
      if (!firstId && id) firstId = id;
    }
    console.log('[handleBatchResearch] done. firstId:', firstId);
    if (firstId) setSelectedId(firstId);
    setShowModal(false);
  };

  // Core logic: upsert competitor + create job + fire webhook; returns competitor id.
  // entry = { name, product_name?, product_url?, additional_urls?, notes? }
  const queueResearch = async (entry) => {
    const competitorName = typeof entry === 'string' ? entry : entry.name;
    const productUrl  = typeof entry === 'string' ? null : entry.product_url  || null;
    const productName = typeof entry === 'string' ? null : entry.product_name || null;

    try {
      // 1. Look up existing competitor
      const { data: existing, error: lookupError } = await supabase
        .from('competitors')
        .select('*')
        .ilike('name', competitorName)
        .maybeSingle();

      if (lookupError) {
        console.error('[queueResearch] competitor lookup error:', lookupError);
        return null;
      }

      let competitorId;
      if (!existing) {
        // 2a. Insert new competitor (website = primary product URL for display in sidebar)
        const { data: inserted, error: insertError } = await supabase
          .from('competitors')
          .insert({
            name:            competitorName,
            website:         productUrl,
            product_name:    productName,
            additional_urls: typeof entry !== 'string' ? (entry.additional_urls || []) : [],
            notes:           typeof entry !== 'string' ? (entry.notes           || null) : null,
          })
          .select()
          .single();

        if (insertError || !inserted) {
          console.error('[queueResearch] competitor insert error:', insertError);
          return null;
        }
        competitorId = inserted.id;
        setCompetitors((prev) => [inserted, ...prev]);
      } else {
        competitorId = existing.id;
      }

      // 3. Create research job
      const { data: job, error: jobError } = await supabase
        .from('research_jobs')
        .insert({ competitor_id: competitorId, status: 'pending', triggered_by: 'user' })
        .select()
        .single();

      if (jobError || !job) {
        console.error('[queueResearch] job insert error:', jobError);
        return null;
      }

      setJobStatuses((prev) => ({ ...prev, [competitorId]: job }));

      // 4. Fire webhook with all competitor details (non-blocking)
      const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('[queueResearch] REACT_APP_N8N_WEBHOOK_URL is not set');
      } else {
        // Send every field under both naming conventions.
        // n8n sometimes strips the "competitor_" prefix before forwarding
        // to the agent, so we include both forms to guarantee delivery.
        const additionalUrls = (typeof entry !== 'string' && entry.additional_urls) ? entry.additional_urls : [];
        const notes          = (typeof entry !== 'string' && entry.notes)           ? entry.notes           : null;
        const payload = {
          // required
          competitor_name: competitorName,
          job_id: job.id,
          // un-prefixed (what the agent reads when n8n strips the prefix)
          product_name:    productName,
          url:             productUrl,
          additional_urls: additionalUrls,
          notes:           notes,
          // prefixed (original format, kept for any n8n workflows that pass them through as-is)
          competitor_product_name:    productName,
          competitor_url:             productUrl,
          competitor_additional_urls: additionalUrls,
          competitor_notes:           notes,
        };
        console.log('[queueResearch] webhook payload:', JSON.stringify(payload));
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => console.error('[queueResearch] webhook fetch error:', err));
      }

      return competitorId;
    } catch (err) {
      console.error('[queueResearch] unexpected error:', err);
      return null;
    }
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
          onRunResearchFor={(name, website) => handleNewResearch({ competitorName: name, competitorWebsite: website })}
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
