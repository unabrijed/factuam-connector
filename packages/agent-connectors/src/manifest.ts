import type { AgentConnectorKind } from "./kinds";
import type { AgentToolDefinition } from "./tool-definition";
import { allCapabilityTools } from "./capabilities";

export type AgentConnectorManifestEntry = {
  id: string;
  kind: AgentConnectorKind;
  title: string;
  description: string;
  binding: AgentToolDefinition["binding"];
};

/**
 * Serializable catalog for the orchestrator, UI, or LLM tool lists (no Zod instances).
 */
export function buildAgentConnectorManifest(tools: AgentToolDefinition[] = allCapabilityTools): AgentConnectorManifestEntry[] {
  return tools.map((tool) => ({
    id: tool.id,
    kind: tool.kind,
    title: tool.title,
    description: tool.description,
    binding: tool.binding
  }));
}

export function toolsByKind(
  kind: AgentConnectorKind,
  tools: AgentToolDefinition[] = allCapabilityTools
): AgentToolDefinition[] {
  return tools.filter((t) => t.kind === kind);
}
