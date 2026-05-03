import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  AgentTraceEntry,
  ArtifactManifestEntry,
  Dataset,
  ExperimentPlan,
  MLRunResult,
  ProofReceipt,
  ReeVerification,
  SourceTrace,
  VerifierResult
} from "@factuam/shared-types";
import { createReceipt, sha256Json, sha256String, asHex32 } from "@factuam/proof-receipts";
import { db } from "../db/client";
import { proofReceipts } from "../db/schema";
import { config, paths } from "../config";
import { ensureDir } from "../lib/fs";
import { OgStorageService } from "./og-storage.service";
import { OgComputeService } from "./og-compute.service";
import { OgChainService } from "./og-chain.service";
import { GensynChainService } from "./gensyn-chain.service";
import { ArtifactService } from "./artifact.service";
import { DatasetService } from "./dataset.service";
import { log } from "../lib/logger";

export class ProofService {
  constructor(
    private readonly storageService = new OgStorageService(),
    private readonly computeService = new OgComputeService(),
    private readonly chainService = new OgChainService(),
    private readonly gensynChainService = new GensynChainService(),
    private readonly artifactService = new ArtifactService(),
    private readonly datasetService = new DatasetService()
  ) {}

  private mapPrimaryUris(entries: ArtifactManifestEntry[]) {
    const byType = new Map(entries.map((entry) => [entry.artifactType, entry.uri]));
    return {
      datasetUri: byType.get("raw_dataset"),
      modelUri: byType.get("model_artifact"),
      metricsUri: byType.get("model_metrics"),
      backtestReportUri: byType.get("backtest_report")
    };
  }

