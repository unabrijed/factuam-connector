#!/usr/bin/env node
/**
 * Creates agents/local/<agent>/private.pem for each local AXL node if missing (ed25519).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { LOCAL_AX_NODES, localAgentsRoot, nodeConfigPath } from "./axl-local-topology.mjs";

function ensureKeyForNode(node) {
  const dir = path.dirname(nodeConfigPath(node));
  const pem = path.join(dir, "private.pem");
  if (fs.existsSync(pem)) return;
  fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync("openssl", ["genpkey", "-algorithm", "ed25519", "-out", "private.pem"], {
    cwd: dir,
    stdio: "inherit"
  });
  if (r.status !== 0) {
    console.error(`[ensure-axl-local-keys] openssl failed for ${node.id} (cwd=${dir})`);
    process.exit(r.status ?? 1);
  }
  console.log(`[ensure-axl-local-keys] created ${path.relative(localAgentsRoot, pem)}`);
}

if (!fs.existsSync(localAgentsRoot)) {
  console.error(`[ensure-axl-local-keys] missing ${localAgentsRoot}`);
  process.exit(1);
}

for (const node of LOCAL_AX_NODES) {
  ensureKeyForNode(node);
}

console.log("[ensure-axl-local-keys] ok");
