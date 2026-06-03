// lib/vendors/vendorSmartSuggestions.ts

import type { VendorListingMemoryRow } from "@/lib/vendors/vendorListingMemory";

export type VendorSmartSuggestion = {
  key: string;
  title: string;
  subtitle: string;
  reason: string;
  score: number;
  memory: VendorListingMemoryRow;
};

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function getMemoryTimeScore(row: VendorListingMemoryRow): number {
  const t = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  if (!Number.isFinite(t) || t <= 0) return 0;

  const ageDays = Math.max(0, (Date.now() - t) / (1000 * 60 * 60 * 24));

  if (ageDays <= 7) return 30;
  if (ageDays <= 30) return 20;
  if (ageDays <= 90) return 10;
  return 3;
}

function getMemoryUsageScore(row: VendorListingMemoryRow): number {
  const count = Number(row.usage_count ?? 1);
  if (!Number.isFinite(count) || count <= 1) return 5;
  return Math.min(35, count * 7);
}

function getPayloadCompletenessScore(payload: Record<string, any>): number {
  const keys = Object.keys(payload ?? {}).filter((k) => {
    const v = payload[k];
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  });

  return Math.min(25, keys.length * 3);
}

function getSuggestionSubtitle(row: VendorListingMemoryRow): string {
  const p = row.payload ?? {};

  const location = [
    p.city,
    p.locality,
    p.district,
    p.state,
    p.delivery_city,
    p.delivery_district,
  ]
    .map(safeText)
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  if (location) return location;

  if (p.pricing_unit || p.rate || p.security_deposit) {
    return [p.pricing_unit, p.rate ? `₹${p.rate}` : "", p.security_deposit ? `Deposit ₹${p.security_deposit}` : ""]
      .map(safeText)
      .filter(Boolean)
      .join(" • ");
  }

  const inv = p.inventory ?? {};
  if (inv.stock_unit || inv.selling_price || inv.vehicle_type) {
    return [inv.stock_unit, inv.selling_price ? `₹${inv.selling_price}` : "", inv.vehicle_type]
      .map(safeText)
      .filter(Boolean)
      .join(" • ");
  }

  if (Array.isArray(p.items) && p.items.length > 0) {
    return p.items
      .slice(0, 2)
      .map((x: any) => safeText(x.item_name))
      .filter(Boolean)
      .join(" + ");
  }

  return "Saved working style";
}

function getSuggestionReason(row: VendorListingMemoryRow): string {
  const count = Number(row.usage_count ?? 1);

  if (count > 1) {
    return "Frequently reused setup";
  }

  const t = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  const ageDays = t > 0 ? (Date.now() - t) / (1000 * 60 * 60 * 24) : 9999;

  if (ageDays <= 14) {
    return "Recently used workflow";
  }

  return "Suggested from saved workflow";
}

export function buildVendorSmartSuggestions(
  rows: VendorListingMemoryRow[],
  limit = 4
): VendorSmartSuggestion[] {
  const ranked = (rows ?? [])
    .map((row) => {
      const payload = row.payload ?? {};
      const score =
        getMemoryTimeScore(row) +
        getMemoryUsageScore(row) +
        getPayloadCompletenessScore(payload);

      return {
        key: row.id,
        title: row.title || "Saved Setup",
        subtitle: getSuggestionSubtitle(row),
        reason: getSuggestionReason(row),
        score,
        memory: row,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}
