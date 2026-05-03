import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ReeVerification } from "@factuam/shared-types";

const execFileAsync = promisify(execFile);

export type ReeMode = "default" | "deterministic" | "reproducible";

export type ReeRunRequest = {
  model: string;
  prompt: string;
  config?: Record<string, unknown>;
  context?: Record<string, unknown>;
  mode?: ReeMode;
  /** Used for stable prompt filenames when running `gensyn-sdk` */
  experimentId?: string;
};

export type ReeRunResult = {
  generatedText: string;
  receipt: Record<string, unknown>;
  verification: ReeVerification;
};

export type ReeClientConfig = {
  /** CLI name or path, e.g. `gensyn-sdk` or `ree` */
  command?: string;
  /** Legacy `ree` only: extra args before `--input` */
  baseArgs?: string[];
  /** Override tasks root for `gensyn-sdk` (else `REE_TASKS_ROOT` / `/tmp/factuam-ree`) */
  tasksRoot?: string;
  maxNewTokens?: number;
  temperature?: number;
};

function sha256Hex(value: string): `0x${string}` {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

function isGensynSdkCommand(command: string): boolean {
  const base = path.basename(command, path.extname(command)).toLowerCase();
  return base === "gensyn-sdk";
}

function tasksRootFromEnv(config?: ReeClientConfig): string {
  return (
    config?.tasksRoot?.trim() ||
    process.env.REE_TASKS_ROOT?.trim() ||
    process.env.GENSYN_REE_TASKS_ROOT?.trim() ||
    "/tmp/factuam-ree"
  );
}

function maxNewTokensFromEnv(config?: ReeClientConfig): string {
  if (config?.maxNewTokens != null) return String(Math.max(1, Math.floor(config.maxNewTokens)));
  const n = process.env.REE_MAX_NEW_TOKENS ?? process.env.GENSYN_REE_MAX_NEW_TOKENS;
  if (n && /^\d+$/.test(n.trim())) return n.trim();
  return "256";
}

function temperatureFromEnv(config?: ReeClientConfig): string {
  if (config?.temperature != null) return String(config.temperature);
  const t = process.env.GENSYN_REE_TEMPERATURE ?? process.env.REE_TEMPERATURE;
  if (t && !Number.isNaN(Number(t))) return String(Number(t));
  return "0.3";
}

async function findLatestReceiptFile(tasksRoot: string, model: string): Promise<string> {
  const sanitized = model.replace(/\//g, "--");
  const metaDir = path.join(tasksRoot, sanitized, "metadata");
  const names = await readdir(metaDir).catch(() => [] as string[]);
  const receipts = names.filter((f) => f.startsWith("receipt_") && f.endsWith(".json")).sort((a, b) => b.localeCompare(a));
  if (!receipts.length) {
    throw new Error(`REE receipt not found under ${metaDir}`);
  }
  return path.join(metaDir, receipts[0]!);
}

function buildVerificationFromReceipt(
  request: ReeRunRequest,
  receipt: Record<string, unknown>,
  receiptPath: string
): ReeVerification {
  const serializedReceipt = JSON.stringify(receipt);
  const textOutput = typeof receipt.text_output === "string" ? receipt.text_output : "";
  const receiptHashFromRee =
    typeof receipt.receipt_hash === "string"
      ? receipt.receipt_hash
      : sha256Hex(serializedReceipt);

  return {
    provider: "gensyn_ree",
    model: typeof receipt.model_name === "string" ? receipt.model_name : request.model,
    mode: request.mode ?? "reproducible",
    receiptHash: receiptHashFromRee.startsWith("0x") ? receiptHashFromRee : sha256Hex(serializedReceipt),
    promptHash:
      typeof receipt.prompt_hash === "string" && receipt.prompt_hash.startsWith("0x")
        ? receipt.prompt_hash
        : sha256Hex(request.prompt),
    configHash: typeof receipt.config_hash === "string" ? receipt.config_hash : sha256Hex(JSON.stringify(request.config ?? {})),
    outputHash: typeof receipt.tokens_hash === "string" ? receipt.tokens_hash : sha256Hex(textOutput),
    hardwareIndependent: true,
    verified: true,
    receipt: { ...receipt, receipt_path: receiptPath }
  };
}

async function runGensynSdk(
  command: string,
  request: ReeRunRequest,
  clientConfig: ReeClientConfig | undefined
): Promise<ReeRunResult> {
  const tasksRoot = tasksRootFromEnv(clientConfig);
  const opSet = request.mode ?? "reproducible";
  const experimentKey = (request.experimentId ?? randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "_");
  const promptDir = path.join(tasksRoot, "prompts");
  await mkdir(promptDir, { recursive: true });
  const promptFile = path.join(promptDir, `${experimentKey}.jsonl`);
  await writeFile(promptFile, `${JSON.stringify({ prompt: request.prompt })}\n`, "utf8");

  const args = [
    "run",
    "--tasks-root",
    tasksRoot,
    "--model-name",
    request.model,
    "--prompt-file",
    promptFile,
    "--operation-set",
    opSet,
    "--max-new-tokens",
    maxNewTokensFromEnv(clientConfig),
    "--temperature",
    temperatureFromEnv(clientConfig),
    "--no-do-sample"
  ];

  try {
    await execFileAsync(command, args, { maxBuffer: 32 * 1024 * 1024 });
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    const detail = e.stderr ?? e.message ?? String(err);
    throw new Error(`gensyn-sdk run failed: ${detail.slice(0, 4000)}`);
  }

  const receiptPath = await findLatestReceiptFile(tasksRoot, request.model);
  const raw = await readFile(receiptPath, "utf8");
  const receipt = JSON.parse(raw) as Record<string, unknown>;
  const textOutput = typeof receipt.text_output === "string" ? receipt.text_output : "";

  return {
    generatedText: textOutput,
    receipt,
    verification: buildVerificationFromReceipt(request, receipt, receiptPath)
  };
}

async function runLegacyRee(command: string, baseArgs: string[], request: ReeRunRequest): Promise<ReeRunResult> {
  const input = {
    model: request.model,
    prompt: request.prompt,
    config: request.config ?? {},
    context: request.context ?? {},
    mode: request.mode ?? "reproducible"
  };

  const { stdout } = await execFileAsync(command, [
    ...baseArgs,
    "--input",
    JSON.stringify(input),
    "--output-receipt"
  ]);

  const parsed = JSON.parse(stdout) as {
    generated_text?: string;
    generatedText?: string;
    receipt: Record<string, unknown>;
  };

  const generatedText = parsed.generated_text ?? parsed.generatedText ?? "";
  const receipt = parsed.receipt ?? {};
  const serializedReceipt = JSON.stringify(receipt);

  return {
    generatedText,
    receipt,
    verification: {
      provider: "gensyn_ree",
      model: request.model,
      mode: request.mode ?? "reproducible",
      receiptHash: sha256Hex(serializedReceipt),
      promptHash: sha256Hex(request.prompt),
      configHash: sha256Hex(JSON.stringify(request.config ?? {})),
      outputHash: sha256Hex(generatedText),
      hardwareIndependent: true,
      verified: true,
      receipt
    }
  };
}

export class ReeClient {
  private readonly command: string;
  private readonly baseArgs: string[];
  private readonly clientConfig: ReeClientConfig;

  constructor(config: ReeClientConfig = {}) {
    this.clientConfig = config;
    this.command = config.command ?? "gensyn-sdk";
    this.baseArgs = config.baseArgs ?? ["run"];
  }

  async run(request: ReeRunRequest): Promise<ReeRunResult> {
    if (isGensynSdkCommand(this.command)) {
      return runGensynSdk(this.command, request, this.clientConfig);
    }
    return runLegacyRee(this.command, this.baseArgs, request);
  }
}
