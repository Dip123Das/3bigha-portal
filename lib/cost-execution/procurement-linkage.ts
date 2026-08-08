export type ProcurementPrefillPayload = {
  sourceSystem: "bos_cost_plan_line";
  planId: string;
  planLineId: string;
  itemName: string;
  quantity: number;
  unit: string;
  notes?: string | null;
};

export function costProcurementIdempotencyKey(input: {
  planLineId: string;
  quantity: number;
  unit: string;
}) {
  return [
    "cost-plan-line",
    input.planLineId,
    Number(input.quantity || 0),
    String(input.unit || "").trim().toLowerCase(),
  ].join(":");
}

export function buildProcurementPrefill(
  input: ProcurementPrefillPayload
) {
  return {
    source: "cost_plan_line",
    planId: input.planId,
    planLineId: input.planLineId,
    title: `Procure ${input.itemName}`,
    description: input.notes || "",
    items: [
      {
        material_name: input.itemName,
        qty: input.quantity,
        unit: input.unit || "",
        notes: input.notes || "",
      },
    ],
  };
}

export function saveProcurementPrefillToBrowser(
  payload: ReturnType<typeof buildProcurementPrefill>
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    "3bigha_cost_procurement_prefill",
    JSON.stringify({
      ...payload,
      createdAt: new Date().toISOString(),
    })
  );
}

export function readProcurementPrefillFromBrowser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(
      "3bigha_cost_procurement_prefill"
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.source !== "cost_plan_line") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProcurementPrefillFromBrowser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(
    "3bigha_cost_procurement_prefill"
  );
}
