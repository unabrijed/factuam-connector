import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "..", "..");

dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(apiRoot, ".env"), override: true });
/** Local multi-node AXL peer keys from `yarn local:axl` (gitignored). */
dotenv.config({ path: path.join(repoRoot, ".env.local.axl"), override: true });

const envSchema = z.object({
  factuam_MODE: z.enum(["gensyn", "dev"]).default("gensyn"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default("http://localhost:3000"),
  API_URL: z.string().default("http://localhost:4000"),
  ML_WORKER_URL: z.string().default("http://localhost:8000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  /** OpenCode HTTP API (run OpenCode server separately; see OpenCode docs). */
  OPENCODE_BASE_URL: z.string().default("http://127.0.0.1:4096"),
  /** Model as provider/model (e.g. opencode/gpt-5-nano). */
  OPENCODE_MODEL: z.string().default("opencode/gpt-5-nano"),
  /** Optional directory passed to OpenCode session APIs (project/workspace root). */
  OPENCODE_DIRECTORY: z.string().optional(),
  /** Default verifier model for Gensyn REE when `GENSYN_REE_VERIFIER_MODEL` is unset. */
  LLM_MODEL: z.string().default("gpt-4.1-mini"),
  LOCAL_UPLOAD_DIR: z.string().default("./uploads"),
  LOCAL_ARTIFACT_DIR: z.string().default("./artifacts"),
  LOCAL_CONNECTOR_DIR: z.string().default("./connector-data"),
  RUN_QUEUE_WORKER: z.coerce.boolean().default(true),
  GENSYN_REE_ENABLED: z.coerce.boolean().default(false),
  /** Prefer `gensyn-sdk` per Gensyn REE docs; set to `ree` only for legacy JSON `--input` CLIs */
  GENSYN_REE_COMMAND: z.string().default("gensyn-sdk"),
  GENSYN_REE_MODE: z.enum(["default", "deterministic", "reproducible"]).default("reproducible"),
  GENSYN_REE_VERIFIER_MODEL: z.string().optional(),
  GENSYN_REE_TASKS_ROOT: z.string().optional(),
  GENSYN_REE_MAX_NEW_TOKENS: z.preprocess(
    (v) => (v === undefined || v === "" || v === null ? 256 : Number(v)),
    z.number().finite().min(1).max(100_000)
  ),
  GENSYN_REE_TEMPERATURE: z.preprocess(
    (v) => (v === undefined || v === "" || v === null ? 0.3 : Number(v)),
    z.number().finite().min(0).max(2)
  ),
  GENSYN_AXL_ENABLED: z.coerce.boolean().default(false),
  /** One Go node + unified worker; API waits on Redis instead of polling /recv (no FIFO races). */
  GENSYN_AXL_SINGLE_NODE: z.coerce.boolean().default(false),
  /** When set, all agents send to this 64-hex peer id (from GET /topology on the single node). */
  AXL_SINGLE_PEER_ID: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/)
    .optional(),
  GENSYN_AXL_API_URL: z.string().default("http://127.0.0.1:9002"),
  GENSYN_AXL_AGENT_PEERS: z.string().optional(),
  AXL_PEER_CLASSIFIER: z.string().optional(),
  AXL_PEER_PLANNER: z.string().optional(),
  AXL_PEER_VALIDATION: z.string().optional(),
  AXL_PEER_DIAGNOSIS: z.string().optional(),
  AXL_PEER_STRATEGY: z.string().optional(),
  AXL_PEER_TRAINING: z.string().optional(),
  AXL_PEER_REFLECTION: z.string().optional(),
  AXL_PEER_VERIFIER: z.string().optional(),
  AXL_PEER_ANSWER: z.string().optional(),
  GENSYN_AXL_TIMEOUT_MS: z.coerce.number().default(1500),
  GENSYN_AXL_POLL_INTERVAL_MS: z.coerce.number().default(250),
  /** Cap for exponential backoff when GET /recv returns empty (idle workers). */
  GENSYN_AXL_IDLE_POLL_MAX_MS: z.coerce.number().default(5000),
  /** Exit worker after N consecutive recv failures (0 = disabled). Use under process supervision. */
  GENSYN_AXL_RECV_FATAL_AFTER: z.coerce.number().min(0).default(0),
  GENSYN_AXL_LOCAL_FALLBACK: z.coerce.boolean().default(true),
  REPLY_TIMEOUT_MS: z.coerce.number().default(120000),
  GENSYN_CHAIN_ENABLED: z.coerce.boolean().default(false),
  /** `mainnet` (685689) or `testnet` (685685) — used when `GENSYN_CHAIN_RPC` is unset */
  GENSYN_NETWORK: z.enum(["mainnet", "testnet"]).default("testnet"),
  GENSYN_MAINNET_RPC: z.string().optional(),
  GENSYN_TESTNET_RPC: z.string().optional(),
  GENSYN_CHAIN_RPC: z.string().optional(),
  /** Optional explicit chain id; otherwise derived from `GENSYN_NETWORK` */
  GENSYN_CHAIN_ID: z.coerce.number().optional(),
  GENSYN_CHAIN_PRIVATE_KEY: z.string().optional(),
  GENSYN_CHAIN_REGISTRY_ADDRESS: z.string().optional(),
  KAGGLE_API_TOKEN: z.string().optional(),
  KAGGLE_PYTHON_BIN: z.string().default("python3"),
  OG_STORAGE_RPC: z.string().min(1),
  OG_STORAGE_INDEXER_RPC: z.string().min(1),
  OG_STORAGE_PRIVATE_KEY: z.string().min(1),
  OG_COMPUTE_RPC: z.string().min(1),
  OG_COMPUTE_PRIVATE_KEY: z.string().min(1),
  OG_COMPUTE_PROVIDER_ADDRESS: z.string().min(1),
  OG_CHAIN_RPC: z.string().min(1),
  OG_CHAIN_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  OG_CHAIN_RECEIPT_REGISTRY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export const config = envSchema.parse({
  factuam_MODE: process.env.factuam_MODE,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  APP_URL: process.env.APP_URL,
  API_URL: process.env.API_URL,
  ML_WORKER_URL: process.env.ML_WORKER_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  OPENCODE_BASE_URL: process.env.OPENCODE_BASE_URL,
  OPENCODE_MODEL: process.env.OPENCODE_MODEL,
  OPENCODE_DIRECTORY: process.env.OPENCODE_DIRECTORY?.trim() || undefined,
  LLM_MODEL: process.env.LLM_MODEL,
  LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR,
  LOCAL_ARTIFACT_DIR: process.env.LOCAL_ARTIFACT_DIR,
  LOCAL_CONNECTOR_DIR: process.env.LOCAL_CONNECTOR_DIR,
  RUN_QUEUE_WORKER: process.env.RUN_QUEUE_WORKER,
  GENSYN_REE_ENABLED: process.env.GENSYN_REE_ENABLED,
  GENSYN_REE_COMMAND: process.env.GENSYN_REE_COMMAND,
  GENSYN_REE_MODE: process.env.GENSYN_REE_MODE,
  GENSYN_REE_VERIFIER_MODEL: process.env.GENSYN_REE_VERIFIER_MODEL,
  GENSYN_REE_TASKS_ROOT: process.env.GENSYN_REE_TASKS_ROOT ?? process.env.REE_TASKS_ROOT,
  GENSYN_REE_MAX_NEW_TOKENS: process.env.GENSYN_REE_MAX_NEW_TOKENS ?? process.env.REE_MAX_NEW_TOKENS,
  GENSYN_REE_TEMPERATURE: process.env.GENSYN_REE_TEMPERATURE ?? process.env.REE_TEMPERATURE,
  GENSYN_AXL_ENABLED: process.env.GENSYN_AXL_ENABLED,
  GENSYN_AXL_SINGLE_NODE: process.env.GENSYN_AXL_SINGLE_NODE,
  AXL_SINGLE_PEER_ID: process.env.AXL_SINGLE_PEER_ID?.trim() || undefined,
  GENSYN_AXL_API_URL: process.env.GENSYN_AXL_API_URL ?? process.env.AXL_API_URL,
  GENSYN_AXL_AGENT_PEERS: process.env.GENSYN_AXL_AGENT_PEERS,
  AXL_PEER_CLASSIFIER: process.env.AXL_PEER_CLASSIFIER,
  AXL_PEER_PLANNER: process.env.AXL_PEER_PLANNER,
  AXL_PEER_VALIDATION: process.env.AXL_PEER_VALIDATION,
  AXL_PEER_DIAGNOSIS: process.env.AXL_PEER_DIAGNOSIS,
  AXL_PEER_STRATEGY: process.env.AXL_PEER_STRATEGY,
  AXL_PEER_TRAINING: process.env.AXL_PEER_TRAINING,
  AXL_PEER_REFLECTION: process.env.AXL_PEER_REFLECTION,
  AXL_PEER_VERIFIER: process.env.AXL_PEER_VERIFIER,
  AXL_PEER_ANSWER: process.env.AXL_PEER_ANSWER,
  GENSYN_AXL_TIMEOUT_MS: process.env.GENSYN_AXL_TIMEOUT_MS,
  GENSYN_AXL_POLL_INTERVAL_MS: process.env.GENSYN_AXL_POLL_INTERVAL_MS,
  GENSYN_AXL_IDLE_POLL_MAX_MS: process.env.GENSYN_AXL_IDLE_POLL_MAX_MS,
  GENSYN_AXL_RECV_FATAL_AFTER: process.env.GENSYN_AXL_RECV_FATAL_AFTER,
  GENSYN_AXL_LOCAL_FALLBACK: process.env.GENSYN_AXL_LOCAL_FALLBACK,
  REPLY_TIMEOUT_MS: process.env.REPLY_TIMEOUT_MS,
  GENSYN_CHAIN_ENABLED: process.env.GENSYN_CHAIN_ENABLED,
  GENSYN_NETWORK: process.env.GENSYN_NETWORK,
  GENSYN_MAINNET_RPC: process.env.GENSYN_MAINNET_RPC,
  GENSYN_TESTNET_RPC: process.env.GENSYN_TESTNET_RPC,
  GENSYN_CHAIN_RPC: process.env.GENSYN_CHAIN_RPC ?? process.env.GENSYN_RPC_URL,
  GENSYN_CHAIN_ID: process.env.GENSYN_CHAIN_ID?.trim() || undefined,
  GENSYN_CHAIN_PRIVATE_KEY: process.env.GENSYN_CHAIN_PRIVATE_KEY,
  GENSYN_CHAIN_REGISTRY_ADDRESS: process.env.GENSYN_CHAIN_REGISTRY_ADDRESS ?? process.env.factuam_REGISTRY_CONTRACT,
  KAGGLE_API_TOKEN: process.env.KAGGLE_API_TOKEN,
  KAGGLE_PYTHON_BIN: process.env.KAGGLE_PYTHON_BIN,
  OG_STORAGE_RPC: process.env.OG_STORAGE_RPC,
  OG_STORAGE_INDEXER_RPC: process.env.OG_STORAGE_INDEXER_RPC,
  OG_STORAGE_PRIVATE_KEY: process.env.OG_STORAGE_PRIVATE_KEY,
  OG_COMPUTE_RPC: process.env.OG_COMPUTE_RPC,
  OG_COMPUTE_PRIVATE_KEY: process.env.OG_COMPUTE_PRIVATE_KEY,
  OG_COMPUTE_PROVIDER_ADDRESS: process.env.OG_COMPUTE_PROVIDER_ADDRESS,
  OG_CHAIN_RPC: process.env.OG_CHAIN_RPC,
  OG_CHAIN_PRIVATE_KEY: process.env.OG_CHAIN_PRIVATE_KEY,
  OG_CHAIN_RECEIPT_REGISTRY_ADDRESS: process.env.OG_CHAIN_RECEIPT_REGISTRY_ADDRESS
});

export const paths = {
  uploads: path.resolve(config.LOCAL_UPLOAD_DIR),
  artifacts: path.resolve(config.LOCAL_ARTIFACT_DIR),
  connectors: path.resolve(config.LOCAL_CONNECTOR_DIR)
};
