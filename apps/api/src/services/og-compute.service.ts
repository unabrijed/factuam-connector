import { sha256String } from "@factuam/proof-receipts";
import { config } from "../config";

export class OgComputeService {
  private clientPromise:
    | Promise<InstanceType<(typeof import("@factuam/og-compute"))["OgComputeClient"]> | null>
    | null = null;

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = import("@factuam/og-compute")
        .then(({ OgComputeClient }) =>
          new OgComputeClient({
            rpcUrl: config.OG_COMPUTE_RPC,
            privateKey: config.OG_COMPUTE_PRIVATE_KEY,
            providerAddress: config.OG_COMPUTE_PROVIDER_ADDRESS
          })
        )
        .catch((error) => {
          console.warn("0G compute client unavailable; continuing without compute proof", error);
          return null;
        });
    }

    return this.clientPromise;
  }

  async verifyNarrative(summary: unknown) {
    const client = await this.getClient();
    if (!client) {
      return null;
    }

    const result = await client.runChatCompletion({
      model: "meta-llama/Llama-3.3-70B-Instruct",
      messages: [
        {
          role: "system",
          content:
            "You are validating a proof receipt narrative. Summarize whether the verification summary is internally consistent in 3 bullet points."
        },
        {
          role: "user",
          content: JSON.stringify(summary, null, 2)
        }
      ]
    });

    return {
      providerAddress: result.providerAddress,
      responseId: result.responseId,
      verified: result.verified,
      output: result.content,
      outputHash: sha256String(result.content)
    };
  }
}
