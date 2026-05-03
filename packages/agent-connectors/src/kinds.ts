/**
 * Agent-facing connector taxonomy (capabilities exposed as tools), distinct from
 * `@factuam/connector-sdk` “dataset import” connectors (Kaggle, URL CSV).
 */
export type AgentConnectorKind = "data_source" | "compute" | "verification" | "discovery";
