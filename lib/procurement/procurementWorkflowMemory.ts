export type ProcurementStage =
  | "estimated"
  | "rfq_sent"
  | "vendor_selected"
  | "ordered"
  | "dispatched"
  | "delivered"
  | "consumed";

export type ProcurementItem = {
  id: string;

  material: string;

  quantity?: string;

  vendor?: string;

  stage: ProcurementStage;

  updatedAt: number;
};

const STORAGE_KEY = "threebigha-procurement-workflow";

export function loadProcurementWorkflow(): ProcurementItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    return JSON.parse(raw) as ProcurementItem[];
  } catch {
    return [];
  }
}

export function saveProcurementWorkflow(
  items: ProcurementItem[]
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  } catch {}
}

export function upsertProcurementItem(
  item: ProcurementItem
) {
  const current = loadProcurementWorkflow();

  const filtered = current.filter(
    (x) => x.id !== item.id
  );

  filtered.unshift(item);

  saveProcurementWorkflow(filtered);
}

export function removeProcurementItem(
  id: string
) {
  const current = loadProcurementWorkflow();

  saveProcurementWorkflow(
    current.filter((x) => x.id !== id)
  );
}
