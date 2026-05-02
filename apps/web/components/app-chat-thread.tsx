"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConnectorManifest, ConnectorPreset } from "../lib/api";
import { getConnectorRun, getExperiment, sendExperimentMessage } from "../lib/api";
import { appConfig } from "../lib/config";
import { experimentPollIntervalMs, isExperimentTerminal } from "../lib/experiment-query";
import { composeProgressLiveSubtitle } from "../lib/progress-details";
import { AgentThinkingStrip } from "./agent-thinking-strip";
import { ArtifactList } from "./artifact-list";
import { ChatComposer } from "./chat-composer";
import { ChatTranscript } from "./chat-transcript";
import { ConnectorStageTimeline } from "./connector-stage-timeline";
import { ExperimentTimeline } from "./experiment-timeline";
import { Badge, Button, Card, SectionTitle, formatLabel } from "./ui";

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
  const showDevDetails = process.env.NODE_ENV === "development";
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
  const backtest = experiment.latestBacktest;
  const receiptId = experiment.resultSummary?.receiptId as string | undefined;
  const currentMessage = experiment.resultSummary?.currentMessage as string | undefined;
  const currentStage = experiment.resultSummary?.currentStage as string | undefined;
  const progress = Array.isArray(experiment.resultSummary?.progress)
    ? (experiment.resultSummary?.progress as Array<{ stage?: string; message?: string; ts?: string; details?: Record<string, unknown> }>)
    : [];
  const attempts = Array.isArray(experiment.attempts)
    ? (experiment.attempts as Array<{ id: string; attemptNumber: number; status: string; strategy?: string | null; notes?: string | null; summaryJson?: Record<string, unknown> | null }>)
    : [];
  const diagnoses = Array.isArray(experiment.diagnoses)
    ? (experiment.diagnoses as Array<{ id: string; diagnosisJson?: Record<string, unknown>; createdAt?: string }>)
    : [];
  const reflections = Array.isArray(experiment.reflections)
    ? (experiment.reflections as Array<{ id: string; reflectionJson?: Record<string, unknown>; createdAt?: string }>)
    : [];
  const decisions = Array.isArray(experiment.decisions)
    ? (experiment.decisions as Array<{ id: string; attemptNumber: number; decisionJson?: Record<string, unknown>; createdAt?: string }>)
    : [];
  const messages = Array.isArray(experiment.messages)
    ? (experiment.messages as Array<{ id: string; role: "user" | "agent" | "system"; message: string; createdAt?: string; metadata?: Record<string, unknown> | null }>)
    : [];
  const terminal = isExperimentTerminal(experiment.status);
  const completedOk = experiment.status === "COMPLETED";
  const connectorStage = connectorQuery.data?.sourceMeta?.stage as string | undefined;
  const connectorStageMessage = connectorQuery.data?.sourceMeta?.stageMessage as string | undefined;
  const connectorFailed = connectorStage === "failed";

  const statusLine = !terminal ? currentMessage ?? undefined : undefined;
  const latestProgressEntry = progress.length ? progress[progress.length - 1] : null;
  const statusDetailLine = !terminal ? composeProgressLiveSubtitle(latestProgressEntry ?? null) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <Badge tone={completedOk ? "success" : terminal ? "danger" : "accent"}>{formatLabel(experiment.status)}</Badge>
        <Badge tone={streamConnected ? "success" : "default"}>{streamConnected ? "Live" : "Polling"}</Badge>
        {experiment.confidence ? <Badge>{formatLabel(experiment.confidence)}</Badge> : null}
        {connectorStage && !terminal ? <Badge tone="warning">{formatLabel(connectorStage)}</Badge> : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <ChatTranscript
          initialQuery={experiment.query ?? ""}
          messages={messages}
          finalAnswer={experiment.finalAnswer}
          terminal={terminal}
          completedOk={completedOk}
          errorMessage={experiment.errorMessage}
          statusLabel={formatLabel(experiment.status)}
          receiptId={receiptId}
          statusLine={statusLine ?? null}
          statusDetailLine={statusDetailLine ?? null}
          connectorLine={!terminal ? connectorStageMessage ?? null : null}
        />

        {!terminal ? (
          <AgentThinkingStrip
            progress={progress}
            latestStage={typeof currentStage === "string" ? currentStage : undefined}
            experimentStatus={experiment.status}
            terminal={false}
          />
        ) : progress.length > 0 ? (
          <AgentThinkingStrip
            progress={progress}
            latestStage={typeof currentStage === "string" ? currentStage : undefined}
            experimentStatus={experiment.status}
            terminal
          />
        ) : null}

        <details className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)]/50 text-sm">
          <summary className="cursor-pointer px-4 py-3 font-medium text-[var(--text)]">Run details &amp; artifacts</summary>
          <div className="space-y-4 border-t border-[var(--border)] p-4">
            {!completedOk ? (
              <Card>
                <SectionTitle title="Experiment timeline" />
                <ExperimentTimeline status={experiment.status} />
              </Card>
            ) : null}

            {connectorRunId ? (
              <Card>
                <SectionTitle title="Connector" />
                <div className="space-y-3">
                  {connectorStageMessage ? <p className="text-sm text-[var(--text-soft)]">{connectorStageMessage}</p> : null}
                  <ConnectorStageTimeline stage={connectorStage} failed={connectorFailed} />
                </div>
              </Card>
            ) : null}

            {terminal && (experiment.confidence || backtest) ? (
              <Card className="space-y-2">
                <SectionTitle title="Summary" />
                <div className="grid gap-2 text-sm text-[var(--text-soft)] sm:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Confidence</div>
                    <div className="mt-1 text-[var(--text)]">{experiment.confidence ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Lift</div>
                    <div className="mt-1 text-[var(--text)]">{backtest ? `${Number(backtest.liftOverBaseline).toFixed(2)}%` : "—"}</div>
                  </div>
                </div>
              </Card>
            ) : null}

            {showDevDetails ? (
              <Card>
                <SectionTitle title="Debug JSON" />
                <pre className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-xs leading-6 text-[var(--text-soft)]">
                  {JSON.stringify({ experimentPlan: experiment.experimentPlan, resultSummary: experiment.resultSummary }, null, 2)}
                </pre>
              </Card>
            ) : null}

            {diagnoses.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Dataset diagnosis" />
                {(() => {
                  const diagnosis = (diagnoses[diagnoses.length - 1]?.diagnosisJson ?? {}) as Record<string, unknown>;
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--text)]">{String(diagnosis.summary ?? "—")}</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[11px] leading-5 text-[var(--text-soft)]">
                        {JSON.stringify(diagnosis, null, 2)}
                      </pre>
                    </div>
                  );
                })()}
              </Card>
            ) : null}

            {decisions.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Strategy decisions" />
                <div className="space-y-3">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="rounded-[22px] border border-[var(--border)] p-4">
                      <Badge tone="accent" className="mb-2">
                        Attempt {decision.attemptNumber}
                      </Badge>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-[var(--text-soft)]">
                        {JSON.stringify(decision.decisionJson ?? {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {attempts.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Attempts" />
                <div className="space-y-3">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="rounded-[22px] border border-[var(--border)] p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="accent">#{attempt.attemptNumber}</Badge>
                        <Badge>{formatLabel(attempt.status)}</Badge>
                      </div>
                      {attempt.notes ? <p className="mt-2 text-sm text-[var(--text-soft)]">{attempt.notes}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {reflections.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Reflections" />
                {reflections.map((reflection) => (
                  <pre
                    key={reflection.id}
                    className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[11px]"
                  >
                    {JSON.stringify(reflection.reflectionJson ?? {}, null, 2)}
                  </pre>
                ))}
              </Card>
            ) : null}

            {completedOk && !receiptId ? <ArtifactList artifacts={experiment.artifacts ?? []} /> : null}
          </div>
        </details>
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
