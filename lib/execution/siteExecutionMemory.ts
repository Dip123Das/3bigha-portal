export type SiteExecutionStage =
  | "land_ready"
  | "foundation"
  | "column_casting"
  | "brick_work"
  | "roof_casting"
  | "electrical"
  | "plumbing"
  | "plaster"
  | "flooring"
  | "painting"
  | "completed";

export type SiteExecutionItem = {
  stage: SiteExecutionStage;

  status:
    | "pending"
    | "running"
    | "completed";

  updatedAt: number;
};

const STORAGE_KEY =
  "threebigha-site-execution";

export function loadSiteExecution():
  SiteExecutionItem[] {
  if (typeof window === "undefined")
    return [];

  try {
    const raw = localStorage.getItem(
      STORAGE_KEY
    );

    if (!raw) return [];

    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSiteExecution(
  items: SiteExecutionItem[]
) {
  if (typeof window === "undefined")
    return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  } catch {}
}

export function updateSiteStage(
  stage: SiteExecutionStage,
  status:
    | "pending"
    | "running"
    | "completed"
) {
  const current =
    loadSiteExecution();

  const filtered = current.filter(
    (x) => x.stage !== stage
  );

  filtered.push({
    stage,
    status,
    updatedAt: Date.now(),
  });

  saveSiteExecution(filtered);
}
