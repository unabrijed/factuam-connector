import { z } from "zod";
import type { AgentToolDefinition } from "../tool-definition";

const ProofReceiptLookupInputSchema = z.object({
  receiptId: z.string().min(1)
});

export const verificationTools: AgentToolDefinition[] = [
  {
    id: "proof.get_receipt",
    kind: "verification",
    title: "Load proof receipt by id",
    description: "Fetch a stored proof receipt record for audit and answer grounding.",
    binding: {
      type: "api_internal",
      service: "ProofReadService",
      method: "getById"
    },
    inputSchema: ProofReceiptLookupInputSchema
  },
  {
    id: "gensyn.verify_run",
    kind: "verification",
    title: "Verify Gensyn / chain attestation (planned)",
    description:
      "Future: confirm that a training or inference run was attested (weights hash, dataset hash, REE output). Wire to gensyn-ree / registry when exposing to the agent.",
    binding: {
      type: "planned",
      id: "gensyn_chain_verify",
      summary: "Attested run verification against Gensyn testnet or REE task bundle"
    },
    inputSchema: z.object({
      runId: z.string().min(1),
      expectedDatasetHash: z.string().optional(),
      expectedArtifactHash: z.string().optional()
    })
  }
];

export { ProofReceiptLookupInputSchema };
