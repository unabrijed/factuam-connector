import crypto from "node:crypto";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stable(nested)])
    );
  }

  return value;
}

export function canonicalizeJson(data: unknown): string {
  return JSON.stringify(stable(data));
}

export function sha256Json(data: unknown): string {
  return crypto.createHash("sha256").update(canonicalizeJson(data)).digest("hex");
}

export function sha256String(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function sha256Buffer(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function asHex32(hash: string): `0x${string}` {
  const normalized = hash.startsWith("0x") ? hash.slice(2) : hash;
  return `0x${normalized.padStart(64, "0")}`;
}
