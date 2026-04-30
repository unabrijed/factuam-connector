"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ConnectorManifest, ConnectorPreset } from "../lib/api";
import { uploadDataset } from "../lib/api";
import { Badge } from "./ui";

type ChatComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isSending: boolean;
  disabled?: boolean;
  placeholder?: string;
  presets: ConnectorPreset[];
  connectors: ConnectorManifest[];
  onConnectorPresetRun: (input: { query: string; connectorRequest: ConnectorPreset["connectorRequest"] }) => void | Promise<void>;
  onUploadRun: (input: { datasetId: string; query: string }) => void | Promise<void>;
  /** While a new experiment is being created from + menu */
  busy?: boolean;
};

export function ChatComposer({
  value,
  onChange,
  onSend,
  isSending,
  disabled,
  placeholder = "Follow up or guide the agent…",
  presets,
  connectors,
  onConnectorPresetRun,
  onUploadRun,
  busy = false
}: ChatComposerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCsvChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadBusy(true);
    setMenuOpen(false);
    try {
      const uploaded = await uploadDataset(file, file.name.replace(/\.[^.]+$/, "") || file.name);
      const q =
        value.trim() ||
        "Run an evidence-backed experiment on this dataset. Summarize findings and uncertainty clearly.";
      await onUploadRun({ datasetId: uploaded.datasetId, query: q });
      onChange("");
    } catch {
      /* parent can add toast later */
    } finally {
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!value.trim() || isSending || disabled) return;
    onSend();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const blocked = disabled || busy || uploadBusy;

  return (
    <div className="relative border-t border-[var(--border)] bg-[var(--surface-elevated)]/95 pt-3">
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Add data or connector"
            aria-expanded={menuOpen}
            className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-lg text-[var(--text)] transition hover:border-[var(--accent)] disabled:opacity-50"
            disabled={blocked}
            onClick={() => setMenuOpen((o) => !o)}
          >
            +
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-30 cursor-default md:hidden"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute bottom-12 left-0 z-40 w-[min(100vw-2rem,18rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl">
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">Add</p>
                <button
                  type="button"
                  className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-strong)]"
                  disabled={uploadBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload CSV…
                </button>
                <div className="my-2 border-t border-[var(--border)]" />
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">Connectors</p>
                <div className="max-h-48 overflow-y-auto">
                  {connectors.length ? (
                    connectors.map((c) => {
                      const preset = presets.find((p) => p.connectorProvider === c.provider);
                      return (
                        <button
                          key={c.connectorId}
                          type="button"
                          disabled={!preset || busy}
                          className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-strong)] disabled:opacity-40"
                          onClick={() => {
                            if (!preset) return;
                            setMenuOpen(false);
                            void onConnectorPresetRun({
                              query: value.trim() || preset.query,
                              connectorRequest: preset.connectorRequest
                            });
                          }}
                        >
                          <span className="font-medium text-[var(--text)]">{c.displayName}</span>
                          <span className="text-[11px] text-[var(--muted)]">
                            {preset ? preset.label : "No preset"}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-2 py-2 text-xs text-[var(--muted)]">Loading…</p>
                  )}
                </div>
                <div className="my-2 border-t border-[var(--border)]" />
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--muted)]"
                  title="Coming soon"
                >
                  Plugins <Badge className="ml-2">Soon</Badge>
                </button>
              </div>
            </>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleCsvChange(e.target.files)}
          />
        </div>

        <div className="relative min-w-0 flex-1">
          <textarea
            rows={1}
            className="max-h-40 min-h-[44px] w-full resize-none rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 pr-14 text-sm leading-6 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            placeholder={placeholder}
            value={value}
            disabled={blocked || isSending}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!value.trim() || isSending || blocked}
            className="absolute bottom-2 right-2 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-sm disabled:opacity-40"
          >
            {isSending ? "…" : "Send"}
          </button>
        </div>
      </form>
      <p className="mt-2 text-center text-[10px] text-[var(--muted)]">
        Shift+Enter for newline. Terminal runs re-queue when you send guidance.
      </p>
    </div>
  );
}
