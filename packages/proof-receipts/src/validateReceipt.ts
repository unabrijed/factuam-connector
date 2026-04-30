import { ProofReceiptSchema, type ProofReceipt } from "@factum/shared-types";

export function validateReceipt(input: unknown): ProofReceipt {
  return ProofReceiptSchema.parse(input);
}
