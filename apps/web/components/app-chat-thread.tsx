"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getConnectorRun, getExperiment, sendExperimentMessage } from "../lib/api";
import { appConfig } from "../lib/config";
import { experimentPollIntervalMs, isExperimentTerminal } from "../lib/experiment-query";
import { ArtifactList } from "./artifact-list";
import { ConnectorStageTimeline } from "./connector-stage-timeline";
import { ExperimentTimeline } from "./experiment-timeline";
import { Badge, Button, Card, SectionTitle, formatLabel } from "./ui";

type AppChatThreadProps = {
  experimentId: string;
  connectorRunId?: string | null;
  onNewChat: () => void;
};

export function AppChatThread({ experimentId, connectorRunId, onNewChat }: AppChatThreadProps) {
  const showDevDetails = process.env.NODE_ENV === "development";
  const queryClient = useQueryClient();
  const [guidance, setGuidance] = useState("");
  const [streamConnected, setStreamConnected] = useState(false);
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

  if (query.isLoading) {
    return (
      <div className="flex min-h-[min(24rem,50vh)] flex-col">
        <p className="text-sm text-[var(--text-soft)]">Loading…</p>
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="space-y-4">
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Question</p>
            <p className="text-sm leading-7 text-[var(--text)]">{experiment.query ?? "—"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={completedOk ? "success" : terminal ? "danger" : "accent"}>
              {formatLabel(experiment.status)}
            </Badge>
            <Badge tone={streamConnected ? "success" : "default"}>{streamConnected ? "Live" : "Polling"}</Badge>
            {experiment.confidence ? <Badge>{formatLabel(experiment.confidence)}</Badge> : null}
            {connectorStage && !terminal ? <Badge tone="warning">{formatLabel(connectorStage)}</Badge> : null}
            {receiptId ? (
              <Link
                className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
                href={`/proofs/${receiptId}`}
              >
                Open proof
              </Link>
            ) : null}
          </div>

          {!terminal ? (
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-soft)]">Working on it…</p>
              {currentMessage ? <p className="text-xs text-[var(--muted)]">{currentMessage}</p> : null}
              {connectorStageMessage ? <p className="text-xs text-[var(--muted)]">{connectorStageMessage}</p> : null}
              {connectorRunId ? <ConnectorStageTimeline stage={connectorStage} failed={connectorFailed} /> : null}
            </div>
          ) : completedOk ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Answer</p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--text)]">{experiment.finalAnswer ?? "—"}</pre>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">What failed</p>
              <p className="text-sm text-[var(--danger)]">{experiment.errorMessage ?? formatLabel(experiment.status)}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <SectionTitle title="Guide the agent" subtitle="Add instructions, constraints, or data-cleaning suggestions. Terminal experiments will be re-queued automatically." />
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!guidance.trim()) return;
              messageMutation.mutate({ message: guidance.trim() });
            }}
          >
            <textarea
              className="min-h-[112px] w-full rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              placeholder="Example: Drop text-heavy columns, focus on price/country/variety, and retry with a simpler regression if training fails."
              value={guidance}
              onChange={(event) => setGuidance(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={messageMutation.isPending || !guidance.trim()}>
                {messageMutation.isPending ? "Sending…" : "Send guidance"}
              </Button>
              {messageMutation.error ? (
                <p className="text-sm text-[var(--danger)]">{(messageMutation.error as Error).message}</p>
              ) : (
                <p className="text-xs text-[var(--muted)]">Your guidance is saved as experiment context and used on reruns/retries.</p>
              )}
            </div>
          </form>
        </Card>

        <details className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-[var(--text)]">View run details</summary>
          <div className="mt-4 space-y-4">
            {!completedOk ? (
              <Card>
                <SectionTitle title="Experiment timeline" />
                <ExperimentTimeline status={experiment.status} />
              </Card>
            ) : null}

            {connectorRunId ? (
              <Card>
                <SectionTitle title="Kaggle connector" />
                <div className="space-y-3">
                  {connectorStageMessage ? <p className="text-sm text-[var(--text-soft)]">{connectorStageMessage}</p> : null}
                  <ConnectorStageTimeline stage={connectorStage} failed={connectorFailed} />
                </div>
              </Card>
            ) : null}

            {terminal && (experiment.confidence || backtest) ? (
              <Card className="space-y-2">
                <SectionTitle title="Summary" />
                <div className="grid gap-2 sm:grid-cols-3 text-sm text-[var(--text-soft)]">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Status</div>
                    <div className="mt-1 text-[var(--text)]">{formatLabel(experiment.status)}</div>
                  </div>
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

            {progress.length ? (
              <Card className="space-y-2">
                <SectionTitle title="Progress log" />
                <div className="space-y-2 text-xs text-[var(--text-soft)]">
                  {progress.slice(-8).reverse().map((entry, index) => (
                    <div key={`${entry.ts ?? "progress"}-${index}`} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="font-medium text-[var(--text)]">{entry.stage ?? "stage"}</div>
                      <div>{entry.message ?? "—"}</div>
                      {entry.ts ? <div className="mt-1 text-[var(--muted)]">{entry.ts}</div> : null}
                      {entry.details && Object.keys(entry.details).length ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[var(--muted)]">Details</summary>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[11px] leading-5 text-[var(--text-soft)]">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {diagnoses.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Dataset diagnosis" subtitle="Structured research the agent uses before choosing retries." />
                {(() => {
                  const diagnosis = (diagnoses[diagnoses.length - 1]?.diagnosisJson ?? {}) as Record<string, unknown>;
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--text)]">{String(diagnosis.summary ?? "—")}</p>
                      <div className="flex flex-wrap gap-2">
                        {diagnosis.targetKind ? <Badge>{formatLabel(String(diagnosis.targetKind))}</Badge> : null}
                        {diagnosis.targetQuality ? <Badge tone="warning">{formatLabel(String(diagnosis.targetQuality))}</Badge> : null}
                        {diagnosis.taskTypeFit ? <Badge tone="accent">{formatLabel(String(diagnosis.taskTypeFit))}</Badge> : null}
                        {diagnosis.textStrategy ? <Badge tone="default">{formatLabel(String(diagnosis.textStrategy))}</Badge> : null}
                      </div>
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
                <SectionTitle title="Strategy decisions" subtitle="Why the manager selected each attempt strategy." />
                <div className="space-y-3">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="rounded-[22px] border border-[var(--border)] p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone="accent">Attempt {decision.attemptNumber}</Badge>
                      </div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[11px] leading-5 text-[var(--text-soft)]">
                        {JSON.stringify(decision.decisionJson ?? {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {attempts.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Iteration attempts" subtitle="See how the agent retried different data/model strategies." />
                <div className="space-y-3">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="rounded-[22px] border border-[var(--border)] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={attempt.status === "selected" ? "success" : attempt.status === "failed" ? "danger" : "accent"}>
                          Attempt {attempt.attemptNumber}
                        </Badge>
                        <Badge>{formatLabel(attempt.status)}</Badge>
                        {attempt.strategy ? <Badge tone="warning">{formatLabel(attempt.strategy)}</Badge> : null}
                      </div>
                      {attempt.notes ? <p className="mt-2 text-sm text-[var(--text-soft)]">{attempt.notes}</p> : null}
                      {attempt.summaryJson ? (
                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[11px] leading-5 text-[var(--text-soft)]">
                          {JSON.stringify(attempt.summaryJson, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {reflections.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Attempt reflections" subtitle="What the agent learned from each attempt." />
                <div className="space-y-3">
                  {reflections.map((reflection) => (
                    <div key={reflection.id} className="rounded-[22px] border border-[var(--border)] p-4">
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 text-[11px] leading-5 text-[var(--text-soft)]">
                        {JSON.stringify(reflection.reflectionJson ?? {}, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {messages.length ? (
              <Card className="space-y-3">
                <SectionTitle title="Agent conversation" subtitle="Directions you gave and acknowledgements from the agent." />
                <div className="space-y-3">
                  {messages.slice(-12).map((message) => (
                    <div key={message.id} className="rounded-[22px] border border-[var(--border)] p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={message.role === "user" ? "accent" : message.role === "agent" ? "success" : "default"}>
                          {formatLabel(message.role)}
                        </Badge>
                        {message.createdAt ? <span className="text-xs text-[var(--muted)]">{message.createdAt}</span> : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text)]">{message.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {completedOk && !receiptId ? <ArtifactList artifacts={experiment.artifacts ?? []} /> : null}
          </div>
        </details>
      </div>

      <div className="shrink-0 border-t border-[var(--border)] pt-4">
        <Button type="button" className="w-full sm:w-auto" onClick={onNewChat}>
          New chat
        </Button>
      </div>
    </div>
  );
}
