"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConnectorManifest, ConnectorPreset } from "../lib/api";
import { getConnectorRun, getExperiment, sendExperimentMessage } from "../lib/api";
import { appConfig } from "../lib/config";
import { experimentPollIntervalMs, isExperimentTerminal } from "../lib/experiment-query";
import { AgentPipelinePanel } from "./agent-pipeline-panel";
import { ChatComposer } from "./chat-composer";
import { ChatTranscript } from "./chat-transcript";
import { Badge, Button, formatLabel } from "./ui";

export type AppChatThreadProps = {
  experimentId: string;
  connectorRunId?: string | null;
  onNewChat: () => void;
  onExperimentMeta?: (meta: { id: string; title: string; updatedAt: string; status?: string }) => void;
  presets: ConnectorPreset[];
  connectors: ConnectorManifest[];
  onConnectorPresetRun: (input: { query: string; connectorRequest: ConnectorPreset["connectorRequest"] }) => void | Promise<void>;
  onUploadRun: (input: { datasetId: string; query: string }) => void | Promise<void>;
  experimentBusy?: boolean;
};

export function AppChatThread({
  experimentId,
  connectorRunId,
  onNewChat,
  onExperimentMeta,
  presets,
  connectors,
  onConnectorPresetRun,
  onUploadRun,
  experimentBusy = false
}: AppChatThreadProps) {
  const queryClient = useQueryClient();
  const [guidance, setGuidance] = useState("");
  const [streamConnected, setStreamConnected] = useState(false);
  const [runExtrasBusy, setRunExtrasBusy] = useState(false);

  const query = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => getExperiment(experimentId),
    refetchInterval: (q) => experimentPollIntervalMs(q.state.data as { status?: string } | undefined)
  });

  const connectorQuery = useQuery({
    queryKey: ["connector-run", connectorRunId],
    queryFn: () => getConnectorRun(connectorRunId!),
    enabled: Boolean(connectorRunId),
    refetchInterval: 2000
  });

  const messageMutation = useMutation({
    mutationFn: (input: { message: string; rerun?: boolean }) => sendExperimentMessage(experimentId, input),
    onSuccess: () => {
      setGuidance("");
      void queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    }
  });

  useEffect(() => {
    const streamUrl = `${appConfig.apiUrl}/api/experiments/${experimentId}/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener("open", () => {
      setStreamConnected(true);
    });

    eventSource.addEventListener("experiment", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as unknown;
        queryClient.setQueryData(["experiment", experimentId], data);
      } catch {
        // keep polling fallback
      }
    });

    eventSource.addEventListener("error", () => {
      setStreamConnected(false);
    });

    return () => {
      setStreamConnected(false);
      eventSource.close();
    };
  }, [experimentId, queryClient]);

  useEffect(() => {
    const exp = query.data;
    if (!exp?.id) return;
    onExperimentMeta?.({
      id: exp.id,
      title: exp.query ?? "Run",
      updatedAt: exp.updatedAt ?? new Date().toISOString(),
      status: exp.status
    });
  }, [query.data, onExperimentMeta]);

  if (query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-[var(--text-soft)]">Loading…</p>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-[var(--danger)]">Error: {(query.error as Error).message}</p>
        <Button type="button" onClick={onNewChat}>
          New chat
        </Button>
      </div>
    );
  }

  const experiment = query.data;
  const terminal = isExperimentTerminal(experiment.status);
  const completedOk = experiment.status === "COMPLETED";
  const receiptId = experiment.resultSummary?.receiptId as string | undefined;

  const progress = Array.isArray(experiment.resultSummary?.progress)
    ? (experiment.resultSummary?.progress as Array<{
        stage?: string;
        message?: string;
        ts?: string;
        details?: Record<string, unknown>;
      }>)
    : [];

  const messages = Array.isArray(experiment.messages)
    ? (experiment.messages as Array<{
        id: string;
        role: "user" | "agent" | "system";
        message: string;
        createdAt?: string;
        metadata?: Record<string, unknown> | null;
      }>)
    : [];

  const attempts = Array.isArray(experiment.attempts)
    ? (experiment.attempts as Array<{ attemptNumber: number; status: string }>)
    : [];

  const attemptCount = attempts.filter((a) => a.status !== "running").length + 1;
  const confidence = experiment.confidence as string | undefined;
  const backtest = experiment.latestBacktest as { liftOverBaseline: string } | undefined;
  const connectorStage = connectorQuery.data?.sourceMeta?.stage as string | undefined;
  const hasConnectorDetails = Boolean(connectorRunId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <Badge tone={completedOk ? "success" : terminal ? "danger" : "accent"}>
          {completedOk ? "Complete" : terminal ? formatLabel(experiment.status) : "Running"}
        </Badge>
        {confidence ? <Badge tone="success">{formatLabel(confidence)}</Badge> : null}
        {!terminal ? <Badge tone="default">{streamConnected ? "Live" : "Syncing"}</Badge> : null}
      </div>

      {progress.length > 0 ? (
        <div className="shrink-0 px-4 pt-3">
          <AgentPipelinePanel
            progress={progress}
            experimentStatus={experiment.status}
            terminal={terminal}
            attemptCount={attemptCount}
            maxAttempts={4}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ChatTranscript
          initialQuery={experiment.query ?? ""}
          messages={messages}
          finalAnswer={experiment.finalAnswer}
          terminal={terminal}
          completedOk={completedOk}
          errorMessage={experiment.errorMessage}
          statusLabel={formatLabel(experiment.status)}
          receiptId={receiptId}
        />

        {terminal ? (
          <div className="mt-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)]/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-soft)]">
              {confidence ? <span>Confidence: <span className="text-[var(--text)]">{formatLabel(confidence)}</span></span> : null}
              {backtest ? <span>Lift: <span className="text-[var(--text)]">{Number(backtest.liftOverBaseline).toFixed(2)}%</span></span> : null}
              {hasConnectorDetails ? <span>Connector: <span className="text-[var(--text)]">{formatLabel(connectorStage ?? "?" )}</span></span> : null}
              {receiptId ? (
                <Link href={`/proofs/${receiptId}`} className="ml-auto text-[var(--accent)] hover:underline">
                  Open proof
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <ChatComposer
        value={guidance}
        onChange={setGuidance}
        onSend={() => {
          if (!guidance.trim()) return;
          messageMutation.mutate({ message: guidance.trim() });
        }}
        isSending={messageMutation.isPending}
        presets={presets}
        connectors={connectors}
        busy={experimentBusy || runExtrasBusy}
        onConnectorPresetRun={async (input) => {
          setRunExtrasBusy(true);
          try {
            await onConnectorPresetRun(input);
          } finally {
            setRunExtrasBusy(false);
          }
        }}
        onUploadRun={async (input) => {
          setRunExtrasBusy(true);
          try {
            await onUploadRun(input);
          } finally {
            setRunExtrasBusy(false);
          }
        }}
      />
      {messageMutation.error ? (
        <p className="px-4 pb-2 text-center text-xs text-[var(--danger)]">{(messageMutation.error as Error).message}</p>
      ) : null}
    </div>
  );
}
