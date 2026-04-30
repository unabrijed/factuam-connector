type LogLevel = "info" | "warn" | "error";
const isDev = process.env.NODE_ENV !== "production";

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: typeof error === "string" ? error : "Unknown error" };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack?.split("\n").slice(0, 6)
  };
}

export function log(level: LogLevel, event: string, payload: Record<string, unknown> = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload
  };

  if (isDev) {
    const prefix = `[${record.ts}] ${level.toUpperCase()} ${event}`;
    const body = Object.entries(payload)
      .map(([key, value]) => {
        if (key === "error") return `${key}=${JSON.stringify(value)}`;
        return `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`;
      })
      .join(" ");
    const line = body ? `${prefix} ${body}` : prefix;
    if (level === "error") return console.error(line);
    if (level === "warn") return console.warn(line);
    return console.log(line);
  }

  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logError(event: string, error: unknown, payload: Record<string, unknown> = {}) {
  log("error", event, {
    ...payload,
    error: serializeError(error)
  });
}
