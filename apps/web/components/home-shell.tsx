"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createExperiment, getConnectorPresets, getConnectors, type ConnectorManifest, type ConnectorPreset } from "../lib/api";
import { AppChatThread } from "./app-chat-thread";
import { AppLandingComposer } from "./app-landing-composer";

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run connector preset");
    } finally {
      setBusy(false);
    }
  }

  function handleNewChat() {
    setExperimentId(null);
    setConnectorRunId(null);
    setPhase("landing");
    syncExperimentUrl(null);
  }

  return (
    <div className={phase === "chat" ? "flex min-h-[min(70dvh,calc(100dvh-10rem))] flex-col" : "space-y-6"}>
      {phase === "chat" && experimentId ? (
        <>
          <div className="mb-3 shrink-0 space-y-1">
            <h1 className="text-lg font-semibold text-[var(--text)]">Run</h1>
            <p className="text-xs text-[var(--muted)]">Single turn · New chat for another question</p>
          </div>
          <div className="min-h-0 flex-1">
            <AppChatThread experimentId={experimentId} connectorRunId={connectorRunId} onNewChat={handleNewChat} />
          </div>
        </>
      ) : (
        <AppLandingComposer
          error={error}
          busy={busy}
          onPresetSubmit={handlePresetSubmit}
          presets={presets}
          connectors={connectors}
        />
      )}
    </div>
  );
}
