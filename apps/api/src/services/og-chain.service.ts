import { OgChainClient } from "@factuam/og-chain";
import { config } from "../config";

export class OgChainService {
  readonly client = new OgChainClient({
    rpcUrl: config.OG_CHAIN_RPC,
    privateKey: config.OG_CHAIN_PRIVATE_KEY as `0x${string}`,
    receiptRegistryAddress: config.OG_CHAIN_RECEIPT_REGISTRY_ADDRESS as `0x${string}`
  });
}
