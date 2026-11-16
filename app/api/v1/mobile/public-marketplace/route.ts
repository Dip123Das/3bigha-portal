export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mobileFailure, mobileSuccess } from "@/lib/mobile/contracts/v1";

const NO_STORE_HEADERS = { "Cache-Control": "public, max-age=60, s-maxage=60" };
const CATEGORIES = ["property", "materials", "services", "rentals"] as const;
type Category = (typeof CATEGORIES)[number];
type PublicItem = {
  id: string;
  category: Category;
  title: string;
  description: string | null;
  location: string | null;
  price: number | null;
  unit: string | null;
};

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);

async function loadCategory(category: Category, supabase: ReturnType<typeof getSupabaseAdmin>): Promise<PublicItem[]> {
  if (category === "property") {
    const { data, error } = await supabase.from("property_listings")
      .select("id,title,city,state,price,updated_at")
      .eq("status", "published").eq("is_public", true)
      .order("updated_at", { ascending: false }).limit(60);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ id: String(row.id), category, title: text(row.title) ?? "Property listing", description: null, location: [row.city, row.state].map(text).filter(Boolean).join(" · ") || null, price: number(row.price), unit: null }));
  }
  if (category === "materials") {
    const { data, error } = await supabase.from("material_listings")
      .select("id,title,description,local_name,packaging_unit,is_active,is_public,status,published_at")
      .eq("is_active", true).or("is_public.eq.true,published_at.not.is.null,status.ilike.published,status.ilike.active")
      .order("created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ id: String(row.id), category, title: text(row.title) ?? text(row.local_name) ?? "Material listing", description: text(row.description), location: null, price: null, unit: text(row.packaging_unit) }));
  }
  if (category === "services") {
    const { data, error } = await supabase.from("v_service_listings")
      .select("provider_service_id,custom_service,service_description,city,district,state,pricing_kind,min_price,max_price,service_is_active,provider_service_created_at")
      .eq("service_is_active", true).order("provider_service_created_at", { ascending: false }).limit(60);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ id: String(row.provider_service_id), category, title: text(row.custom_service) ?? "Professional service", description: text(row.service_description), location: [row.city, row.district, row.state].map(text).filter(Boolean).join(" · ") || null, price: number(row.min_price), unit: text(row.pricing_kind) }));
  }
  const { data, error } = await supabase.from("rental_listings_public")
    .select("id,title,description,city,district,state,rate,rate_unit_label,is_active")
    .eq("is_active", true).order("updated_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: String(row.id), category, title: text(row.title) ?? "Rental listing", description: text(row.description), location: [row.city, row.district, row.state].map(text).filter(Boolean).join(" · ") || null, price: number(row.rate), unit: text(row.rate_unit_label) }));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const selected = (params.get("category") ?? "all").toLowerCase();
  if (selected !== "all" && !CATEGORIES.includes(selected as Category)) {
    return NextResponse.json(mobileFailure("INVALID_CATEGORY", "Choose a supported marketplace category."), { status: 400, headers: NO_STORE_HEADERS });
  }
  const query = (params.get("q") ?? "").trim().slice(0, 100).toLowerCase();
  try {
    const supabase = getSupabaseAdmin();
    const categories: Category[] = selected === "all" ? [...CATEGORIES] : [selected as Category];
    const batches = await Promise.all(categories.map((category) => loadCategory(category, supabase)));
    const items = batches.flat().filter((item) => !query || `${item.title} ${item.description ?? ""} ${item.location ?? ""}`.toLowerCase().includes(query)).slice(0, 100);
    return NextResponse.json(mobileSuccess({ items, categories }), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("MOBILE_PUBLIC_MARKETPLACE_FAILED", error);
    return NextResponse.json(mobileFailure("MARKETPLACE_UNAVAILABLE", "Marketplace listings could not be loaded right now.", true), { status: 500, headers: NO_STORE_HEADERS });
  }
}
