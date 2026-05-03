import type { ProofReceipt } from "@factuam/shared-types";

export type factuamToolInput = {
  query: string;
  datasetId?: string;
  evidenceMode?: "auto" | "required" | "disabled";
};

export type factuamToolOutput = {
  experimentId: string;
  finalAnswer?: string;
  proofReceipt?: ProofReceipt;
  verificationStatus?: string;
};

export function createfactuamTool(
  runner: (input: factuamToolInput) => Promise<factuamToolOutput>
) {
  return {
    name: "factuam.runEvidenceExperiment",
    description: "Runs an evidence-backed ML/backtest experiment for predictive agent claims.",
    inputSchema: {
      query: "string",
      datasetId: "string | optional",
      evidenceMode: "auto | required | disabled"
    },
    execute: runner
  };
}
