import { EvidenceClassifierResultSchema, type EvidenceClassifierResult } from "@factum/shared-types";
import { OpencodeJsonAgentService } from "../opencode-json-agent.service";

const systemPrompt = `You are the Factum evidence classifier.
Return JSON only.
Return an object with exactly these keys:
- requiresEvidenceMode: boolean
- evidenceType: one of none, retrieval, simulation, supervised_prediction, regression, classification, ranking, forecasting, backtest, fine_tuning
- riskLevel: one of low, business_decision, financial, strategy, high
- reason: short string explaining the decision
- minimumEvidenceRequired: short string describing the minimum evidence needed to support the query. If evidence mode is not required, set this to "none".
Decide if the query requires evidence mode.
Evidence mode is required for prediction, ranking, optimization, forecasting, strategic recommendations, financial outcomes, lead scoring, measurable comparisons, or probability estimates.
Evidence mode is not required for summarization, rewriting, definitions, simple factual Q&A, or brainstorming without measurable claims.
If evidence mode is not required:
- requiresEvidenceMode must be false
- evidenceType must be "none"
- minimumEvidenceRequired must be "none"
Always include all five keys.`;

export class EvidenceClassifierService {
  constructor(private readonly agent = new OpencodeJsonAgentService()) {}

  async run(input: { query: string; availableDataset?: unknown }): Promise<EvidenceClassifierResult> {
    return this.agent.run({
      systemPrompt,
      payload: input,
      schema: EvidenceClassifierResultSchema
    });
  }
}
