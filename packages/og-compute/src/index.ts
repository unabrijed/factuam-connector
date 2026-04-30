import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

export type OgComputeConfig = {
  rpcUrl: string;
  privateKey: string;
  providerAddress: string;
};

export type ComputeChatResult = {
  providerAddress: string;
  endpoint: string;
  responseId: string;
  content: string;
  verified: boolean;
};

export class OgComputeClient {
  constructor(private readonly config: OgComputeConfig) {}

  async runChatCompletion(payload: Record<string, unknown>): Promise<ComputeChatResult> {
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    const wallet = new ethers.Wallet(this.config.privateKey, provider);
    const broker = await createZGComputeNetworkBroker(wallet as never);
    const service = await broker.inference.getServiceMetadata(this.config.providerAddress);
    const payloadText = JSON.stringify(payload);
    const headers = await broker.inference.getRequestHeaders(
      this.config.providerAddress,
      payloadText
    );
    const response = await fetch(`${service.endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`0G compute request failed with status ${response.status}`);
    }

    const json = (await response.json()) as {
      id?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    const responseId = json.id ?? "unknown";
    const content = json.choices?.[0]?.message?.content ?? "";

    let verified = false;
    try {
      const proof = await broker.inference.processResponse(
        this.config.providerAddress,
        responseId,
        JSON.stringify(json)
      );
      verified = Boolean(proof);
    } catch {
      verified = false;
    }

    return {
      providerAddress: this.config.providerAddress,
      endpoint: service.endpoint,
      responseId,
      content,
      verified
    };
  }
}
