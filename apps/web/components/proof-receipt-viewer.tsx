import { Badge, Card, SectionTitle } from "./ui";

export function ProofReceiptViewer({ proof }: { proof: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge tone={proof.verificationStatus === "verified" ? "success" : "warning"}>Receipt</Badge>
        <h1 className="text-3xl font-semibold text-[var(--text)] sm:text-4xl">Proof</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-4">
          <div>
            <div className="text-sm text-[var(--muted)]">Status</div>
            <div className="mt-1 text-lg font-medium text-[var(--text)]">{proof.verificationStatus}</div>
          </div>
          <div>
            <div className="text-sm text-[var(--muted)]">Hash</div>
            <div className="mt-1 break-all font-mono text-xs text-[var(--text-soft)]">{proof.receiptHash}</div>
          </div>
          {proof.ogStorageUri ? (
            <div>
              <div className="text-sm text-[var(--muted)]">Storage</div>
              <a className="mt-1 block break-all font-mono text-xs" href={proof.ogStorageUri}>
                {proof.ogStorageUri}
              </a>
            </div>
          ) : null}
          {proof.onchainTxHash ? (
            <div>
              <div className="text-sm text-[var(--muted)]">Tx</div>
              <div className="mt-1 break-all font-mono text-xs text-[var(--text-soft)]">{proof.onchainTxHash}</div>
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionTitle title="Proof details" />
          <details>
            <summary className="cursor-pointer text-sm text-[var(--text-soft)]">
              Advanced receipt details
            </summary>
            <div className="mt-3 space-y-3 text-sm text-[var(--text-soft)]">
              {proof.chain?.network ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Network</div>
                  <div>{proof.chain.network}</div>
                </div>
              ) : null}
              {proof.chain?.txHash ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Chain Tx</div>
                  <div className="break-all font-mono text-xs">{proof.chain.txHash}</div>
                </div>
              ) : null}
              {proof.reeVerification?.receiptHash ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Verifier receipt</div>
                  <div className="break-all font-mono text-xs">{proof.reeVerification.receiptHash}</div>
                </div>
              ) : null}
              {proof.agentTrace?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Agent trace</div>
                  <div>{proof.agentTrace.length} steps recorded</div>
                </div>
              ) : null}
            </div>
          </details>
          <details>
            <summary className="cursor-pointer text-sm text-[var(--text-soft)]">Raw JSON</summary>
            <pre className="mt-3 overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-xs leading-6 text-[var(--text-soft)]">
              {JSON.stringify(proof.receipt, null, 2)}
            </pre>
          </details>
        </Card>
      </div>
    </div>
  );
}
