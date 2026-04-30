"use client";

import { useQuery } from "@tanstack/react-query";
import { getProof } from "../lib/api";
import { ProofReceiptViewer } from "./proof-receipt-viewer";

export function ProofPageClient({ receiptId }: { receiptId: string }) {
  const query = useQuery({
    queryKey: ["proof", receiptId],
    queryFn: () => getProof(receiptId)
  });

  if (query.isLoading) return <div className="text-[var(--text-soft)]">Loading…</div>;
  if (query.error) return <div className="text-[var(--danger)]">Error: {(query.error as Error).message}</div>;

  return <ProofReceiptViewer proof={query.data} />;
}
