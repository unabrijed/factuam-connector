/**
 * @factuam/agent-connectors — Agent-facing capability definitions (tools + bindings).
 *
 * Relationship to other packages:
 * - `@factuam/connector-sdk`: runtime interface for **dataset import** (artifacts + hashes).
 * - This package: **what the agent is allowed to request** (typed inputs, titles, wiring hints).
 *
 * Next integration loop: register `allCapabilityTools` with the orchestrator or JSON-agent tool
 * router, validate args with each tool’s `inputSchema`, then dispatch to the bound service.
 */

export type { AgentConnectorKind } from "./kinds";
export type { AgentImplementationBinding } from "./bindings";
export type { AgentToolDefinition } from "./tool-definition";
export { buildAgentConnectorManifest, toolsByKind, type AgentConnectorManifestEntry } from "./manifest";
export {
  allCapabilityTools,
  datasetDiscoveryTools,
  datasetSourceTools,
  mlComputeTools,
  verificationTools
} from "./capabilities";
export { DatasetImportInputSchema } from "./capabilities/dataset-source";
export { ValidateDatasetInputSchema, RunExperimentInputSchema } from "./capabilities/ml-compute";
export { ProofReceiptLookupInputSchema } from "./capabilities/verification";
export { KaggleSearchInputSchema } from "./capabilities/dataset-discovery";
