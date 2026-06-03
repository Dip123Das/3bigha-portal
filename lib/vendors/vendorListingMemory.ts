// lib/vendors/vendorListingMemory.ts

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type VendorMemoryModule =
  | "property"
  | "materials"
  | "rentals"
  | "services"
  | "procurement"
  | "construction"
  | "finance"
  | "investment"
  | "general";

export type VendorMemoryType =
  | "location"
  | "pricing"
  | "description"
  | "inventory"
  | "delivery"
  | "specification"
  | "availability"
  | "payment"
  | "media"
  | "workflow"
  | "contact"
  | "other";

export type VendorListingMemoryRow = {
  id: string;
  user_id: string;
  module: VendorMemoryModule;
  memory_type: VendorMemoryType;
  title: string;
  payload: Record<string, any>;
  usage_count: number | null;
  last_used_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function loadVendorListingMemory(params: {
  userId: string;
  module?: VendorMemoryModule;
  memoryType?: VendorMemoryType;
  limit?: number;
}) {
  const supabase = getSupabaseBrowser();

  let query = supabase
    .from("vendor_listing_memory")
    .select(
      "id,user_id,module,memory_type,title,payload,usage_count,last_used_at,created_at,updated_at"
    )
    .eq("user_id", params.userId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(params.limit ?? 10);

  if (params.module) {
    query = query.eq("module", params.module);
  }

  if (params.memoryType) {
    query = query.eq("memory_type", params.memoryType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Vendor listing memory load failed", error);
    return [];
  }

  return (data ?? []) as VendorListingMemoryRow[];
}

export async function saveVendorListingMemory(params: {
  userId: string;
  module: VendorMemoryModule;
  memoryType: VendorMemoryType;
  title: string;
  payload: Record<string, any>;
}) {
  const supabase = getSupabaseBrowser();

  const cleanTitle = params.title.trim().slice(0, 140);

  if (!cleanTitle) return null;

  const { data, error } = await supabase
    .from("vendor_listing_memory")
    .insert({
      user_id: params.userId,
      module: params.module,
      memory_type: params.memoryType,
      title: cleanTitle,
      payload: params.payload,
      usage_count: 1,
      last_used_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Vendor listing memory save failed", error);
    return null;
  }

  return data;
}