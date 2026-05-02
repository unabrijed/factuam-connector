import { isDevMode } from "./mode";

/** Hackathon single-node: one mesh peer id for every role (GET /topology → our_public_key). */
function singleMeshPeerId(): string | undefined {
  const v = process.env.AXL_SINGLE_PEER_ID?.trim();
  return v && /^[0-9a-fA-F]{64}$/.test(v) ? v : undefined;
}

function requirePeer(name: string, envVar: string): string {
  const unified = singleMeshPeerId();
  if (unified) return unified;

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
