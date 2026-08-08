export const INVENTORY_TRANSACTION_TYPES = [
  "opening_stock",
  "purchase_receipt",
  "production_receipt",
  "customer_return",
  "material_return",
  "sale",
  "dispatch",
  "material_issue",
  "damage",
  "loss",
  "transfer_out",
  "transfer_in",
  "stock_adjustment_in",
  "stock_adjustment_out",
  "reservation",
  "release_reservation",
] as const;

export type InventoryTransactionType =
  (typeof INVENTORY_TRANSACTION_TYPES)[number];

export type InventoryDomain =
  | "materials"
  | "rentals"
  | "property";

export function inventoryTransactionLabel(
  type: InventoryTransactionType
): string {
  switch (type) {
    case "opening_stock":
      return "Opening Stock";
    case "purchase_receipt":
      return "Purchase Receipt";
    case "production_receipt":
      return "Production Receipt";
    case "customer_return":
      return "Customer Return";
    case "material_return":
      return "Material Return";
    case "sale":
      return "Sale";
    case "dispatch":
      return "Dispatch";
    case "material_issue":
      return "Material Issue";
    case "damage":
      return "Damage";
    case "loss":
      return "Loss";
    case "transfer_out":
      return "Transfer Out";
    case "transfer_in":
      return "Transfer In";
    case "stock_adjustment_in":
      return "Stock Adjustment +";
    case "stock_adjustment_out":
      return "Stock Adjustment -";
    case "reservation":
      return "Reservation";
    case "release_reservation":
      return "Release Reservation";
  }
}

export function inventoryTransactionDirection(
  type: InventoryTransactionType
): "in" | "out" | "neutral" {
  switch (type) {
    case "opening_stock":
    case "purchase_receipt":
    case "production_receipt":
    case "customer_return":
    case "material_return":
    case "transfer_in":
    case "stock_adjustment_in":
      return "in";

    case "sale":
    case "dispatch":
    case "material_issue":
    case "damage":
    case "loss":
    case "transfer_out":
    case "stock_adjustment_out":
      return "out";

    case "reservation":
    case "release_reservation":
      return "neutral";
  }
}
