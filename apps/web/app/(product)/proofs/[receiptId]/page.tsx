import { ProofPageClient } from "../../../../components/proof-page-client";

export default async function ProofPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params;
  return <ProofPageClient receiptId={receiptId} />;
}
