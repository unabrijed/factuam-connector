import OpenAI from "openai";
import { z, type ZodTypeAny } from "zod";
import { config } from "../config";

const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export class OpenAiJsonAgentService {
  async run<TSchema extends ZodTypeAny>(input: {
    systemPrompt: string;
    payload: unknown;
    schema: TSchema;
  }): Promise<z.infer<TSchema>> {
    const response = await client.chat.completions.create({
      model: config.LLM_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: JSON.stringify(input.payload, null, 2) }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    const parsed = JSON.parse(content) as unknown;
    try {
      return input.schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Schema validation failed: ${error.message}\nRaw response: ${content}`);
      }
      throw error;
    }
  }
}
