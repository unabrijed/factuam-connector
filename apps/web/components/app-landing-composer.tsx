"use client";

import { useEffect, useState } from "react";
import type { ConnectorManifest, ConnectorPreset } from "../lib/api";
import { Badge, Button, Card, SectionTitle } from "./ui";

type AppLandingComposerProps = {
  error: string | null;
  busy: boolean;
  onPresetSubmit: (input: { query: string; connectorRequest: ConnectorPreset["connectorRequest"] }) => void | Promise<void>;
  /** Search Kaggle via the API for a CSV dataset from the prompt (no preset). */
  onKaggleDiscoverSubmit?: (input: { query: string }) => void | Promise<void>;
  /** Create experiment with no dataset — the orchestrator will auto-discover from Kaggle. */
  onAutoDiscoverSubmit?: (input: { query: string }) => void | Promise<void>;
  presets: ConnectorPreset[];
  connectors: ConnectorManifest[];
  /** Tighter copy when shown inside the chat shell */
  embedded?: boolean;
};

export function AppLandingComposer({
  error,
  busy,
  onPresetSubmit,
  onKaggleDiscoverSubmit,
  onAutoDiscoverSubmit,
  presets,
  connectors,
  embedded
}: AppLandingComposerProps) {
  const [query, setQuery] = useState("");
  const [connectorMenuOpen, setConnectorMenuOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [discoverKaggle, setDiscoverKaggle] = useState(false);
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? presets[0];
  const visibleConnectors = connectors;

  useEffect(() => {
    if (!selectedPresetId && presets[0]?.id) {
      setSelectedPresetId(presets[0].id);
      return;
    }

    if (selectedPreset?.query) {
      setQuery(selectedPreset.query);
    }
  }, [selectedPreset?.id, selectedPreset?.query, selectedPresetId, presets]);

  const blockedHint = !busy && !query.trim()
    ? discoverKaggle
      ? "Add a search prompt (at least 5 characters)."
      : selectedPreset
        ? "Add a question for the connector run."
        : "Add a question — the agent will find a dataset for you."
    : null;

  return (
    <div className={embedded ? "mx-auto max-w-2xl space-y-5" : "mx-auto max-w-3xl space-y-6"}>
      <div className="space-y-2">
        <h1
          className={
            embedded
              ? "text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl"
              : "text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl"
          }
        >
          {embedded ? "New experiment" : "Run an experiment"}
        </h1>
        <p className="text-sm text-[var(--text-soft)]">
          {discoverKaggle
            ? "Search Kaggle from your prompt, import one match, then run."
            : selectedPreset
              ? "Edit the question, then run on the selected dataset."
              : "Ask a question — the agent will find a Kaggle dataset and run."}
        </p>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      </div>

      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle title="Connectors" subtitle="Ready-to-use connectors stay simple in the default UI." />
          <div className="relative">
            <button
              type="button"
              aria-label="Add connector"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] text-lg font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
              onClick={() => setConnectorMenuOpen((open) => !open)}
              disabled={busy}
            >
              +
            </button>
            {connectorMenuOpen ? (
              <div className="absolute right-0 top-11 z-10 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
                <div className="space-y-2">
                  {visibleConnectors.length ? (
                    visibleConnectors.map((connector) => {
                      const connectorPreset = presets.find((preset) => preset.connectorProvider === connector.provider);
                      const active = connectorPreset?.id === selectedPreset?.id;
                      return (
                        <button
                          key={connector.connectorId}
                          type="button"
                          className={`w-full rounded-xl border px-3 py-2 text-left ${active ? "border-[var(--accent)] bg-[var(--surface-strong)]" : "border-[var(--border-strong)] bg-[var(--surface-strong)]"}`}
                          onClick={() => {
                            if (connectorPreset) setSelectedPresetId(connectorPreset.id);
                            setConnectorMenuOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-[var(--text)]">{connector.displayName}</p>
                              <p className="text-xs text-[var(--muted)]">{connectorPreset ? connectorPreset.label : "No preset yet"}</p>
                            </div>
                            <Badge tone={active ? "accent" : "default"}>{active ? "Ready" : "Available"}</Badge>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[var(--muted)]">Loading connectors…</p>
                  )}
                  <p className="text-xs text-[var(--muted)]">Infrastructure-only systems stay hidden from this picker.</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            {discoverKaggle ? "Kaggle discover" : selectedPreset ? selectedPreset.connectorProvider : "Auto-discover"}
          </Badge>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <input
            type="checkbox"
            className="mt-1"
            checked={discoverKaggle}
            onChange={(e) => setDiscoverKaggle(e.target.checked)}
            disabled={busy || !onKaggleDiscoverSubmit}
          />
          <span className="text-sm text-[var(--text)]">
            <span className="font-medium">Search Kaggle for a dataset</span>
            <span className="mt-1 block text-xs text-[var(--muted)]">
              Find a public dataset matching your prompt instead of using a preset.
            </span>
          </span>
        </label>

        {discoverKaggle ? (
          <p className="text-xs text-[var(--muted)]">The best matching public Kaggle CSV dataset is imported automatically.</p>
        ) : selectedPreset ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-sm text-[var(--text)]">{selectedPreset.label}</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{selectedPreset.description}</p>
          </div>
        ) : null}

        <div className="space-y-4">
          <textarea
            className="min-h-[10rem] w-full rounded-[24px] border border-[var(--border-strong)] bg-[var(--surface-strong)] px-5 py-4 text-sm leading-7 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            placeholder={
              discoverKaggle
                ? "e.g. wine quality, titanic survival, house prices"
                : "What would you like to analyze? e.g. predict wine quality"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={busy}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-[1.25rem] text-xs text-[var(--warning)]">
              {blockedHint ?? (
                discoverKaggle
                  ? "Use at least 5 characters to search Kaggle."
                  : "The agent will run on a matching dataset."
              )}
            </div>
            <Button
              type="button"
              disabled={
                busy ||
                !query.trim() ||
                (discoverKaggle
                  ? query.trim().length < 5 || !onKaggleDiscoverSubmit
                  : false)
              }
              title={
                busy
                  ? "…"
                  : !query.trim()
                    ? "Prompt required"
                    : discoverKaggle
                      ? query.trim().length < 5
                        ? "At least 5 characters"
                        : !onKaggleDiscoverSubmit
                          ? "Discovery not wired"
                          : "Run"
                      : selectedPreset
                        ? "Run with preset"
                        : "Let agent find dataset & run"
              }
              onClick={() => {
                if (discoverKaggle && onKaggleDiscoverSubmit && query.trim().length >= 5) {
                  void onKaggleDiscoverSubmit({ query: query.trim() });
                  return;
                }
                if (!discoverKaggle && selectedPreset) {
                  void onPresetSubmit({
                    query: query.trim(),
                    connectorRequest: selectedPreset.connectorRequest
                  });
                  return;
                }
                if (!discoverKaggle && !selectedPreset && onAutoDiscoverSubmit) {
                  void onAutoDiscoverSubmit({ query: query.trim() });
                }
              }}
            >
              {busy ? "…" : discoverKaggle ? "Search Kaggle & run" : selectedPreset ? "Run" : "Auto-discover & run"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
