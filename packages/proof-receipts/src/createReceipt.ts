import type { ProofReceipt } from "@factuam/shared-types";
import { ProofReceiptSchema } from "@factuam/shared-types";

export type CreateReceiptInput = Omit<ProofReceipt, "project" | "version"> & {
  version?: string;
};

export function createReceipt(input: CreateReceiptInput): ProofReceipt {
  return ProofReceiptSchema.parse({
    version: input.version ?? "0.1.0",
    project: "factuam",
    ...input
  });
}
