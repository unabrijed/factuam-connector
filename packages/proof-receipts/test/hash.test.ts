import { describe, expect, it } from "vitest";
import { createReceipt } from "../src/createReceipt";
import { canonicalizeJson, sha256Json } from "../src/hash";

describe("hash helpers", () => {
  it("canonicalizes object keys deterministically", () => {
    expect(canonicalizeJson({ b: 1, a: { d: 2, c: 1 } })).toBe(
      '{"a":{"c":1,"d":2},"b":1}'
    );
  });

  it("produces the same hash for equivalent objects", () => {
    expect(sha256Json({ a: 1, b: 2 })).toBe(sha256Json({ b: 2, a: 1 }));
  });

  it("accepts receipts with Gensyn trace metadata", () => {
    const receipt = createReceipt({
      experimentId: "exp_123",
      queryHash: "0xquery",
      datasetHash: "0xdataset",
      experimentConfigHash: "0xconfig",
      modelArtifactHash: "0xmodel",
      metricsHash: "0xmetrics",
      backtestReportHash: "0xbacktest",
      finalAnswerHash: "0xanswer",
      artifactManifestHash: "0xmanifest",
      verificationStatus: "verified",
      confidence: "high",
      createdAt: new Date().toISOString(),
      artifacts: {},
      warnings: [],
      agentTrace: [
        {
          step: 1,
          agent: "verifier",
          axlPeerId: "peer_verifier",
          reeVerification: {
            provider: "gensyn_ree",
            model: "factum-verifier-v1",
            receiptHash: "0xree",
            verified: true
          }
        }
      ],
      reeVerification: {
        provider: "gensyn_ree",
        model: "factum-verifier-v1",
        receiptHash: "0xree",
        verified: true
      },
      chain: {
        network: "gensyn",
        txHash: "0xtx",
        contractAddress: "0xcontract",
        blockNumber: 12,
        verifyUrl: "https://factum.run/verify/exp_123"
      }
    });

    expect(receipt.chain?.network).toBe("gensyn");
    expect(receipt.agentTrace?.[0]?.reeVerification?.provider).toBe("gensyn_ree");
  });
});
