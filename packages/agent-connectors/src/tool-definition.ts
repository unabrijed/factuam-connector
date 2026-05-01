import type { z } from "zod";
import type { AgentConnectorKind } from "./kinds";
import type { AgentImplementationBinding } from "./bindings";

export type AgentToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  /** Stable id for registration and traces, e.g. `dataset.import_kaggle`. */
  id: string;
  kind: AgentConnectorKind;
  title: string;
  description: string;
  binding: AgentImplementationBinding;
  /** Validate agent-produced arguments before invoking the binding. */
  inputSchema: TSchema;
};
