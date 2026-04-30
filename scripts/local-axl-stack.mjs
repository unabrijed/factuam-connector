#!/usr/bin/env node
/**
 * Local Gensyn AXL mesh for Factum:
 * 1. Ensures ed25519 keys under agents/local/<role>/
 * 2. Builds axl/node (make in axl/) if missing
 * 3. Starts one Go AXL process per agents/local/<role>/node-config.json
 * 4. Polls /topology on each HTTP port and writes repo-root .env.local.axl (API loads it at boot)
 * 5. Unless --nodes-only: starts TS workers with per-agent GENSYN_AXL_API_URL
 *
 * Usage:
 *   yarn local:axl              # nodes + .env.local.axl + workers
 *   yarn local:axl --nodes-only   # only Go nodes + write .env.local.axl (then run yarn dev:axl in another terminal)
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCAL_AX_NODES,
  LOCAL_AX_WORKER_PROCESSES,
  ORCHESTRATOR_API_PORT,
  axlNodeBinaryPath,
  nodeConfigPath,
  repoRoot
} from "./axl-local-topology.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nodesOnly = process.argv.includes("--nodes-only");
const envOutPath = path.join(repoRoot, ".env.local.axl");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Use node:http instead of fetch — Node 25+ undici can throw setTypeOfService EINVAL on some hosts.
 * @param {number} apiPort
 * @returns {Promise<string | null>}
 */
function fetchPublicKey(apiPort) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: apiPort,
        path: "/topology",
        method: "GET",
        timeout: 3000
      },
      (res) => {
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          buf += chunk;
        });
        res.on("end", () => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          try {
            const body = JSON.parse(buf);
            const key = body?.our_public_key;
            resolve(typeof key === "string" && /^[0-9a-f]{64}$/i.test(key) ? key : null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

/** @returns {Promise<boolean>} true if the port is free to bind */
function checkListenPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", (err) => {
      if (/** @type {NodeJS.ErrnoException} */ (err).code === "EADDRINUSE") resolve(false);
      else reject(err);
    });
    srv.listen({ port, host }, () => {
      srv.close(() => resolve(true));
    });
  });
}

async function assertAxlHttpPortsFree() {
  const ports = [...new Set(LOCAL_AX_NODES.map((n) => n.apiPort))].sort((a, b) => a - b);
  const busy = [];
  for (const p of ports) {
    if (!(await checkListenPortFree(p))) busy.push(p);
  }
  if (busy.length) {
    console.error(
      `[local:axl] HTTP API port(s) already in use: ${busy.join(", ")}. ` +
        `Stop the process holding them (e.g. another AXL node or \`lsof -i :9002\`) and retry.`
    );
    process.exit(1);
  }
}

function spawnNodeChild(bin, node) {
  const cfg = nodeConfigPath(node);
  const cwd = path.dirname(cfg);
  const child = spawn(bin, ["-config", path.basename(cfg)], {
    cwd,
    stdio: "inherit",
    env: process.env
  });
  nodeChildren.push(child);
  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM") return;
    console.error(`[local:axl] axl node ${node.id} exited code=${code ?? "null"} signal=${signal ?? "null"}`);
    stopAll(code ?? 1);
  });
  return child;
}

async function waitForPublicKeyOnPort(apiPort, label, deadlineMs) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    const k = await fetchPublicKey(apiPort);
    if (k) return k;
    await sleep(200);
  }
  console.error(`[local:axl] timeout waiting for /topology on ${label} (port ${apiPort})`);
  return null;
}

function ensureGoBinary() {
  const bin = axlNodeBinaryPath();
  if (fs.existsSync(bin)) return bin;
  console.log("[local:axl] building axl/node (first run)…");
  const axlDir = path.join(repoRoot, "axl");
  const r = spawnSync("make", ["build"], {
    cwd: axlDir,
    stdio: "inherit",
    env: { ...process.env, GOTOOLCHAIN: process.env.GOTOOLCHAIN || "go1.25.5" }
  });
  if (r.status !== 0 || !fs.existsSync(bin)) {
    console.error(
      "[local:axl] Go build failed. From axl/: run `make build` (needs Go 1.25.x / GOTOOLCHAIN=go1.25.5 and network for first toolchain fetch)."
    );
    process.exit(1);
  }
  return bin;
}

