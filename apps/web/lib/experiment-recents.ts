const STORAGE_KEY = "factuam:experiments:v1";
const MAX_ITEMS = 40;

export type ExperimentRecent = {
  id: string;
  title: string;
  updatedAt: string;
  status?: string;
};

function safeParse(raw: string | null): ExperimentRecent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is ExperimentRecent =>
          Boolean(x) &&
          typeof x === "object" &&
          typeof (x as ExperimentRecent).id === "string" &&
          typeof (x as ExperimentRecent).title === "string"
      )
      .map((x) => ({
        id: x.id,
        title: x.title.slice(0, 120),
        updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : new Date().toISOString(),
        status: typeof x.status === "string" ? x.status : undefined
      }));
  } catch {
    return [];
  }
}

export function listExperimentRecents(): ExperimentRecent[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function upsertExperimentRecent(entry: ExperimentRecent): void {
  if (typeof window === "undefined") return;
  const prev = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const next = [
    {
      id: entry.id,
      title: entry.title.slice(0, 120),
      updatedAt: entry.updatedAt,
      status: entry.status
    },
    ...prev.filter((e) => e.id !== entry.id)
  ].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeExperimentRecent(id: string): void {
  if (typeof window === "undefined") return;
  const prev = safeParse(window.localStorage.getItem(STORAGE_KEY));
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(prev.filter((e) => e.id !== id))
  );
}
