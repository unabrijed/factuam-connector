"use client";

import type { ReactNode } from "react";

type AppChatShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  onOpenMobileNav: () => void;
};

export function AppChatShell({ sidebar, children, onOpenMobileNav }: AppChatShellProps) {
  return (
    <div className="flex h-[calc(100dvh-11rem)] max-h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] md:flex-row">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 md:hidden">
        <button
          type="button"
          className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-medium text-[var(--text)]"
          onClick={onOpenMobileNav}
          aria-haspopup="true"
        >
          Chats
        </button>
        <span className="truncate text-xs text-[var(--muted)]">factuam</span>
      </div>
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
