// lib/rfq/vendor-inbox/server.ts
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type VendorInboxRow = {
  vendor_user_id?: string | null;

  rfq_id: string;
  rfq_no?: string | null;

  module?: string | null;

  buyer_name?: string | null;
  locality_name?: string | null;
  pincode?: string | null;
  district?: string | null;
  city?: string | null;

  rfq_status?: string | null;
  target_status?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  latest_quote_version?: number | null;
  latest_quote_status?: string | null;
  latest_quote_grand_total?: number | null;
  latest_quote_updated_at?: string | null;

  is_revised?: boolean | null;
  is_unread?: boolean | null;
  is_new?: boolean | null;
  viewed_at?: string | null;

  items_count?: number | null;
  quotes_count?: number | null;
};

// ✅ added "accepted"
export type VendorInboxQuotedFilter = "" | "quoted" | "unquoted" | "revised" | "accepted";

export type VendorInboxSort =
  | "newest"
  | "oldest"
  | "unread"
  | "new"
  | "quote_updated"
  | "value_high"
  | "value_low";

async function requireVendorId() {
  const cookieStore = cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) return { supabase, userId: null as string | null, error: uErr.message };
  const userId = u.user?.id ?? null;
  if (!userId) return { supabase, userId: null, error: "Not logged in." };
  return { supabase, userId, error: null as string | null };
}

export async function fetchVendorInbox(params: {
  q?: string;
  status?: string; // "open" | "closed" | ""
  quoted?: VendorInboxQuotedFilter;
  sort?: VendorInboxSort;
  limit?: number;
  offset?: number;
}) {
  const { supabase, userId, error } = await requireVendorId();
  if (error || !userId) return { rows: [] as VendorInboxRow[], count: 0, error: error ?? "Not logged in." };

  const limit = params.limit ?? 25;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("vendor_inbox_v2")
    .select("*", { count: "exact" })
    .eq("vendor_user_id", userId)
    .range(offset, offset + limit - 1);

  // ✅ Status filter
  if (params.status === "open" || params.status === "closed") {
    query = query.eq("rfq_status", params.status);
  }

  // ✅ Quote/State filter
  const quoted = (params.quoted ?? "").trim() as VendorInboxQuotedFilter;

  if (quoted === "quoted") {
    query = query.not("latest_quote_version", "is", null);
  } else if (quoted === "unquoted") {
    query = query.is("latest_quote_version", null);
  } else if (quoted === "revised") {
    query = query.eq("is_revised", true);
  } else if (quoted === "accepted") {
    // ✅ accepted = target_status accepted (we set this in accept route)
    query = query.eq("target_status", "accepted");
  }

  // ✅ Search
  if (params.q?.trim()) {
    const s = params.q.trim();
    query = query.or(
      [
        `rfq_no.ilike.%${s}%`,
        `buyer_name.ilike.%${s}%`,
        `locality_name.ilike.%${s}%`,
        `pincode.ilike.%${s}%`,
        `city.ilike.%${s}%`,
        `district.ilike.%${s}%`,
        `module.ilike.%${s}%`,
      ].join(",")
    );
  }

  // ✅ Sorting
  const sort = params.sort ?? "newest";

  if (sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "unread") {
    query = query.order("is_unread", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "new") {
    query = query.order("is_new", { ascending: false }).order("created_at", { ascending: false });
  } else if (sort === "quote_updated") {
    query = query
      .order("latest_quote_updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (sort === "value_high") {
    query = query
      .order("latest_quote_grand_total", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (sort === "value_low") {
    query = query
      .order("latest_quote_grand_total", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error: qErr, count } = await query;
  if (qErr) return { rows: [] as VendorInboxRow[], count: 0, error: qErr.message };

  return {
    rows: (data ?? []) as VendorInboxRow[],
    count: count ?? 0,
    error: null as string | null,
  };
}

export async function fetchVendorInboxStats() {
  const { supabase, userId, error } = await requireVendorId();
  if (error || !userId) {
    return {
      total: 0,
      unread: 0,
      quoted: 0,
      pending: 0,
      accepted: 0,
      error: error ?? "Not logged in.",
    };
  }

  // Total
  const totalRes = await supabase
    .from("vendor_inbox_v2")
    .select("rfq_id", { count: "exact", head: true })
    .eq("vendor_user_id", userId);

  // Unread
  const unreadRes = await supabase
    .from("vendor_inbox_v2")
    .select("rfq_id", { count: "exact", head: true })
    .eq("vendor_user_id", userId)
    .eq("is_unread", true);

  // Quoted
  const quotedRes = await supabase
    .from("vendor_inbox_v2")
    .select("rfq_id", { count: "exact", head: true })
    .eq("vendor_user_id", userId)
    .not("latest_quote_version", "is", null);

  // Pending response = Open + not quoted
  const pendingRes = await supabase
    .from("vendor_inbox_v2")
    .select("rfq_id", { count: "exact", head: true })
    .eq("vendor_user_id", userId)
    .eq("rfq_status", "open")
    .is("latest_quote_version", null);

  // ✅ Accepted
  const acceptedRes = await supabase
    .from("vendor_inbox_v2")
    .select("rfq_id", { count: "exact", head: true })
    .eq("vendor_user_id", userId)
    .eq("target_status", "accepted");

  return {
    total: totalRes.count ?? 0,
    unread: unreadRes.count ?? 0,
    quoted: quotedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    accepted: acceptedRes.count ?? 0,
    error: null as string | null,
  };
}