import type { ReeVerification, VerifierResult } from "@factum/shared-types";
import { VerifierResultSchema } from "@factum/shared-types";
import { config } from "../../config";
import { GensynReeService } from "../gensyn-ree.service";
import { OpenAiJsonAgentService } from "../openai-json-agent.service";

const systemPrompt = `You are the Factum verifier.
Return JSON only.
Be conservative.
Reject unsupported claims.
Only verify results when dataset validation passed, the target exists, the model beat baseline, and warnings are preserved.
If confidence is low or performance is weak, return rejected or warning.
Allowed claims must be narrow and evidence-backed.
Disallowed claims must include certainty language and unsupported guarantees.`;

export class VerifierService {
  constructor(
    private readonly agent = new OpenAiJsonAgentService(),
    private readonly reeService = new GensynReeService()
  ) {}

  async run(input: unknown): Promise<{ verification: VerifierResult; reeVerification?: ReeVerification }> {
    if (config.GENSYN_REE_ENABLED) {
      try {
        return await this.reeService.runVerification(input);
      } catch (error) {
        console.warn("GENSYN_REE verifier path failed; falling back to OpenAI verifier", error);
      }
    }

    const verification = await this.agent.run({
      systemPrompt,
      payload: input,
      schema: VerifierResultSchema
    });

    return { verification };
  }
}
