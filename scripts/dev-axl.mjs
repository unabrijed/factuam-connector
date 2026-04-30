import { spawn } from "node:child_process";

const commands = [
  ["yarn", ["workspace", "@factum/api", "dev:axl-classifier"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-planner"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-validation"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-diagnosis"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-strategy"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-training"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-reflection"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-answer"]],
  ["yarn", ["workspace", "@factum/api", "dev:axl-verifier"]]
];

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

for (const [command, args] of commands) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev:axl] worker exited: ${command} ${args.join(" ")} code=${code ?? "null"} signal=${signal ?? "null"}`);
    stopAll(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
