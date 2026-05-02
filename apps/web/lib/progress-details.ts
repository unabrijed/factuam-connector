/** Maps orchestrator `details.agent` to short UX labels. */
const AGENT_LABELS: Record<string, string> = {
  evidence_classifier: "Evidence classifier",
  experiment_planner: "Experiment planner",
  validation_agent: "Data validation",
  diagnosis_agent: "Dataset diagnosis",
  strategy_agent: "Strategy",
  reflection_agent: "Reflection",
  training_agent: "ML training",
  verifier: "ML verifier",
  answer_generator: "Answer generator"
};

const MAX_STRING = 280;
const MAX_JSON = 520;
const SKIP_KEYS = new Set(["agent", "transport"]);

export function friendlyProgressAgentLabel(agent: unknown): string | null {
  if (typeof agent !== "string" || !agent.trim()) return null;
  const key = agent.trim();
  return AGENT_LABELS[key] ?? key.replace(/_/g, " ");
}

function truncateString(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function formatValue(value: unknown, _depth: number): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return truncateString(value, MAX_STRING);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const inner = value.map((v) => formatValue(v, _depth + 1)).join(", ");
    const s = `[${inner}]`;
    return s.length > MAX_JSON ? truncateString(s, MAX_JSON) : s;
  }
  if (typeof value === "object") {
    try {
      const s = JSON.stringify(value);
      return s.length > MAX_JSON ? truncateString(s, MAX_JSON) : s;
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

export type DetailLine = { key: string; value: string };

/** Remaining keys after agent/transport for a compact list UI. */
export function progressDetailLines(details: Record<string, unknown> | undefined): DetailLine[] {
  if (!details || typeof details !== "object") return [];
  const out: DetailLine[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (SKIP_KEYS.has(key)) continue;
    const valueStr = formatValue(value, 0);
    if (valueStr === "—" && value === undefined) continue;
    out.push({ key: key.replace(/_/g, " "), value: valueStr });
  }
  return out;
}

export function transportLabel(transport: unknown): string | null {
  if (typeof transport !== "string" || !transport.trim()) return null;
  const t = transport.trim().toLowerCase();
  if (t === "local") return "Local";
  if (t === "remote" || t === "axl") return "Remote";
  return transport;
}

function detailsHaveInsight(d: Record<string, unknown>): boolean {
  const keys = Object.keys(d).filter((k) => k !== "transport");
  if (keys.length === 0) return false;
  if (keys.length === 1 && keys[0] === "agent") return true;
  return keys.some((k) => k !== "agent");
}

/** One-line hint under the transcript while a run is active (skips duplicating bare `currentMessage`). */
export function composeProgressLiveSubtitle(entry: {
  stage?: string;
  message?: string;
  details?: Record<string, unknown>;
} | null): string | null {
  if (!entry) return null;
  const d = entry.details && typeof entry.details === "object" ? entry.details : null;
  if (!d || !detailsHaveInsight(d)) return null;

  const agent = friendlyProgressAgentLabel(d.agent);
  const parts: string[] = [];

  if (agent) parts.push(agent);

  const vs = d.verificationStatus;
  const conf = d.confidence;
  if (typeof vs === "string") parts.push(formatLabelSnake(vs));
  else if (typeof conf === "string") parts.push(`confidence ${conf}`);

  const et = d.evidenceType;
  const rl = d.riskLevel;
  if (typeof et === "string" && !parts.some((p) => p.includes(et))) parts.push(et);
  if (typeof rl === "string" && parts.length < 3) parts.push(`${rl} risk`);

  const passed = d.passed;
  if (typeof passed === "boolean") parts.push(passed ? "validation passed" : "validation failed");

  const status = d.verdict ?? d.strategyKey ?? d.strategy;
  if (typeof status === "string" && parts.length < 3) parts.push(status);

  const joined = parts.length >= 2 ? parts.slice(0, 3).join(" · ") : parts.length === 1 ? parts[0] : null;
  if (!joined) return null;
  const msg = typeof entry.message === "string" ? entry.message.trim() : "";
  if (msg && joined === msg) return null;
  return joined;
}

function formatLabelSnake(s: string): string {
  return s.replace(/_/g, " ");
}
