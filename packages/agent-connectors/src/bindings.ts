import type { ConnectorProvider } from "@factuam/shared-types";

/**
 * Where a capability is implemented today (API service / worker) or marked planned.
 * Used by the orchestrator or tool-router to attach structured calls — no runtime dispatch here.
 */
export type AgentImplementationBinding =
  | {
      type: "connector_registry";
      provider: ConnectorProvider;
      /** Relative API route shape for operators; actual HTTP lives in apps/api. */
      route: "/api/connectors/run";
    }
  | {
      type: "ml_worker_http";
      path: "/ml/validate-dataset" | "/ml/run-experiment";
      baseUrlEnv: "ML_WORKER_URL";
    }
  | {
      type: "api_internal";
      service: "ProofReadService";
      method: "getById";
    }
  | {
      type: "planned";
      id: string;
      summary: string;
    };
