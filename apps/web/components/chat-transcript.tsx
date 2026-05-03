"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Badge, formatLabel } from "./ui";
import { AgentPipelinePanel } from "./agent-pipeline-panel";
import type { ProgressEntry } from "../lib/thinking-narrative";

export type ChatMessage = {
  id: string;
  role: "user" | "agent" | "system";
  message: string;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
};

type ChatTranscriptProps = {
  initialQuery: string;
  messages: ChatMessage[];
  finalAnswer?: string | null;
  terminal: boolean;
  completedOk: boolean;
  errorMessage?: string | null;
  statusLabel: string;
  receiptId?: string;
  progress: ProgressEntry[];
  experimentStatus?: string;
  attemptCount?: number;
  maxAttempts?: number;
};

function Bubble({
  role,
  children
}: {
  role: "user" | "assistant" | "system";
  children: ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[min(100%,36rem)] rounded-[22px] bg-[var(--accent-faint)] px-4 py-3 text-sm leading-7 text-[var(--text)]"
            : "max-w-[min(100%,40rem)] rounded-[22px] border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3 text-sm leading-7 text-[var(--text)]"
        }
      >
        {children}
      </div>
    </div>
  );
}

function MessageContent({ text, role }: { text: string; role: string }) {
  if (role === "user") {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }
  return (
    <div className="prose-sm">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

export function ChatTranscript({
  initialQuery,
  messages,
  finalAnswer,
  terminal,
  completedOk,
  errorMessage,
  statusLabel,
  receiptId,
  progress,
  experimentStatus,
  attemptCount,
  maxAttempts
}: ChatTranscriptProps) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <Bubble role="user">
        <p className="whitespace-pre-wrap">{initialQuery || "—"}</p>
      </Bubble>

      {progress.length > 0 ? (
        <div className="flex w-full justify-start">
          <div className="max-w-[min(100%,40rem)] w-full">
            <AgentPipelinePanel
              progress={progress}
              experimentStatus={experimentStatus}
              terminal={terminal}
              attemptCount={attemptCount}
              maxAttempts={maxAttempts}
            />
          </div>
        </div>
      ) : null}

      {messages.map((m) => (
        <Bubble key={m.id} role={m.role === "user" ? "user" : "assistant"}>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={m.role === "user" ? "accent" : "default"}>{formatLabel(m.role)}</Badge>
            {m.createdAt ? <span className="text-[11px] text-[var(--muted)]">{m.createdAt}</span> : null}
          </div>
          <MessageContent text={m.message} role={m.role} />
        </Bubble>
      ))}

      {terminal && completedOk && finalAnswer ? (
        <Bubble role="assistant">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="success">Answer</Badge>
            {receiptId ? (
              <Link
                className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                href={`/proofs/${receiptId}`}
              >
                Open proof
              </Link>
            ) : null}
          </div>
          <div className="prose-sm">
            <ReactMarkdown>{finalAnswer}</ReactMarkdown>
          </div>
        </Bubble>
      ) : null}

      {terminal && !completedOk ? (
        <Bubble role="assistant">
          <Badge tone="danger" className="mb-2">
            {statusLabel}
          </Badge>
          <p className="text-[var(--danger)]">{errorMessage ?? "Something went wrong."}</p>
        </Bubble>
      ) : null}
    </div>
  );
}
