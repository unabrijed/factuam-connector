import { Card, SectionTitle } from "../ui";

const sampleJson = `{
  "domain": "trading",
  "data_sources": ["market_ohlcv", "csv_upload"],
  "feature_manifest_hash": "0x...",
  "strategy_config_hash": "0x...",
  "backtest_hash": "0x...",
  "baseline_comparison_hash": "0x...",
  "verification_status": "verified"
}`;

export function ProofTeaser() {
  return (
    <section className="pt-16 sm:pt-20">
      <Card>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <SectionTitle title="Receipt shape" />
          <div className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 font-mono text-xs leading-6 text-[var(--text-soft)]">
            <pre className="whitespace-pre">{sampleJson}</pre>
          </div>
        </div>
      </Card>
    </section>
  );
}
