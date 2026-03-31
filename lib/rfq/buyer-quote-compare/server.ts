import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type BuyerQuoteVendor = {
  vendor_id: string;
  quote_id: string;
  version: number;
  status: string | null;
  based_on_revision_no: number | null;

  delivery_days: number | null;
  valid_till: string | null;
  notes: string | null;

  gst_mode: string | null;
  gst_rate: number | null;
  subtotal: number | null;
  gst_amount: number | null;
  grand_total: number | null;

  updated_at: string | null;
  created_at: string | null;

  is_outdated: boolean;

  vendor_business_name?: string | null;
  vendor_city?: string | null;
  vendor_locality?: string | null;
};

export type BuyerRfqItem = {
  id: string;
  line_no: number | null;
  title: string | null;
  description: string | null;
  qty: number | null;
  uom: string | null;
};

export type BuyerQuoteItem = {
  quote_id: string;
  rfq_item_id: string;
  qty: number | null;
  unit_price: number | null;
  line_total: number | null;
};

export async function fetchBuyerQuoteCompare(rfqId: string) {
  const supabase = getSupabaseServerClient(cookies());

  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) return { error: uErr.message };
  const userId = u.user?.id;
  if (!userId) return { error: "Not logged in." };

  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select(
      "id, public_id, module, status, meta, created_at, updated_at, revision_no, requester_user_id, created_by, contact_name, city, district, locality, pincode"
    )
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqErr) return { error: rfqErr.message };
  if (!rfq) return { error: "RFQ not found." };

  const ownerId = (rfq as any).requester_user_id ?? (rfq as any).created_by ?? null;
  if (ownerId !== userId) return { error: "Access denied (not your RFQ)." };

  const revisionNo = (rfq as any).revision_no ?? 1;

  const { data: items, error: itemsErr } = await supabase
    .from("rfq_items")
    .select("id,line_no,title,description,qty,uom")
    .eq("rfq_id", rfqId)
    .order("line_no", { ascending: true });

  if (itemsErr) return { error: itemsErr.message };

  const { data: quotes, error: quotesErr } = await supabase
    .from("rfq_quotes")
    .select(
      "id, vendor_id, version, status, based_on_revision_no, delivery_days, valid_till, notes, gst_mode, gst_rate, subtotal, gst_amount, grand_total, created_at, updated_at"
    )
    .eq("rfq_id", rfqId);

  if (quotesErr) return { error: quotesErr.message };

  const latestByVendor = new Map<string, any>();
  for (const q of quotes ?? []) {
    const vid = String((q as any).vendor_id);
    const v = Number((q as any).version ?? 0);
    const cur = latestByVendor.get(vid);
    if (!cur || v > Number(cur.version ?? 0)) latestByVendor.set(vid, q);
  }

  const vendorQuotes: BuyerQuoteVendor[] = Array.from(latestByVendor.values()).map((q: any) => {
    const based = q.based_on_revision_no ?? null;
    return {
      vendor_id: String(q.vendor_id),
      quote_id: String(q.id),
      version: Number(q.version ?? 0),
      status: q.status ?? null,
      based_on_revision_no: based,

      delivery_days: q.delivery_days ?? null,
      valid_till: q.valid_till ?? null,
      notes: q.notes ?? null,

      gst_mode: q.gst_mode ?? null,
      gst_rate: q.gst_rate ?? null,
      subtotal: q.subtotal ?? null,
      gst_amount: q.gst_amount ?? null,
      grand_total: q.grand_total ?? null,

      updated_at: q.updated_at ?? null,
      created_at: q.created_at ?? null,

      is_outdated: based != null ? Number(based) < Number(revisionNo) : false,
    };
  });

  const vendorIds = vendorQuotes.map((v) => v.vendor_id);

  let vendorProfileById: Record<
    string,
    { business_name: string | null; city: string | null; locality: string | null }
  > = {};

  if (vendorIds.length > 0) {
    const { data: vps, error: vpErr } = await supabase
      .from("business_profiles")
      .select("user_id, business_name, city, locality")
      .in("user_id", vendorIds);

    if (!vpErr) {
      for (const vp of vps ?? []) {
        vendorProfileById[String((vp as any).user_id)] = {
          business_name: (vp as any).business_name ?? null,
          city: (vp as any).city ?? null,
          locality: (vp as any).locality ?? null,
        };
      }
    }
  }

  const vendorsWithNames: BuyerQuoteVendor[] = vendorQuotes.map((v) => {
    const p = vendorProfileById[v.vendor_id];
    return {
      ...v,
      vendor_business_name: p?.business_name ?? null,
      vendor_city: p?.city ?? null,
      vendor_locality: p?.locality ?? null,
    };
  });

  const quoteIds = vendorQuotes.map((v) => v.quote_id);

  let quoteItems: BuyerQuoteItem[] = [];
  if (quoteIds.length > 0) {
    const { data: qi, error: qiErr } = await supabase
      .from("rfq_quote_items")
      .select("quote_id, rfq_item_id, qty, unit_price, line_total")
      .in("quote_id", quoteIds);

    if (qiErr) return { error: qiErr.message };
    quoteItems = (qi ?? []) as any;
  }

    const acceptedQuoteId = String((rfq as any)?.meta?.accepted_quote_id ?? "");
  const acceptedVendorId = String((rfq as any)?.meta?.accepted_vendor_id ?? "");

  let selectedVendor: BuyerQuoteVendor | null = null;

  if (acceptedQuoteId || acceptedVendorId) {
    selectedVendor =
      vendorsWithNames.find(
        (v) =>
          (acceptedQuoteId && String(v.quote_id) === acceptedQuoteId) ||
          (acceptedVendorId && String(v.vendor_id) === acceptedVendorId)
      ) ?? null;
  }

  return {
    error: null as string | null,
    rfq,
    revisionNo,
    items: (items ?? []) as BuyerRfqItem[],
    vendors: vendorsWithNames,
    quoteItems,
    selectedVendor,
  };
}