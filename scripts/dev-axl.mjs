import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { LOCAL_AX_WORKER_PROCESSES, repoRoot } from "./axl-local-topology.mjs";

/** Optional: path to a dotenv file merged into worker env (e.g. generated peer keys). */
function extraEnvPath() {
  const fromEnv = process.env.factuam_LOCAL_AXL_ENV_FILE?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(repoRoot, fromEnv);
  return path.join(repoRoot, ".env.local.axl");
}

function parseDotEnv(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function loadOptionalLocalAxlEnvSync() {
  const p = extraEnvPath();
  try {
    if (!fs.existsSync(p)) return {};
    return parseDotEnv(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

const baseExtra = loadOptionalLocalAxlEnvSync();

const children = [];
let shuttingDown = false;

function stopAll(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill("SIGKILL");
    }
    process.exit(code);
  }, 1500).unref();
}

for (const w of LOCAL_AX_WORKER_PROCESSES) {
  const child = spawn("yarn", ["workspace", "@factuam/api", w.workspaceScript], {
    stdio: "inherit",
    cwd: repoRoot,
    env: {
      ...process.env,
      ...baseExtra,
      GENSYN_AXL_API_URL: `http://127.0.0.1:${w.apiPort}`
    }
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[dev:axl] worker exited: ${w.workspaceScript} code=${code ?? "null"} signal=${signal ?? "null"}`
    );
    stopAll(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
