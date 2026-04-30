import { randomUUID } from "node:crypto";
import { getMode, isDevMode } from "@factum/agent-sdk";
import type { AgentTraceEntry } from "@factum/shared-types";
import type { AxlMessageEnvelope } from "@factum/gensyn-axl";
import { AxlTransportClient } from "@factum/gensyn-axl";
import { config } from "../config";

type AxlResponseEnvelope<TResult> = {
  correlationId?: string;
  result?: TResult;
};

/** Inbound AXL messages not yet consumed (upstream /recv pops one message at a time with no peek). */
type BufferedInbound<TResult> = AxlMessageEnvelope<AxlResponseEnvelope<TResult>>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAgentPeers(value?: string): Record<string, string> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    console.warn("Invalid GENSYN_AXL_AGENT_PEERS JSON; falling back to local agent execution");
    return {};
  }
}

const explicitPeers: Record<string, string | undefined> = {
  evidence_classifier: config.AXL_PEER_CLASSIFIER,
  experiment_planner: config.AXL_PEER_PLANNER,
  validation_agent: config.AXL_PEER_VALIDATION,
  diagnosis_agent: config.AXL_PEER_DIAGNOSIS,
  strategy_agent: config.AXL_PEER_STRATEGY,
  training_agent: config.AXL_PEER_TRAINING,
  reflection_agent: config.AXL_PEER_REFLECTION,
  verifier: config.AXL_PEER_VERIFIER,
  answer_generator: config.AXL_PEER_ANSWER
};

function summarizeValue(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return { type: "string", preview: value.slice(0, 160) };
  if (typeof value === "number" || typeof value === "boolean") return { value };
  if (Array.isArray(value)) return { type: "array", length: value.length };
  if (typeof value === "object") {
    return { type: "object", keys: Object.keys(value as Record<string, unknown>).slice(0, 12) };
  }
  return { type: typeof value };
}

export class AxlAgentRouterService {
  private readonly client = new AxlTransportClient({
    apiBaseUrl: config.GENSYN_AXL_API_URL
  });
  private readonly peers = parseAgentPeers(config.GENSYN_AXL_AGENT_PEERS);
  /** Responses or stray messages from other concurrent invocations; re-checked before each /recv. */
  private readonly inboundBuffer: BufferedInbound<unknown>[] = [];

  getPeerId(agent: string) {
    return explicitPeers[agent] ?? this.peers[agent];
  }

  private takeMatchingResponse<TResult>(correlationId: string): BufferedInbound<TResult> | undefined {
    const idx = this.inboundBuffer.findIndex(
      (m) => m.data?.correlationId === correlationId && m.data?.result !== undefined
    );
    if (idx === -1) return undefined;
    const [found] = this.inboundBuffer.splice(idx, 1) as [BufferedInbound<TResult>];
    return found;
  }

  private bufferInbound<TResult>(message: BufferedInbound<TResult>) {
    this.inboundBuffer.push(message as BufferedInbound<unknown>);
  }

  async invoke<TPayload, TResult>(input: {
    agent: string;
    payload: TPayload;
    localHandler: () => Promise<TResult>;
  }): Promise<{ result: TResult; trace: AgentTraceEntry }> {
    const peerId = this.getPeerId(input.agent);
    const mode = getMode();

    if ((!config.GENSYN_AXL_ENABLED || !peerId) && isDevMode()) {
      const result = await input.localHandler();
      return {
        result,
        trace: {
          step: 0,
          agent: input.agent,
          axlPeerId: peerId,
          transport: config.GENSYN_AXL_ENABLED ? "axl" : undefined,
          input: summarizeValue(input.payload),
          output: summarizeValue(result)
        }
      };
    }

    if ((!config.GENSYN_AXL_ENABLED || !peerId) && mode === "gensyn") {
      throw new Error(`AXL peer is required for ${input.agent} when FACTUM_MODE=gensyn`);
    }

    const resolvedPeerId = peerId as string;
    const correlationId = randomUUID();

    try {
      await this.client.send({
        to: resolvedPeerId,
        topic: `factum.${input.agent}`,
        payload: {
          correlationId,
          agent: input.agent,
          payload: input.payload,
          sentAt: new Date().toISOString()
        }
      });

      const deadline = Date.now() + config.GENSYN_AXL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const fromBuffer = this.takeMatchingResponse<TResult>(correlationId);
        if (fromBuffer?.data?.result !== undefined) {
          return {
            result: fromBuffer.data.result,
            trace: {
              step: 0,
              agent: input.agent,
              axlPeerId: resolvedPeerId,
              transport: "axl",
              input: summarizeValue(input.payload),
              output: summarizeValue(fromBuffer.data.result)
            }
          };
        }

        const messages = await this.client.recv<AxlResponseEnvelope<TResult>>();
        const message = messages[0];
        if (!message) {
          await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
          continue;
        }

        if (message.data?.correlationId === correlationId && message.data?.result !== undefined) {
          return {
            result: message.data.result,
            trace: {
              step: 0,
              agent: input.agent,
              axlPeerId: resolvedPeerId,
              transport: "axl",
              input: summarizeValue(input.payload),
              output: summarizeValue(message.data.result)
            }
          };
        }

        this.bufferInbound(message as BufferedInbound<TResult>);
        await sleep(config.GENSYN_AXL_POLL_INTERVAL_MS);
      }

      if (!config.GENSYN_AXL_LOCAL_FALLBACK) {
        throw new Error(`AXL timed out waiting for ${input.agent}`);
      }
    } catch (error) {
      if (!config.GENSYN_AXL_LOCAL_FALLBACK || mode === "gensyn") {
        throw error;
      }
      console.warn(`AXL invoke failed for ${input.agent}; using local fallback`, error);
    }

    const result = await input.localHandler();
    return {
      result,
      trace: {
        step: 0,
        agent: input.agent,
        axlPeerId: resolvedPeerId,
        transport: "axl",
        input: summarizeValue(input.payload),
        output: summarizeValue(result)
      }
    };
  }
}
