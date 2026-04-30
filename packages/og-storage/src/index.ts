import fs from "node:fs/promises";
import path from "node:path";
import { Indexer, MemData, ZgFile } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

export type OgStorageConfig = {
  rpcUrl: string;
  indexerRpcUrl: string;
  privateKey: string;
};

export type UploadResult = {
  uri: string;
  rootHash: string;
  txHash?: string;
  size: number;
};

export class OgStorageClient {
  private readonly indexer: Indexer;
  private readonly wallet: ethers.Wallet;

  constructor(private readonly config: OgStorageConfig) {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, provider);
    this.indexer = new Indexer(config.indexerRpcUrl);
  }

  async uploadJson(name: string, payload: unknown): Promise<UploadResult> {
    const body = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
    const data = new MemData(body);
    await data.merkleTree();
    const [result, error] = await this.indexer.upload(data, this.config.rpcUrl, this.wallet);
    if (error) {
      throw error;
    }

    const rootHash = "rootHash" in result ? result.rootHash : result.rootHashes[0];
    const txHash = "txHash" in result ? result.txHash : result.txHashes[0];
    if (!rootHash) {
      throw new Error(`0G upload for ${name} did not return a root hash`);
    }

    return {
      uri: `0g://${rootHash}`,
      rootHash,
      txHash,
      size: body.byteLength
    };
  }

  async uploadFile(filePath: string): Promise<UploadResult> {
    const absolute = path.resolve(filePath);
    const file = await ZgFile.fromFilePath(absolute);
    try {
      await file.merkleTree();
      const [result, error] = await this.indexer.upload(file, this.config.rpcUrl, this.wallet);
      if (error) {
        throw error;
      }

      const rootHash = "rootHash" in result ? result.rootHash : result.rootHashes[0];
      const txHash = "txHash" in result ? result.txHash : result.txHashes[0];
      if (!rootHash) {
        throw new Error(`0G upload for ${absolute} did not return a root hash`);
      }
      const stat = await fs.stat(absolute);

      return {
        uri: `0g://${rootHash}`,
        rootHash,
        txHash,
        size: stat.size
      };
    } finally {
      await file.close();
    }
  }

  parseUri(uri: string): string {
    if (!uri.startsWith("0g://")) {
      throw new Error(`Unsupported 0G URI: ${uri}`);
    }
    const rootHash = uri.slice("0g://".length).trim();
    if (!rootHash) {
      throw new Error(`Invalid 0G URI: ${uri}`);
    }
    return rootHash;
  }

  async downloadUri(uri: string, filePath: string): Promise<void> {
    const rootHash = this.parseUri(uri);
    const error = await this.indexer.download(rootHash, filePath, false);
    if (error) {
      throw error;
    }
  }
}
