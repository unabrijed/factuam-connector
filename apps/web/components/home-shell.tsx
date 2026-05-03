"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  createExperiment,
  getConnectorPresets,
  getConnectors,
  type ConnectorManifest,
  type ConnectorPreset
} from "../lib/api";
import { upsertExperimentRecent, listExperimentRecents, type ExperimentRecent } from "../lib/experiment-recents";
import { AppChatShell } from "./app-chat-shell";
import { AppChatThread } from "./app-chat-thread";
import { AppLandingComposer } from "./app-landing-composer";
import { ChatSidebar } from "./chat-sidebar";

const EXPERIMENT_QS = "experiment";
const CONNECTOR_RUN_QS = "connectorRun";

function looksLikeUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function HomeShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<"landing" | "chat">("landing");
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [connectorRunId, setConnectorRunId] = useState<string | null>(null);
  const [presets, setPresets] = useState<ConnectorPreset[]>([]);
  const [connectors, setConnectors] = useState<ConnectorManifest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<ExperimentRecent[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const refreshRecents = useCallback(() => {
    setRecents(listExperimentRecents());
  }, []);

  const syncExperimentUrl = useCallback(
    (id: string | null, runId?: string | null) => {
      if (id) {
        const params = new URLSearchParams({ [EXPERIMENT_QS]: id });
        if (runId) params.set(CONNECTOR_RUN_QS, runId);
        router.replace(`/app?${params.toString()}`, { scroll: false });
      } else {
        router.replace("/app", { scroll: false });
      }
    },
    [router]
  );

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  useEffect(() => {
    const id = searchParams.get(EXPERIMENT_QS);
    const runId = searchParams.get(CONNECTOR_RUN_QS);
    if (id && looksLikeUuid(id)) {
      setExperimentId(id);
      setConnectorRunId(runId);
      setPhase("chat");
    }
  }, [searchParams]);

  useEffect(() => {
    getConnectorPresets().then(setPresets).catch(() => undefined);
    getConnectors().then(setConnectors).catch(() => undefined);
  }, []);

  const recordRecent = useCallback(
    (meta: { id: string; title: string; updatedAt: string; status?: string }) => {
      upsertExperimentRecent({
        id: meta.id,
        title: meta.title,
        updatedAt: meta.updatedAt,
        status: meta.status
      });
      refreshRecents();
    },
    [refreshRecents]
  );

  async function handlePresetSubmit(input: { query: string; connectorRequest: ConnectorPreset["connectorRequest"] }) {
    setBusy(true);
    setError(null);
    try {
      const result = await createExperiment({
        query: input.query,
        mode: "connector",
        connectorRequest: input.connectorRequest
      });
      setExperimentId(result.experimentId);
      setConnectorRunId(result.connectorRunId ?? null);
      setPhase("chat");
      syncExperimentUrl(result.experimentId, result.connectorRunId ?? null);
      recordRecent({
        id: result.experimentId,
        title: input.query.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run connector preset");
    } finally {
      setBusy(false);
    }
  }

  async function handleKaggleDiscover(input: { query: string }) {
    setBusy(true);
    setError(null);
    try {
      const result = await createExperiment({
        query: input.query,
        mode: "connector",
        discoverKaggle: true
      });
      setExperimentId(result.experimentId);
      setConnectorRunId(result.connectorRunId ?? null);
      setPhase("chat");
      syncExperimentUrl(result.experimentId, result.connectorRunId ?? null);
      recordRecent({
        id: result.experimentId,
        title: input.query.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover Kaggle dataset");
    } finally {
      setBusy(false);
    }
  }

  async function handleAutoDiscover(input: { query: string }) {
    setBusy(true);
    setError(null);
    try {
      const result = await createExperiment({
        query: input.query,
        mode: "upload"
      });
      setExperimentId(result.experimentId);
      setConnectorRunId(result.connectorRunId ?? null);
      setPhase("chat");
      syncExperimentUrl(result.experimentId, result.connectorRunId ?? null);
      recordRecent({
        id: result.experimentId,
        title: input.query.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create experiment");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadRun(input: { datasetId: string; query: string }) {
    setBusy(true);
    setError(null);
    try {
      const result = await createExperiment({
        query: input.query,
        mode: "upload",
        datasetId: input.datasetId
      });
      setExperimentId(result.experimentId);
      setConnectorRunId(result.connectorRunId ?? null);
      setPhase("chat");
      syncExperimentUrl(result.experimentId, result.connectorRunId ?? null);
      recordRecent({
        id: result.experimentId,
        title: input.query.trim().slice(0, 120),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start upload experiment");
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectorFromChat(input: {
    query: string;
    connectorRequest: ConnectorPreset["connectorRequest"];
  }) {
    await handlePresetSubmit(input);
  }

  function handleNewChat() {
    setExperimentId(null);
    setConnectorRunId(null);
    setPhase("landing");
    setError(null);
    syncExperimentUrl(null);
  }

  function handleSelectRecent(id: string) {
    setExperimentId(id);
    setConnectorRunId(null);
    setPhase("chat");
    syncExperimentUrl(id, null);
  }

  const sidebar = (
    <ChatSidebar
      recents={recents}
      activeExperimentId={phase === "chat" ? experimentId : null}
      onSelectRecent={handleSelectRecent}
      onNewChat={handleNewChat}
      open={mobileNavOpen}
      onClose={() => setMobileNavOpen(false)}
    />
  );

  return (
    <AppChatShell sidebar={sidebar} onOpenMobileNav={() => setMobileNavOpen(true)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {phase === "chat" && experimentId ? (
          <AppChatThread
            experimentId={experimentId}
            connectorRunId={connectorRunId}
            onNewChat={handleNewChat}
            onExperimentMeta={recordRecent}
            presets={presets}
            connectors={connectors}
            onConnectorPresetRun={handleConnectorFromChat}
            onUploadRun={handleUploadRun}
            experimentBusy={busy}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <AppLandingComposer
              embedded
              error={error}
              busy={busy}
              onPresetSubmit={handlePresetSubmit}
              onKaggleDiscoverSubmit={handleKaggleDiscover}
              onAutoDiscoverSubmit={handleAutoDiscover}
              presets={presets}
              connectors={connectors}
            />
          </div>
        )}
      </div>
    </AppChatShell>
  );
}
