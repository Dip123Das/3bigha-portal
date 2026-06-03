// lib/vendor/loadVendorTaxonomyExtensions.ts

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type VendorExtensionRow = {
  id: string;

  module: "materials" | "rentals";

  level:
    | "category"
    | "subcategory"
    | "product_group"
    | "attribute_value"
    | "equipment";

  parent_id: string | null;

  label: string;

  value: string;

  user_id: string;

  is_active: boolean | null;

  created_at?: string;
};

export async function loadVendorTaxonomyExtensions(params: {
  module: "materials" | "rentals";
  userId: string;
}) {
  const supabase = getSupabaseBrowser();

  const { data, error } = await supabase
    .from("vendor_taxonomy_extensions")
    .select(`
      id,
      module,
      level,
      parent_id,
      label,
      value,
      user_id,
      is_active,
      created_at
    `)
    .eq("module", params.module)
    .eq("user_id", params.userId)
    .or("is_active.is.null,is_active.eq.true")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Vendor taxonomy extension load failed", error);
    return [];
  }

  return ((data ?? []) as VendorExtensionRow[]).filter(
    (x) => x.is_active !== false
  );
}