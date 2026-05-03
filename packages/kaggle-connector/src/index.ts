import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { sha256Buffer } from "@factuam/proof-receipts";
import { KaggleConnectorParamsSchema, type KaggleConnectorParams } from "@factuam/shared-types";
import type { KaggleConnector as IKaggleConnector, ConnectorResult } from "../../connector-sdk/src/index";

export type KaggleConnectorOptions = {
  workspaceRoot: string;
  pythonBin?: string;
  apiToken?: string;
};

function summarizePythonStderr(stderr: string) {
  const lines = stderr
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const warningLines = lines.filter((line) => line.includes("Warning:") || line.includes("warnings.warn("));
  const tracebackIndex = lines.findIndex((line) => line.startsWith("Traceback "));
  const errorLine = [...lines].reverse().find((line) => /(Error:|Exception:|SyntaxError:|TypeError:)/.test(line));

  const summary: string[] = [];
  if (warningLines.length) {
    summary.push(`Warnings: ${warningLines[0]}`);
  }
  if (tracebackIndex >= 0) {
    const traceback = lines.slice(tracebackIndex, Math.min(lines.length, tracebackIndex + 4));
    summary.push(traceback.join("\n"));
  } else if (errorLine) {
    summary.push(errorLine);
  } else if (lines.length) {
    summary.push(lines.slice(-4).join("\n"));
  }

  return summary.join("\n");
}

function splitCommand(command: string) {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"(.*)"$/, "$1")) ?? [];
  const executable = parts.shift();
  if (!executable) {
    throw new Error("Command is empty");
  }
  return {
    executable,
    args: parts
  };
}

function normalizePythonCommand(command: string) {
  const normalized = splitCommand(command);
  const safeArgs: string[] = [];
  const ignoredArgs: string[] = [];

  for (const arg of normalized.args) {
    if (arg.startsWith("-")) {
      safeArgs.push(arg);
    } else {
      ignoredArgs.push(arg);
    }
  }

  if (ignoredArgs.length) {
    console.warn(`[kaggle-connector] Ignoring unsupported KAGGLE_PYTHON_BIN trailing tokens: ${ignoredArgs.join(" ")}`);
  }

  return {
    executable: normalized.executable,
    args: safeArgs
  };
}

function isPathLikeCommand(command: string) {
  return (
    path.isAbsolute(command) ||
    command.startsWith("./") ||
    command.startsWith("../") ||
    command.includes(path.sep)
  );
}

function buildFallbackPythonCandidates(workspaceRoot: string) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const candidates = new Set<string>();

  for (let current = resolvedWorkspaceRoot; ; current = path.dirname(current)) {
    candidates.add(path.join(current, "workers", "ml-runner", ".venv", "bin", "python"));
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
  }

  candidates.add("python3");
  return [...candidates];
}

function resolvePythonCommand(command: string, workspaceRoot: string) {
  const normalized = normalizePythonCommand(command);
  if (!isPathLikeCommand(normalized.executable)) {
    return {
      command,
      resolvedFrom: "configured"
    } as const;
  }

  if (fsSync.existsSync(normalized.executable)) {
    return {
      command,
      resolvedFrom: "configured"
    } as const;
  }

  const fallbackCandidates = buildFallbackPythonCandidates(workspaceRoot);

  for (const candidate of fallbackCandidates) {
    if (!isPathLikeCommand(candidate) || fsSync.existsSync(candidate)) {
      console.warn(
        `[kaggle-connector] Configured python binary not found: ${normalized.executable}. Falling back to ${candidate}`
      );
      return {
        command: candidate,
        resolvedFrom: candidate
      } as const;
    }
  }

  return {
    command,
    resolvedFrom: "configured"
  } as const;
}

function isMissingKagglehubError(error: unknown) {
  return error instanceof Error && error.message.includes("ModuleNotFoundError: No module named 'kagglehub'");
}

function runCommand(command: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  return new Promise<void>((resolve, reject) => {
    const normalized = normalizePythonCommand(command);
    const child: ChildProcessWithoutNullStreams = spawn(normalized.executable, [...normalized.args, ...args], {
      stdio: "pipe",
      env: { ...process.env, ...extraEnv }
    });

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", (code: number | null) => {
      if (code === 0) return resolve();
      const summarized = summarizePythonStderr(stderr);
      reject(
        new Error(
          summarized ||
            `Command failed: ${normalized.executable} ${[...normalized.args, ...args].join(" ")}`
        )
      );
    });
  });
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(fullPath);
      return [fullPath];
    })
  );
  return nested.flat();
}

async function statSafe(targetPath: string) {
  try {
    return await fs.stat(targetPath);
  } catch {
    return null;
  }
}

