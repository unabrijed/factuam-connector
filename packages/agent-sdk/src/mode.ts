export type factuamMode = "gensyn" | "dev";

export function getMode(): factuamMode {
  const raw = process.env.factuam_MODE ?? "gensyn";
  if (raw !== "gensyn" && raw !== "dev") {
    throw new Error(`Invalid factuam_MODE: ${raw}. Must be 'gensyn' or 'dev'.`);
  }
  return raw;
}

export function isDevMode() {
  return getMode() === "dev";
}

export function requireGensyn() {
  if (getMode() !== "gensyn") {
    throw new Error("This path requires factuam_MODE=gensyn");
  }
}
