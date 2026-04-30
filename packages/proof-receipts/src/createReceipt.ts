import type { ProofReceipt } from "@factum/shared-types";
import { ProofReceiptSchema } from "@factum/shared-types";

export type CreateReceiptInput = Omit<ProofReceipt, "project" | "version"> & {
  version?: string;
};

export function createReceipt(input: CreateReceiptInput): ProofReceipt {
  return ProofReceiptSchema.parse({
    version: input.version ?? "0.1.0",
    project: "Factum",
    ...input
  });
}