export class KaggleDatasetConnector implements IKaggleConnector {
  readonly id = "kaggle_public_dataset_v1" as const;
  readonly provider = "kaggle" as const;

  constructor(private readonly options: KaggleConnectorOptions) {}

  manifest() {
    return {
      provider: this.provider,
      connectorId: this.id,
      displayName: "Kaggle Public Dataset",
      supportedModes: ["import"] as Array<"import">
    };
  }

  async execute(input: { params: KaggleConnectorParams; runId: string }): Promise<ConnectorResult> {
    const params = KaggleConnectorParamsSchema.parse(input.params);

    const runDir = path.join(this.options.workspaceRoot, input.runId);
    const downloadDir = path.join(runDir, "download");
    const resultPathFile = path.join(runDir, "kaggle-result.json");
    await fs.mkdir(runDir, { recursive: true });
    await fs.mkdir(downloadDir, { recursive: true });

    const pythonProgram = [
      "import json, sys, kagglehub",
      "handle = sys.argv[1]",
      "dataset_file = sys.argv[2]",
      "out_file = sys.argv[3]",
      "kwargs = {'force_download': True}",
      "if dataset_file:",
      "    kwargs['path'] = dataset_file",
      "resolved = kagglehub.dataset_download(handle, **kwargs)",
      "with open(out_file, 'w', encoding='utf-8') as fh:",
      "    json.dump({'path': resolved}, fh)"
    ].join("\n");

    const pythonCommand = resolvePythonCommand(this.options.pythonBin ?? "python3", this.options.workspaceRoot);
    const fallbackPythonCandidates = buildFallbackPythonCandidates(this.options.workspaceRoot).filter(
      (candidate) => candidate !== pythonCommand.command
    );

    const commandArgs = ["-c", pythonProgram, params.dataset, params.file ?? "", resultPathFile];
    const commandEnv = {
      ...(this.options.apiToken ? { KAGGLE_API_TOKEN: this.options.apiToken } : {}),
      KAGGLEHUB_CACHE: path.join(runDir, "cache")
    };

    try {
      await runCommand(pythonCommand.command, commandArgs, commandEnv);
    } catch (error) {
      if (!isMissingKagglehubError(error)) {
        throw error;
      }

      let lastError = error;
      for (const fallbackCandidate of fallbackPythonCandidates) {
        if (isPathLikeCommand(fallbackCandidate) && !fsSync.existsSync(fallbackCandidate)) {
          continue;
        }
        try {
          console.warn(
            `[kaggle-connector] ${normalizePythonCommand(pythonCommand.command).executable} is missing kagglehub. Retrying with ${fallbackCandidate}`
          );
          await runCommand(fallbackCandidate, commandArgs, commandEnv);
          lastError = undefined;
          break;
        } catch (fallbackError) {
          lastError = fallbackError;
          if (!isMissingKagglehubError(fallbackError)) {
            throw fallbackError;
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
    }

    const resolvedResult = JSON.parse(await fs.readFile(resultPathFile, "utf8")) as { path: string };
    const resolvedPath = resolvedResult.path;
    const resolvedStat = await statSafe(resolvedPath);
    if (!resolvedStat) {
      throw new Error("Kaggle download completed but no local dataset path was returned");
    }

    const extractedFiles = (
      resolvedStat.isDirectory() ? await listFilesRecursive(resolvedPath) : [resolvedPath]
    ).filter((filePath) => filePath.toLowerCase().endsWith(".csv"));
    if (!extractedFiles.length) {
      throw new Error("No supported CSV files found in Kaggle dataset");
    }

    let selectedPath: string | undefined;
    if (params.file) {
      selectedPath = extractedFiles.find((filePath) => path.basename(filePath) === params.file);
      if (!selectedPath) {
        throw new Error(`Requested Kaggle file not found: ${params.file}`);
      }
    } else if (extractedFiles.length === 1) {
      selectedPath = extractedFiles[0];
    } else {
      throw new Error("Dataset contains multiple supported files; specify connectorRequest.params.file");
    }

    if (!selectedPath) {
      throw new Error("No Kaggle source file could be selected");
    }

    const selectedBuffer = await fs.readFile(selectedPath);
    const owner = params.dataset.split("/")[0] ?? "";

    return {
      provider: this.provider,
      connectorId: this.id,
      rawArtifacts: [
        { type: "source_file", path: selectedPath, sha256: sha256Buffer(selectedBuffer) }
      ],
      datasetCandidate: {
        path: selectedPath,
        format: "csv",
        originalFilename: path.basename(selectedPath)
      },
      sourceMeta: {
        provider: this.provider,
        dataset: params.dataset,
        owner,
        selectedFile: path.basename(selectedPath),
        allFiles: extractedFiles.map((filePath) => path.basename(filePath)),
        connectorVersion: "v1"
      }
    };
  }
}
