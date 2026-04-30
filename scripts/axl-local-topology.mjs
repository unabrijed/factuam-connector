/**
 * Local multi-node AXL layout (see agents/local/<role>/node-config.json).
 * Orchestrator listens on tls://127.0.0.1:29100; specialists peer to it.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(__dirname, "..");
export const localAgentsRoot = path.join(repoRoot, "agents", "local");

/** @typedef {{ id: string, configDir: string, apiPort: number, envVar?: string }} LocalAxNode */

/** @type {LocalAxNode[]} */
export const LOCAL_AX_NODES = [
  { id: "orchestrator", configDir: "orchestrator", apiPort: 9002 },
  { id: "classifier-agent", configDir: "classifier-agent", apiPort: 9012, envVar: "AXL_PEER_CLASSIFIER" },
  { id: "planner-agent", configDir: "planner-agent", apiPort: 9022, envVar: "AXL_PEER_PLANNER" },
  { id: "validation-agent", configDir: "validation-agent", apiPort: 9032, envVar: "AXL_PEER_VALIDATION" },
  { id: "diagnosis-agent", configDir: "diagnosis-agent", apiPort: 9042, envVar: "AXL_PEER_DIAGNOSIS" },
  { id: "strategy-agent", configDir: "strategy-agent", apiPort: 9052, envVar: "AXL_PEER_STRATEGY" },
  { id: "training-agent", configDir: "training-agent", apiPort: 9062, envVar: "AXL_PEER_TRAINING" },
  { id: "reflection-agent", configDir: "reflection-agent", apiPort: 9072, envVar: "AXL_PEER_REFLECTION" },
  { id: "verifier-agent", configDir: "verifier-agent", apiPort: 9082, envVar: "AXL_PEER_VERIFIER" },
  { id: "answer-agent", configDir: "answer-agent", apiPort: 9092, envVar: "AXL_PEER_ANSWER" }
];

export const ORCHESTRATOR_API_PORT = 9002;

/** Specialist workers: yarn workspace script + HTTP API port for that agent's AXL bridge. */
export const LOCAL_AX_WORKER_PROCESSES = [
  { workspaceScript: "dev:axl-classifier", apiPort: 9012 },
  { workspaceScript: "dev:axl-planner", apiPort: 9022 },
  { workspaceScript: "dev:axl-validation", apiPort: 9032 },
  { workspaceScript: "dev:axl-diagnosis", apiPort: 9042 },
  { workspaceScript: "dev:axl-strategy", apiPort: 9052 },
  { workspaceScript: "dev:axl-training", apiPort: 9062 },
  { workspaceScript: "dev:axl-reflection", apiPort: 9072 },
  { workspaceScript: "dev:axl-answer", apiPort: 9092 },
  { workspaceScript: "dev:axl-verifier", apiPort: 9082 }
];

export function axlNodeBinaryPath() {
  const base = process.env.AXL_NODE_BIN?.trim() || path.join(repoRoot, "axl", "node");
  return process.platform === "win32" && !base.endsWith(".exe") ? `${base}.exe` : base;
}

export function nodeConfigPath(node) {
  return path.join(localAgentsRoot, node.configDir, "node-config.json");
}
