import { createPublicClient, createWalletClient, http, parseAbi, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const abi = parseAbi([
  "function anchor(bytes32 experimentId, bytes32 agentReceiptHash, bytes32 modelReceiptHash, bytes32 reeReceiptHash) external",
  "function verify(bytes32 experimentId) external view returns (bool)"
]);

export type GensynChainConfig = {
  rpcUrl: string;
  privateKey: `0x${string}`;
  registryAddress: `0x${string}`;
  chainId?: number;
  chainName?: string;
  nativeSymbol?: string;
};

export type AnchorExperimentInput = {
  experimentId: `0x${string}`;
  agentReceiptHash: `0x${string}`;
  modelReceiptHash: `0x${string}`;
  reeReceiptHash: `0x${string}`;
};

export class GensynChainClient {
  private readonly walletClient;
  private readonly publicClient;

  constructor(private readonly config: GensynChainConfig) {
    const account = privateKeyToAccount(config.privateKey);
    const chain = {
      id: config.chainId ?? 685685,
      name: config.chainName ?? "Gensyn Testnet",
      nativeCurrency: {
        name: config.nativeSymbol === "AI" ? "Gensyn AI" : "Gensyn",
        symbol: config.nativeSymbol ?? "AI",
        decimals: 18
      },
      rpcUrls: {
        default: { http: [config.rpcUrl] },
        public: { http: [config.rpcUrl] }
      }
    };

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(config.rpcUrl)
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl)
    }).extend(publicActions);
  }

  async anchorExperiment(input: AnchorExperimentInput): Promise<{ txHash: string; blockNumber: bigint }> {
    const txHash = await this.walletClient.writeContract({
      address: this.config.registryAddress,
      abi,
      functionName: "anchor",
      args: [input.experimentId, input.agentReceiptHash, input.modelReceiptHash, input.reeReceiptHash]
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash, blockNumber: receipt.blockNumber };
  }

  async verifyExperiment(experimentId: `0x${string}`): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.config.registryAddress,
      abi,
      functionName: "verify",
      args: [experimentId]
    });
  }
}
