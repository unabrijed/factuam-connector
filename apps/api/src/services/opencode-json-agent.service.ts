import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2/client";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z, type ZodTypeAny } from "zod";
import { config } from "../config";

let client: OpencodeClient | null = null;

function getClient(): OpencodeClient {
  if (!client) {
    client = createOpencodeClient({
      baseUrl: config.OPENCODE_BASE_URL
    });
  }
  return client;
}

function splitOpencodeModel(model: string): { providerID: string; modelID: string } {
  const i = model.indexOf("/");
  if (i <= 0 || i === model.length - 1) {
    throw new Error(
      `OPENCODE_MODEL must be "provider/model" (e.g. opencode/gpt-5-nano), got: ${model}`
    );
  }
  return { providerID: model.slice(0, i), modelID: model.slice(i + 1) };
}

export class OpencodeJsonAgentService {
  async run<TSchema extends ZodTypeAny>(input: {
    systemPrompt: string;
    payload: unknown;
    schema: TSchema;
  }): Promise<z.infer<TSchema>> {
    const zodSchema = input.schema;
    const jsonSchema = zodToJsonSchema(zodSchema, {
      target: "jsonSchema7",
      $refStrategy: "none"
    }) as Record<string, unknown>;

    const model = splitOpencodeModel(config.OPENCODE_MODEL);
    const api = getClient();
    const dirOpts = config.OPENCODE_DIRECTORY ? { directory: config.OPENCODE_DIRECTORY } : {};

    const created = await api.session.create({
      title: "factuam-json-agent",
      ...dirOpts
    });

    if (created.error ?? !created.data) {
      throw new Error(
        `OpenCode session.create failed: ${created.error ? JSON.stringify(created.error) : "no data"}`
      );
    }

    const sessionID = created.data.id;

    try {
      const result = await api.session.prompt({
        sessionID,
        system: input.systemPrompt,
        model,
        format: {
          type: "json_schema",
          schema: jsonSchema,
          retryCount: 2
        },
        parts: [{ type: "text", text: JSON.stringify(input.payload, null, 2) }],
        ...dirOpts
      });

      if (result.error ?? !result.data) {
        throw new Error(
          `OpenCode prompt failed: ${result.error ? JSON.stringify(result.error) : "no data"}`
        );
      }

      const info = result.data.info;
      if (info == null) {
        throw new Error(
          `OpenCode prompt returned no assistant message (missing info). Check OpenCode server logs, OPENCODE_MODEL (${config.OPENCODE_MODEL}), and provider authentication. Common causes: ProviderModelNotFoundError — pick a model listed by GET ${config.OPENCODE_BASE_URL.replace(/\/$/, "")}/config/providers on your OpenCode server.`
        );
      }

      if (info.error) {
        const err = info.error;
        if (err.name === "StructuredOutputError") {
          throw new Error(
            `Structured output failed: ${err.data.message} (retries: ${err.data.retries})`
          );
        }
        const msg =
          "data" in err && err.data && typeof err.data === "object" && "message" in err.data
            ? String((err.data as { message?: unknown }).message)
            : JSON.stringify(err);
        throw new Error(`OpenCode message error: ${err.name} ${msg}`);
      }

      const structured = info.structured;
      if (structured === undefined || structured === null) {
        throw new Error("OpenCode returned no structured output");
      }

      try {
        return zodSchema.parse(structured);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(
            `Schema validation failed: ${error.message}\nRaw structured: ${JSON.stringify(structured)}`
          );
        }
        throw error;
      }
    } finally {
      await api.session.delete({ sessionID, ...dirOpts });
    }
  }
}
