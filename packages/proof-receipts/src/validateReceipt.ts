import { ProofReceiptSchema, type ProofReceipt } from "@factuam/shared-types";

export function validateReceipt(input: unknown): ProofReceipt {
  return ProofReceiptSchema.parse(input);
}
