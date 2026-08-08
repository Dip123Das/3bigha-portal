export type CostCustomFieldType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "select";

export type CostCustomFieldDefinition = {
  id?: string;
  fieldKey: string;
  label: string;
  fieldType: CostCustomFieldType;
  options?: string[];
  required?: boolean;
  sortOrder?: number;
};

export const PROTECTED_COST_LEDGER_COLUMNS = [
  "entry_date",
  "entry_type",
  "description",
  "cost_centre",
  "quantity",
  "unit",
  "rate",
  "amount",
] as const;

function slug(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function makeCostCustomFieldKey(
  label: string,
  existingKeys: string[] = []
): string {
  const base = slug(label) || "custom_field";
  const used = new Set(existingKeys.map((key) => slug(key)));

  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export function isProtectedCostLedgerColumn(key: string): boolean {
  return (PROTECTED_COST_LEDGER_COLUMNS as readonly string[]).includes(
    slug(key)
  );
}

export function normalizeCustomFieldValue(
  fieldType: CostCustomFieldType,
  value: unknown
): string | number | boolean | null {
  if (value === null || value === undefined || value === "") return null;

  switch (fieldType) {
    case "number":
    case "currency": {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
    case "boolean":
      return Boolean(value);
    case "date":
    case "text":
    case "select":
    default:
      return String(value);
  }
}

export function humanCostEntryExamples() {
  return [
    {
      description: "Jungle clearing labour",
      entryType: "wage",
      amount: 1500,
    },
    {
      description: "Vehicle fare",
      entryType: "transport",
      amount: 100,
    },
  ] as const;
}
