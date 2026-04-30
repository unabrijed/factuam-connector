export type FactumMode = "gensyn" | "dev";

export function getMode(): FactumMode {
  const raw = process.env.FACTUM_MODE ?? "gensyn";
  if (raw !== "gensyn" && raw !== "dev") {
    throw new Error(`Invalid FACTUM_MODE: ${raw}. Must be 'gensyn' or 'dev'.`);
  }
  return raw;
}

export function isDevMode() {
  return getMode() === "dev";
}

export function requireGensyn() {
  if (getMode() !== "gensyn") {
    throw new Error("This path requires FACTUM_MODE=gensyn");
  }
}
