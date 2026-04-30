"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Badge, formatLabel } from "./ui";

export type ChatMessage = {
  id: string;
  role: "user" | "agent" | "system";
  message: string;
  createdAt?: string;
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
  /** Shown under the last bubble while run is active */
  statusLine?: string | null;
  connectorLine?: string | null;
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
            ? "max-w-[min(100%,36rem)] rounded-[22px] bg-[color:rgba(120,210,255,0.18)] px-4 py-3 text-sm leading-7 text-[var(--text)]"
            : "max-w-[min(100%,40rem)] rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-7 text-[var(--text)]"
        }
      >
        {children}
      </div>
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
  statusLine,
  connectorLine
}: ChatTranscriptProps) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <Bubble role="user">
        <p className="whitespace-pre-wrap">{initialQuery || "—"}</p>
      </Bubble>

      {messages.map((m) => (
        <Bubble key={m.id} role={m.role === "user" ? "user" : "assistant"}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={m.role === "user" ? "accent" : "default"}>{formatLabel(m.role)}</Badge>
            {m.createdAt ? <span className="text-[11px] text-[var(--muted)]">{m.createdAt}</span> : null}
          </div>
          <p className="whitespace-pre-wrap">{m.message}</p>
        </Bubble>
      ))}

      {!terminal && (statusLine || connectorLine) ? (
        <div className="pl-1 text-xs text-[var(--muted)]">
          {statusLine ? <p className="text-[var(--text-soft)]">{statusLine}</p> : null}
          {connectorLine ? <p>{connectorLine}</p> : null}
        </div>
      ) : null}

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
          <pre className="whitespace-pre-wrap font-sans">{finalAnswer}</pre>
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
