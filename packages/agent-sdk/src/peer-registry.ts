import { isDevMode } from "./mode";

function requirePeer(name: string, envVar: string): string {
  const value = process.env[envVar]?.trim();
  if (!value && !isDevMode()) {
    throw new Error(
      `[peer-registry] ${envVar} is not set. Start the ${name} AXL node and configure its public key.`
    );
  }
  return value ?? "";
}

export const PEERS = {
  classifier: requirePeer("classifier-agent", "AXL_PEER_CLASSIFIER"),
  planner: requirePeer("planner-agent", "AXL_PEER_PLANNER"),
  diagnosis: requirePeer("diagnosis-agent", "AXL_PEER_DIAGNOSIS"),
  strategy: requirePeer("strategy-agent", "AXL_PEER_STRATEGY"),
  training: requirePeer("training-agent", "AXL_PEER_TRAINING"),
  reflection: requirePeer("reflection-agent", "AXL_PEER_REFLECTION"),
  verifier: requirePeer("verifier-agent", "AXL_PEER_VERIFIER"),
  answer: requirePeer("answer-agent", "AXL_PEER_ANSWER")
} as const;

export type AgentPeerKey = keyof typeof PEERS;
