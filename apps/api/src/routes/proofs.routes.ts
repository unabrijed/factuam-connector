import { Hono } from "hono";
import { getProofController } from "../controllers/proofs.controller";

export const proofsRouter = new Hono();

proofsRouter.get("/:receiptId", async (c) => {
  const proof = await getProofController(c.req.param("receiptId"));
  if (!proof) {
    return c.json({ error: "Proof receipt not found" }, 404);
  }

  return c.json({
    receiptId: proof.id,
    experimentId: proof.experimentId,
    verificationStatus: proof.verificationStatus,
    receiptHash: proof.receiptHash,
    receipt: proof.receiptJson,
    ogStorageUri: proof.ogStorageUri,
    onchainTxHash: proof.onchainTxHash
  });
});
