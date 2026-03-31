// app/api/vendor/rfqs/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type VendorProfile = {
  user_id: string;
  city?: string | null;
  locality?: string | null;
  district?: string | null;
  pincode?: string | null;
};

const VENDOR_PROFILE_TABLE = "business_profiles";

export async function GET(req: Request) {
  try {
    // 1) Read bearer token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    // 2) Validate token (anon client)
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid session token." }, { status: 401 });
    }
    const userId = userRes.user.id;

    // 3) Service role client
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false },
    });

    // 4) Load vendor profile (kept for meta display)
    const { data: vp, error: vpErr } = await admin
      .from(VENDOR_PROFILE_TABLE)
      .select("user_id, city, locality, district, pincode")
      .eq("user_id", userId)
      .maybeSingle();

    if (vpErr) return NextResponse.json({ error: vpErr.message }, { status: 500 });
    if (!vp?.user_id) return NextResponse.json({ error: "Not a vendor account." }, { status: 403 });

    const vendor = vp as VendorProfile;
    const vCity = String(vendor.city ?? "").trim();
    const vLocality = String(vendor.locality ?? "").trim();
    const vDistrict = String(vendor.district ?? "").trim();
    const vPincode = String(vendor.pincode ?? "").trim();

    // 5) Query params
    const url = new URL(req.url);

    // NOTE: here "status" means rfqs.status (open/closed) because that’s what your UI dropdown uses
    const status = (url.searchParams.get("status") || "").trim();

    const limitRaw = Number(url.searchParams.get("limit") || "100");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;

    // 6) ✅ NEW: fetch via rfq_targets → rfqs (so targeted RFQs always show)
    // We order by rfq_targets.created_at desc (target assignment time).
    // If you later want true “rfqs.created_at” ordering, we can sort in JS.
    let q = admin
      .from("rfq_targets")
      .select(
        `
        rfq_id,
        status,
        created_at,
        rfqs:rfq_id (
          id,
          status,
          created_at,
          contact_name,
          contact_phone,
          contact_email,
          contact_whatsapp,
          city,
          locality,
          pincode
        )
      `
      )
      .eq("vendor_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // If caller passed open/closed, filter rfqs rows in JS after fetch (minimal + reliable)
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 7) Transform to OLD SHAPE expected by your inbox UI
    const rows = (data ?? [])
      .map((r: any) => {
        const rfq = r?.rfqs;
        if (!rfq) return null;

        // Filter rfqs.status (open/closed) if provided
        if (status && String(rfq.status ?? "").trim() !== status) return null;

        return {
          id: String(rfq.id),
          name: rfq.contact_name ?? null,
          phone: rfq.contact_phone ?? null,
          email: rfq.contact_email ?? null,
          whatsapp: rfq.contact_whatsapp ?? null,
          delivery_city: rfq.city
            ? [rfq.locality, rfq.city].filter(Boolean).join(", ")
            : (rfq.locality ?? null),
          delivery_district: null,
          delivery_pincode: rfq.pincode ?? null,
          status: rfq.status ?? "open",
          created_at: rfq.created_at ?? null,

          // Optional: keep some target info (won’t break old UI)
          target_status: r.status ?? null,
          target_created_at: r.created_at ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      rows,
      meta: {
        filtered_by: { city: vCity, locality: vLocality, district: vDistrict, pincode: vPincode },
        source: "rfq_targets",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}