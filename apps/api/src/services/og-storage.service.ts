import { OgStorageClient } from "@factuam/og-storage";
import { config } from "../config";

export class OgStorageService {
  readonly client = new OgStorageClient({
    rpcUrl: config.OG_STORAGE_RPC,
    indexerRpcUrl: config.OG_STORAGE_INDEXER_RPC,
    privateKey: config.OG_STORAGE_PRIVATE_KEY
  });
}
