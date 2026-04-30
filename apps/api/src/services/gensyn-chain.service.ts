import { GensynChainClient } from "@factum/gensyn-chain";
import { config } from "../config";

/** Public RPC defaults from docs.gensyn.network/network-information */
const GENSYN_PUBLIC_MAINNET_RPC = "https://gensyn-mainnet.g.alchemy.com/public";
const GENSYN_PUBLIC_TESTNET_RPC = "https://gensyn-testnet.g.alchemy.com/public";

const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/i;

function resolvePrivateKey(): string | undefined {
  const a = config.GENSYN_CHAIN_PRIVATE_KEY?.trim();
  const b = process.env.PRIVATE_KEY?.trim();
  return a || b || undefined;
}

function resolveRegistryAddress(): string | undefined {
  const a = config.GENSYN_CHAIN_REGISTRY_ADDRESS?.trim();
  const b = process.env.FACTUM_REGISTRY_CONTRACT?.trim();
  return a || b || undefined;
}

function resolveRpcUrl(): string {
  const explicit = config.GENSYN_CHAIN_RPC?.trim();
  if (explicit) return explicit;

  if (config.GENSYN_NETWORK === "mainnet") {
    return (config.GENSYN_MAINNET_RPC?.trim() || GENSYN_PUBLIC_MAINNET_RPC);
  }
  return config.GENSYN_TESTNET_RPC?.trim() || GENSYN_PUBLIC_TESTNET_RPC;
}

function resolveChainId(): number {
  if (config.GENSYN_CHAIN_ID != null && Number.isFinite(config.GENSYN_CHAIN_ID)) {
    return config.GENSYN_CHAIN_ID;
  }
  return config.GENSYN_NETWORK === "mainnet" ? 685689 : 685685;
}

export class GensynChainService {
  readonly client: GensynChainClient | null;

  constructor() {
    if (!config.GENSYN_CHAIN_ENABLED) {
      this.client = null;
      return;
    }

    const registryAddress = resolveRegistryAddress();
    const privateKey = resolvePrivateKey();
    if (!registryAddress || !privateKey || !PRIVATE_KEY_RE.test(privateKey) || !ADDRESS_RE.test(registryAddress)) {
      this.client = null;
      return;
    }

    const rpcUrl = resolveRpcUrl();
    const chainId = resolveChainId();
    const isMainnet = chainId === 685689;

    this.client = new GensynChainClient({
      rpcUrl,
      privateKey: privateKey as `0x${string}`,
      registryAddress: registryAddress as `0x${string}`,
      chainId,
      chainName: isMainnet ? "Gensyn Mainnet" : "Gensyn Testnet",
      nativeSymbol: "AI"
    });
  }
}
