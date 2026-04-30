"use client";

import type { ExperimentRecent } from "../lib/experiment-recents";
import { formatLabel } from "./ui";

type ChatSidebarProps = {
  recents: ExperimentRecent[];
  activeExperimentId: string | null;
  onSelectRecent: (id: string) => void;
  onNewChat: () => void;
  /** When true, sidebar is fixed overlay (mobile) */
  open: boolean;
  onClose: () => void;
};

export function ChatSidebar({ recents, activeExperimentId, onSelectRecent, onNewChat, open, onClose }: ChatSidebarProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close chat list"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={
          open
            ? "fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-[var(--border)] bg-[var(--surface-elevated)] shadow-xl md:static md:z-0 md:w-64 md:shrink-0 md:rounded-l-[24px] md:border-r md:shadow-none"
            : "hidden md:flex md:w-64 md:shrink-0 md:flex-col md:rounded-l-[24px] md:border-r md:border-[var(--border)] md:bg-[var(--surface-elevated)]"
        }
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-3 md:rounded-tl-[24px]">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Chats</span>
          <button
            type="button"
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-strong)] md:hidden"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          className="mx-3 mt-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-3 py-2.5 text-left text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          onClick={() => {
            onNewChat();
            onClose();
          }}
        >
          + New chat
        </button>
        <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-4" aria-label="Recent experiments">
          {recents.length === 0 ? (
            <p className="px-2 py-4 text-xs text-[var(--muted)]">Runs you start will appear here on this device.</p>
          ) : (
            <ul className="space-y-1">
              {recents.map((r) => {
                const active = r.id === activeExperimentId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRecent(r.id);
                        onClose();
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-[var(--accent-faint)] text-[var(--text)]"
                          : "text-[var(--text-soft)] hover:bg-[var(--surface-strong)]"
                      }`}
                    >
                      <span className="line-clamp-2">{r.title || "Untitled run"}</span>
                      {r.status ? (
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{formatLabel(r.status)}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
}
