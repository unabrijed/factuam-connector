import type { ReeVerification } from "@factum/shared-types";
import { VerifierResultSchema, type VerifierResult } from "@factum/shared-types";
import { config } from "../config";

const reeSystemPrompt = `You are the Factum verifier.
Return JSON only.
Be conservative.
Reject unsupported claims.
Only verify results when dataset validation passed, the target exists, the model beat baseline, and warnings are preserved.
If confidence is low or performance is weak, return rejected or warning.
Allowed claims must be narrow and evidence-backed.
Disallowed claims must include certainty language and unsupported guarantees.`;

export class GensynReeService {
  private clientPromise:
    | Promise<InstanceType<(typeof import("@factum/gensyn-ree"))["ReeClient"]>>
    | null = null;

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import("@factum/gensyn-ree").then(
        ({ ReeClient }) =>
          new ReeClient({
            command: config.GENSYN_REE_COMMAND,
            tasksRoot: config.GENSYN_REE_TASKS_ROOT,
            maxNewTokens: config.GENSYN_REE_MAX_NEW_TOKENS,
            temperature: config.GENSYN_REE_TEMPERATURE
          })
      );
    }

    return this.clientPromise;
  }

  get enabled() {
    return config.GENSYN_REE_ENABLED;
  }

  async runVerification(payload: unknown): Promise<{ verification: VerifierResult; reeVerification: ReeVerification }> {
    const client = await this.getClient();
    const experimentId =
      typeof payload === "object" && payload !== null && "experimentId" in payload
        ? String((payload as { experimentId?: unknown }).experimentId ?? "")
        : undefined;
    const result = await client.run({
      model: config.GENSYN_REE_VERIFIER_MODEL ?? config.LLM_MODEL,
      mode: config.GENSYN_REE_MODE,
      experimentId: experimentId || undefined,
      prompt: `${reeSystemPrompt}\n\nUser payload:\n${JSON.stringify(payload, null, 2)}`
    });

    const verification = VerifierResultSchema.parse(JSON.parse(result.generatedText) as unknown);
    return {
      verification,
      reeVerification: result.verification
    };
  }
}
