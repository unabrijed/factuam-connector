import { ProofReadService } from "../services/proof-read.service";

const proofReadService = new ProofReadService();

export async function getProofController(receiptId: string) {
  return proofReadService.getById(receiptId);
}