async function waitForAllKeys() {
  const deadline = Date.now() + 45_000;
  const expected = LOCAL_AX_NODES.filter((n) => n.envVar).length;
  while (Date.now() < deadline) {
    /** @type {Record<string, string>} */
    const byEnvVar = {};
    let ok = true;
    for (const node of LOCAL_AX_NODES) {
      if (!node.envVar) continue;
      const k = await fetchPublicKey(node.apiPort);
      if (!k) {
        ok = false;
        break;
      }
      byEnvVar[node.envVar] = k;
    }
    if (ok && Object.keys(byEnvVar).length === expected) return byEnvVar;
    await sleep(400);
  }
  return null;
}

function writeEnvFile(peerVars) {
  const lines = [
    "# Generated by `yarn local:axl`. Restart the API after changes.",
    "GENSYN_AXL_API_URL=http://127.0.0.1:9002",
    ...LOCAL_AX_NODES.filter((n) => n.envVar).map((n) => `${n.envVar}=${peerVars[n.envVar]}`),
    ""
  ];
  fs.writeFileSync(envOutPath, lines.join("\n"), "utf8");
  console.log(`[local:axl] wrote ${path.relative(repoRoot, envOutPath)}`);
}

const nodeChildren = [];
const yarnChildren = [];

function stopAll(code = 0) {
  for (const c of yarnChildren) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  for (const c of nodeChildren) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  setTimeout(() => process.exit(code), 1200).unref();
}

async function main() {
  const r = spawnSync(process.execPath, [path.join(__dirname, "ensure-axl-local-keys.mjs")], {
    stdio: "inherit",
    cwd: repoRoot
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }

  const bin = ensureGoBinary();

  for (const node of LOCAL_AX_NODES) {
    const cfg = nodeConfigPath(node);
    if (!fs.existsSync(cfg)) {
      console.error(`[local:axl] missing config ${cfg}`);
      process.exit(1);
    }
  }

  await assertAxlHttpPortsFree();

  const orchestrator = LOCAL_AX_NODES.find((n) => n.id === "orchestrator");
  const specialists = LOCAL_AX_NODES.filter((n) => n.id !== "orchestrator");
  if (!orchestrator) {
    console.error("[local:axl] internal: missing orchestrator in LOCAL_AX_NODES");
    process.exit(1);
  }

  console.log("[local:axl] starting orchestrator (hub) first…");
  spawnNodeChild(bin, orchestrator);
  if (!(await waitForPublicKeyOnPort(ORCHESTRATOR_API_PORT, "orchestrator", 20_000))) {
    console.error(
      "[local:axl] orchestrator did not become ready. If port was taken between check and bind, retry."
    );
    stopAll(1);
    return;
  }

  console.log("[local:axl] starting specialist nodes…");
  for (const node of specialists) {
    spawnNodeChild(bin, node);
  }

  console.log("[local:axl] waiting for HTTP /topology on all specialist nodes…");
  const peerVars = await waitForAllKeys();
  if (!peerVars) {
    console.error("[local:axl] timeout: nodes did not expose public keys. Check axl logs and ports 9002–9092.");
    stopAll(1);
    return;
  }

  writeEnvFile(peerVars);

  const sharedPeerEnv = { ...process.env, ...peerVars, GENSYN_AXL_API_URL: "http://127.0.0.1:9002" };

  if (!nodesOnly) {
    for (const w of LOCAL_AX_WORKER_PROCESSES) {
      const workerEnv = {
        ...sharedPeerEnv,
        GENSYN_AXL_API_URL: `http://127.0.0.1:${w.apiPort}`
      };
      const child = spawn("yarn", ["workspace", "@factum/api", w.workspaceScript], {
        stdio: "inherit",
        env: workerEnv,
        cwd: repoRoot
      });
      yarnChildren.push(child);
      child.on("exit", (code, signal) => {
        if (signal === "SIGTERM") return;
        console.error(
          `[local:axl] worker exited: ${w.workspaceScript} code=${code ?? "null"} signal=${signal ?? "null"}`
        );
        stopAll(code ?? 1);
      });
    }
    console.log("[local:axl] TS workers running. API must be restarted once so it loads .env.local.axl.");
  } else {
    console.log("[local:axl] --nodes-only: start workers with `yarn dev:axl` after API restart.");
  }

  process.on("SIGINT", () => stopAll(0));
  process.on("SIGTERM", () => stopAll(0));
}

main().catch((e) => {
  console.error(e);
  stopAll(1);
});
