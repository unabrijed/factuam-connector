import { z } from "zod";
import { OpencodeJsonAgentService } from "../opencode-json-agent.service";

const schema = z.object({
  finalAnswer: z.string(),
  resultSummary: z.record(z.any())
});

const systemPrompt = `You are the factuam answer generator.
Return JSON only.
Write a user-facing answer using this format:
Recommendation:
...

Predicted Outcome:
...

Backtest Result:
...

Baseline Comparison:
...

Confidence:
...

Why This Was Chosen:
...

Limitations:
...

Proof Receipt:
...
Use only verified claims and warnings. Never invent metrics, hashes, certainty, or guarantees.`;

export class AnswerGeneratorService {
  constructor(private readonly agent = new OpencodeJsonAgentService()) {}

  async run(input: unknown): Promise<{ finalAnswer: string; resultSummary: Record<string, unknown> }> {
    return this.agent.run({
      systemPrompt,
      payload: input,
      schema
    });
  }
}
