export type PublicOpportunityModule = "property" | "materials" | "services" | "rentals";

export function moduleLabel(module: PublicOpportunityModule) {
  if (module === "property") return "Property sellers / builders";
  if (module === "materials") return "Materials suppliers";
  if (module === "services") return "Service providers";
  return "Rental equipment owners";
}

export function moduleCta(module: PublicOpportunityModule) {
  if (module === "property") return "Become Property Partner";
  if (module === "materials") return "Become Supplier";
  if (module === "services") return "Join as Service Provider";
  return "Join as Equipment Owner";
}

export function opportunityLevel(priority?: string | null) {
  const value = String(priority || "").toLowerCase();

  if (value === "critical" || value === "high") return "High Opportunity";
  if (value === "medium") return "Growing Opportunity";
  return "Emerging Opportunity";
}

export function opportunityIcon(module: PublicOpportunityModule, category?: string | null) {
  const text = `${module} ${category || ""}`.toLowerCase();

  if (text.includes("cement")) return "🔥";
  if (text.includes("electric")) return "⚡";
  if (text.includes("jcb") || text.includes("rental")) return "🚜";
  if (text.includes("plot") || module === "property") return "🏡";
  if (module === "materials") return "🧱";
  if (module === "services") return "🛠️";
  if (module === "rentals") return "🚜";
  return "📍";
}

export function vendorTypeText(module: PublicOpportunityModule, category?: string | null) {
  const cleanCategory = String(category || "").trim();

  if (module === "materials") return cleanCategory ? `${cleanCategory} Supplier` : "Materials Supplier";
  if (module === "services") return cleanCategory ? `${cleanCategory} Provider` : "Service Provider";
  if (module === "rentals") return cleanCategory ? `${cleanCategory} Rental Provider` : "Equipment Rental Provider";
  return cleanCategory ? `${cleanCategory} Seller` : "Property Seller";
}
