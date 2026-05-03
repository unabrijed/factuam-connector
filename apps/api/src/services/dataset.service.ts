import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { sha256Buffer } from "@factuam/proof-receipts";
import { v4 as uuidv4 } from "uuid";
import { paths } from "../config";
import { ensureDir } from "../lib/fs";
import { db } from "../db/client";
import { datasets } from "../db/schema";
import { OgStorageService } from "./og-storage.service";
import { AppError } from "../lib/errors";

function inferColumnKind(values: string[]): string {
  const sample = values.filter(Boolean).slice(0, 20);
  if (!sample.length) return "unknown";
  if (sample.every((value) => !Number.isNaN(Number(value)))) return "numeric";
  if (sample.every((value) => !Number.isNaN(Date.parse(value)))) return "datetime";
  if (new Set(sample).size <= Math.max(10, sample.length / 2)) return "categorical";
  return "text";
}

export class DatasetService {
  constructor(private readonly storage = new OgStorageService()) {}

  private async createDatasetRecord(input: {
    datasetId: string;
    name: string;
    buffer: Buffer;
    localPath: string;
    originalFilename: string;
    sourceType: string;
    sourceMeta?: Record<string, unknown>;
    connectorId?: string;
    connectorRunId?: string;
    rawPayloadPath?: string;
  }) {
    const rows = parse(input.buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Array<Record<string, string>>;

    const columns = rows[0] ? Object.keys(rows[0]) : [];
    const schemaJson = {
      columns: columns.map((column) => ({
        name: column,
        kind: inferColumnKind(rows.map((row) => row[column] ?? ""))
      }))
    };

    let upload:
      | {
          uri: string;
        }
      | undefined;
    let uploadWarning: string | undefined;
    try {
      upload = await this.storage.client.uploadFile(input.localPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown 0G Storage upload error";
      uploadWarning = `0G Storage upload deferred: ${message}`;
    }
    const datasetHash = sha256Buffer(input.buffer);

    await db.insert(datasets).values({
      id: input.datasetId,
      name: input.name,
      sourceType: input.sourceType,
      localPath: input.localPath,
      originalFilename: input.originalFilename,
      rowCount: rows.length,
      columnCount: columns.length,
      schemaJson,
      datasetHash,
      ogStorageUri: upload?.uri ?? null,
      sourceMeta: {
        ...(input.sourceMeta ?? {}),
        storageStatus: upload ? "uploaded" : "local_only",
        ...(uploadWarning ? { storageWarning: uploadWarning } : {})
      },
      connectorId: input.connectorId,
      connectorRunId: input.connectorRunId,
      rawPayloadPath: input.rawPayloadPath
    });

    return {
      datasetId: input.datasetId,
      name: input.name,
      rowCount: rows.length,
      columnCount: columns.length,
      status: upload ? ("uploaded" as const) : ("stored_locally" as const),
      datasetHash,
      ogStorageUri: upload?.uri,
      ...(uploadWarning ? { warning: uploadWarning } : {})
    };
  }

  async createFromLocalFile(input: {
    name: string;
    localPath: string;
    originalFilename: string;
    sourceType: string;
    sourceMeta?: Record<string, unknown>;
    connectorId?: string;
    connectorRunId?: string;
    rawPayloadPath?: string;
  }) {
    await ensureDir(paths.uploads);
    const datasetId = uuidv4();
    const buffer = await fs.readFile(input.localPath);
    const persistedPath = path.join(paths.uploads, `${datasetId}-${input.originalFilename}`);
    await fs.copyFile(input.localPath, persistedPath);

    return this.createDatasetRecord({
      datasetId,
      name: input.name,
      buffer,
      localPath: persistedPath,
      originalFilename: input.originalFilename,
      sourceType: input.sourceType,
      sourceMeta: input.sourceMeta,
      connectorId: input.connectorId,
      connectorRunId: input.connectorRunId,
      rawPayloadPath: input.rawPayloadPath
    });
  }

  async uploadDataset(input: { file: File; name: string }) {
    await ensureDir(paths.uploads);
    const datasetId = uuidv4();
    const arrayBuffer = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const localPath = path.join(paths.uploads, `${datasetId}-${input.file.name}`);
    await fs.writeFile(localPath, buffer);

    return this.createDatasetRecord({
      datasetId,
      name: input.name,
      buffer,
      localPath,
      originalFilename: input.file.name,
      sourceType: "upload"
    });
  }

  async getById(datasetId: string) {
    return db.query.datasets.findFirst({ where: eq(datasets.id, datasetId) });
  }

  async materializeToLocal(dataset: {
    id: string;
    localPath?: string | null;
    ogStorageUri?: string | null;
    originalFilename?: string | null;
  }) {
    if (dataset.localPath) {
      try {
        await fs.stat(dataset.localPath);
        return dataset.localPath;
      } catch {
        // fall through to 0G restoration
      }
    }

    if (!dataset.ogStorageUri) {
      throw new AppError("Dataset is missing both localPath and ogStorageUri", 500, "dataset_materialization_failed");
    }

    const materializedDir = path.join(paths.uploads, "materialized");
    await ensureDir(materializedDir);
    const fileName = dataset.originalFilename ?? `${dataset.id}.csv`;
    const targetPath = path.join(materializedDir, `${dataset.id}-${fileName}`);
    try {
      await this.storage.client.downloadUri(dataset.ogStorageUri, targetPath);
    } catch {
      throw new AppError("Failed to download dataset from 0G Storage", 502, "og_download_failed", {
        datasetId: dataset.id
      });
    }
    await db.update(datasets).set({ localPath: targetPath }).where(eq(datasets.id, dataset.id));
    return targetPath;
  }

  async updateDataQuality(datasetId: string, report: Record<string, unknown>) {
    await db.update(datasets).set({ dataQualityReport: report }).where(eq(datasets.id, datasetId));
  }

  async updateStorageUri(datasetId: string, ogStorageUri: string) {
    await db.update(datasets).set({ ogStorageUri }).where(eq(datasets.id, datasetId));
  }
}
