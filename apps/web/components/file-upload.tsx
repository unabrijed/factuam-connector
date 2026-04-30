"use client";

import { ChangeEvent, useState } from "react";
import { uploadDataset } from "../lib/api";
import { workflowPresetsConfig } from "../lib/workflow-presets";
import { Badge, Card, SectionTitle } from "./ui";

export function DatasetUpload({ onUploaded }: { onUploaded: (dataset: { datasetId: string; name: string; rowCount: number; columnCount: number }) => void }) {
  const [name, setName] = useState(workflowPresetsConfig.sampleDataset.uploadName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await uploadDataset(file, name || file.name);
      onUploaded(result);
      setMessage(`${result.rowCount} × ${result.columnCount}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle title="Data" />
        <Badge tone="accent">CSV</Badge>
      </div>
      <div className="space-y-3 text-sm">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 py-3 text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
          placeholder="Name"
        />
        <label className="flex cursor-pointer items-center justify-between rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-4 text-[var(--text-soft)] transition hover:border-[var(--accent)]">
          <span>{busy ? "…" : "Choose file"}</span>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">.csv</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} disabled={busy} />
        </label>
        {message ? <p className="text-sm text-[var(--text-soft)]">{message}</p> : null}
      </div>
    </Card>
  );
}