  async createReceipt(input: {
    experimentId: string;
    query: string;
    dataset: Dataset & { localPath?: string | null; datasetHash?: string | null };
    mode?: "upload" | "connector";
    plan: ExperimentPlan;
    mlResult: MLRunResult;
    verification: VerifierResult;
    reeVerification?: ReeVerification;
    agentTrace?: AgentTraceEntry[];
    finalAnswer: string;
  }): Promise<{ id: string; receipt: ProofReceipt; receiptHash: string; receiptStorageUri: string; txHash: string }> {
    await ensureDir(paths.artifacts);
    const experimentArtifactDir = path.join(paths.artifacts, input.experimentId);
    await ensureDir(experimentArtifactDir);

    const artifactEntries: ArtifactManifestEntry[] = [];
    for (const artifact of input.mlResult.artifacts) {
      if (!artifact.localPath) continue;
      const upload = await this.storageService.client.uploadFile(artifact.localPath);
      artifactEntries.push({ ...artifact, uri: upload.uri });
    }

    if (input.dataset.ogStorageUri || input.dataset.localPath) {
      let datasetUri = input.dataset.ogStorageUri;
      if (!datasetUri && input.dataset.localPath) {
        const datasetUpload = await this.storageService.client.uploadFile(input.dataset.localPath);
        datasetUri = datasetUpload.uri;
        await this.datasetService.updateStorageUri(input.dataset.id, datasetUri);
      }
      artifactEntries.push({
        artifactType: "raw_dataset",
        name: input.dataset.localPath ? path.basename(input.dataset.localPath) : input.dataset.originalFilename ?? "dataset.csv",
        localPath: input.dataset.localPath,
        contentHash: input.dataset.datasetHash ?? "",
        uri: datasetUri
      });
    }

    const verificationReport = {
      verification: input.verification,
      bestModel: input.mlResult.bestModel,
      backtest: input.mlResult.backtest
    };
    const verificationPath = path.join(experimentArtifactDir, "verification_report.json");
    await fs.writeFile(verificationPath, JSON.stringify(verificationReport, null, 2));
    const verificationHash = sha256Json(verificationReport);
    const verificationUpload = await this.storageService.client.uploadFile(verificationPath);
    artifactEntries.push({
      artifactType: "verification_report",
      name: "verification_report.json",
      localPath: verificationPath,
      contentHash: verificationHash,
      uri: verificationUpload.uri
    });

    const manifest = {
      experimentId: input.experimentId,
      generatedAt: new Date().toISOString(),
      artifacts: artifactEntries
    };
    const manifestHash = sha256Json(manifest);
    const manifestPath = path.join(experimentArtifactDir, "artifact_manifest.json");
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    const manifestUpload = await this.storageService.client.uploadFile(manifestPath);
    artifactEntries.push({
      artifactType: "artifact_manifest",
      name: "artifact_manifest.json",
      localPath: manifestPath,
      contentHash: manifestHash,
      uri: manifestUpload.uri
    });

    let computeProofResult: Awaited<ReturnType<OgComputeService["verifyNarrative"]>> = null;
    try {
      computeProofResult = await this.computeService.verifyNarrative({
        verification: input.verification,
        finalAnswer: input.finalAnswer,
        bestModel: input.mlResult.bestModel,
        backtest: input.mlResult.backtest
      });
    } catch (error) {
      log("warn", "og_compute_narrative_skipped", {
        experimentId: input.experimentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const bestModelArtifactHash = input.mlResult.models.find((model) => model.modelId === input.mlResult.bestModel.modelId)?.artifactHash ?? "";
    const metricsHash = sha256Json({
      models: input.mlResult.models.map((model) => ({ name: model.modelName, metrics: model.metrics })),
      baseline: input.mlResult.baseline
    });
    const backtestHash = input.mlResult.backtest.reportHash ?? sha256Json(input.mlResult.backtest.report);
    const finalAnswerHash = sha256String(input.finalAnswer);
    const queryHash = sha256String(input.query);
    const configHash = sha256Json(input.plan);

    const sourceTraces = input.mode === "connector" ? this.buildSourceTraces(input.dataset) : undefined;

    const receipt = createReceipt({
      experimentId: input.experimentId,
      executionMode: input.mode,
      queryHash,
      datasetHash: input.dataset.datasetHash ?? "",
      experimentConfigHash: configHash,
      modelArtifactHash: bestModelArtifactHash,
      metricsHash,
      backtestReportHash: backtestHash,
      finalAnswerHash,
      artifactManifestHash: manifestHash,
      verificationStatus: input.verification.verificationStatus,
      confidence: input.verification.confidence,
      createdAt: new Date().toISOString(),
      artifacts: this.mapPrimaryUris(artifactEntries),
      sourceTraces,
      warnings: input.verification.warnings,
      ...(input.agentTrace?.length ? { agentTrace: input.agentTrace } : {}),
      ...(input.reeVerification ? { reeVerification: input.reeVerification } : {}),
      ...(computeProofResult
        ? {
            computeProof: {
              providerAddress: computeProofResult.providerAddress,
              responseId: computeProofResult.responseId,
              verified: computeProofResult.verified,
              outputHash: computeProofResult.outputHash
            }
          }
        : {})
    });

    const receiptPath = path.join(experimentArtifactDir, "proof_receipt.json");
    await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
    const receiptHash = sha256Json(receipt);
    const receiptUpload = await this.storageService.client.uploadFile(receiptPath);
    artifactEntries.push({
      artifactType: "proof_receipt",
      name: "proof_receipt.json",
      localPath: receiptPath,
      contentHash: receiptHash,
      uri: receiptUpload.uri
    });

    const chainRecord = await this.anchorReceipt({
      experimentId: input.experimentId,
      receiptHash,
      datasetHash: input.dataset.datasetHash ?? "",
      modelHash: bestModelArtifactHash,
      backtestHash,
      receiptUri: receiptUpload.uri,
      reeVerification: input.reeVerification
    });

    const proofId = uuidv4();
    await db.insert(proofReceipts).values({
      id: proofId,
      experimentId: input.experimentId,
      receiptJson: { ...receipt, chain: chainRecord },
      receiptHash,
      datasetHash: input.dataset.datasetHash ?? "",
      modelHash: bestModelArtifactHash,
      configHash,
      metricsHash,
      backtestHash,
      finalAnswerHash,
      verificationStatus: input.verification.verificationStatus,
      ogStorageUri: receiptUpload.uri,
      onchainTxHash: chainRecord.txHash
    });

    await this.artifactService.record(input.experimentId, artifactEntries);

    return {
      id: proofId,
      receipt: { ...receipt, chain: chainRecord },
      receiptHash,
      receiptStorageUri: receiptUpload.uri,
      txHash: chainRecord.txHash ?? ""
    };
  }

  private async anchorReceipt(input: {
    experimentId: string;
    receiptHash: string;
    datasetHash: string;
    modelHash: string;
    backtestHash: string;
    receiptUri: string;
    reeVerification?: ReeVerification;
  }) {
    if (this.gensynChainService.client) {
      try {
        const reeReceiptHash = input.reeVerification?.receiptHash ?? input.receiptHash;
        const anchored = await this.gensynChainService.client.anchorExperiment({
          experimentId: asHex32(input.experimentId.replace(/-/g, "")),
          agentReceiptHash: asHex32(input.receiptHash),
          modelReceiptHash: asHex32(input.modelHash),
          reeReceiptHash: asHex32(reeReceiptHash)
        });

        const isMain = config.GENSYN_NETWORK === "mainnet";
        const explorerBase = isMain
          ? "https://gensyn-mainnet.explorer.alchemy.com"
          : "https://gensyn-testnet.explorer.alchemy.com";

        return {
          network: isMain ? "gensyn_mainnet" : "gensyn_testnet",
          txHash: anchored.txHash,
          contractAddress: config.GENSYN_CHAIN_REGISTRY_ADDRESS ?? "",
          blockNumber: Number(anchored.blockNumber),
          verifyUrl: `${explorerBase}/tx/${anchored.txHash}`
        };
      } catch (error) {
        console.warn("GENSYN_CHAIN anchor failed; falling back to 0G chain", error);
      }
    }

    const registered = await this.chainService.client.registerReceipt({
      receiptHash: asHex32(input.receiptHash),
      datasetHash: asHex32(input.datasetHash),
      modelHash: asHex32(input.modelHash),
      backtestHash: asHex32(input.backtestHash),
      receiptUri: input.receiptUri
    });

    return {
      network: "0g",
      txHash: registered.txHash,
      contractAddress: config.OG_CHAIN_RECEIPT_REGISTRY_ADDRESS
    };
  }

  private buildSourceTraces(dataset: Dataset): SourceTrace[] | undefined {
    if (!dataset.sourceMeta) return undefined;

    if (dataset.sourceType === "kaggle") {
      const datasetSlug = typeof dataset.sourceMeta.dataset === "string" ? dataset.sourceMeta.dataset : undefined;
      const selectedFile = typeof dataset.sourceMeta.selectedFile === "string" ? dataset.sourceMeta.selectedFile : dataset.originalFilename;
      const rawHash = typeof dataset.sourceMeta.rawHash === "string" ? dataset.sourceMeta.rawHash : dataset.datasetHash;
      if (!datasetSlug || !selectedFile || !dataset.datasetHash || !rawHash) return undefined;

      return [
        {
          provider: "kaggle",
          connectorId: dataset.connectorId ?? "kaggle_public_dataset_v1",
          dataset: datasetSlug,
          selectedFile,
          rawHash,
          normalizedHash: dataset.datasetHash
        }
      ];
    }

    if (dataset.sourceType === "url_csv") {
      const url = typeof dataset.sourceMeta.url === "string" ? dataset.sourceMeta.url : undefined;
      const selectedFile = typeof dataset.sourceMeta.selectedFile === "string" ? dataset.sourceMeta.selectedFile : dataset.originalFilename;
      const rawHash = typeof dataset.sourceMeta.rawHash === "string" ? dataset.sourceMeta.rawHash : dataset.datasetHash;
      if (!url || !selectedFile || !dataset.datasetHash || !rawHash) return undefined;

      return [
        {
          provider: "url_csv",
          connectorId: dataset.connectorId ?? "public_csv_url_v1",
          dataset: url,
          selectedFile,
          rawHash,
          normalizedHash: dataset.datasetHash
        }
      ];
    }

    return undefined;
  }
}
