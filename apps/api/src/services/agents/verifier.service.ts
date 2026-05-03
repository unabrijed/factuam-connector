import type { ReeVerification, VerifierResult } from "@factuam/shared-types";
import { VerifierResultSchema } from "@factuam/shared-types";
import { config } from "../../config";
import { GensynReeService } from "../gensyn-ree.service";
import { OpencodeJsonAgentService } from "../opencode-json-agent.service";

const systemPrompt = `You are the factuam verifier.
Return JSON only.
Be conservative.
Reject unsupported claims.
Only verify results when dataset validation passed, the target exists, the model beat baseline, and warnings are preserved.
If confidence is low or performance is weak, return rejected or warning.
Allowed claims must be narrow and evidence-backed.
Disallowed claims must include certainty language and unsupported guarantees.`;

export class VerifierService {
  constructor(
    private readonly agent = new OpencodeJsonAgentService(),
    private readonly reeService = new GensynReeService()
  ) {}

  async run(input: unknown): Promise<{ verification: VerifierResult; reeVerification?: ReeVerification }> {
    if (config.GENSYN_REE_ENABLED) {
      try {
        return await this.reeService.runVerification(input);
      } catch (error) {
        console.warn("GENSYN_REE verifier path failed; falling back to OpenCode verifier", error);
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
