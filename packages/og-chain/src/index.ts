import { createPublicClient, createWalletClient, http, parseAbi, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const abi = parseAbi([
  "function registerReceipt(bytes32 receiptHash, bytes32 datasetHash, bytes32 modelHash, bytes32 backtestHash, string receiptUri) external"
]);

export type OgChainConfig = {
  rpcUrl: string;
  privateKey: `0x${string}`;
  receiptRegistryAddress: `0x${string}`;
  chainId?: number;
};

export type RegisterReceiptInput = {
  receiptHash: `0x${string}`;
  datasetHash: `0x${string}`;
  modelHash: `0x${string}`;
  backtestHash: `0x${string}`;
  receiptUri: string;
};

export class OgChainClient {
  private readonly account;
  private readonly walletClient;
  private readonly publicClient;

  constructor(private readonly config: OgChainConfig) {
    this.account = privateKeyToAccount(config.privateKey);
    const chain = {
      id: config.chainId ?? 16601,
      name: "0G Chain",
      nativeCurrency: { name: "OG", symbol: "OG", decimals: 18 },
      rpcUrls: {
        default: { http: [config.rpcUrl] },
        public: { http: [config.rpcUrl] }
      }
    };

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl)
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl)
    }).extend(publicActions);
  }

  async registerReceipt(input: RegisterReceiptInput): Promise<{ txHash: string }> {
    const hash = await this.walletClient.writeContract({
      address: this.config.receiptRegistryAddress,
      abi,
      functionName: "registerReceipt",
      args: [input.receiptHash, input.datasetHash, input.modelHash, input.backtestHash, input.receiptUri]
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash };
  }
}
