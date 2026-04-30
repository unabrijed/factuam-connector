import type { ProofReceipt } from "@factum/shared-types";

export type FactumToolInput = {
  query: string;
  datasetId?: string;
  evidenceMode?: "auto" | "required" | "disabled";
};

export type FactumToolOutput = {
  experimentId: string;
  finalAnswer?: string;
  proofReceipt?: ProofReceipt;
  verificationStatus?: string;
};

export function createFactumTool(
  runner: (input: FactumToolInput) => Promise<FactumToolOutput>
) {
  return {
    name: "factum.runEvidenceExperiment",
    description: "Runs an evidence-backed ML/backtest experiment for predictive agent claims.",
    inputSchema: {
      query: "string",
      datasetId: "string | optional",
      evidenceMode: "auto | required | disabled"
    },
    execute: runner
  };
}
