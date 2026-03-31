// app/api/vendor/rfqs/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const VENDOR_PROFILE_TABLE = "business_profiles";

// Old + new tables
const OLD_TABLE = "material_rfqs";
const NEW_TABLE = "rfqs";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const rfqId = String(ctx?.params?.id || "").trim();
    if (!rfqId) return NextResponse.json({ error: "Missing RFQ id." }, { status: 400 });

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!token) return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });

    // Validate token
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false },
    });
    const { data: userRes, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Invalid session token." }, { status: 401 });
    }
    const userId = userRes.user.id;

    // Service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false },
    });

    // Ensure vendor exists
    const { data: vp, error: vpErr } = await admin
      .from(VENDOR_PROFILE_TABLE)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (vpErr) return NextResponse.json({ error: vpErr.message }, { status: 500 });
    if (!vp?.user_id) return NextResponse.json({ error: "Not a vendor account." }, { status: 403 });

    // ------------------------------------------------------------
    // 1) Try OLD table first (material_rfqs) — keeps your current flow stable
    // ------------------------------------------------------------
    const oldRes = await admin
      .from(OLD_TABLE)
      .select("id,name,phone,whatsapp,email,delivery_city,delivery_district,delivery_pincode,status,created_at")
      .eq("id", rfqId)
      .maybeSingle();

    if (!oldRes.error && oldRes.data) {
      return NextResponse.json({ row: oldRes.data });
    }
    if (oldRes.error) {
      // If table/column issues, surface real error
      return NextResponse.json({ error: oldRes.error.message }, { status: 500 });
    }

    // ------------------------------------------------------------
    // 2) Fallback to NEW table (rfqs) — supports your newer RFQ form also
    // ------------------------------------------------------------
    const newRes = await admin
      .from(NEW_TABLE)
      .select("id,status,created_at,contact_name,contact_phone,contact_email,contact_whatsapp,city,locality,pincode")
      .eq("id", rfqId)
      .maybeSingle();

    if (newRes.error) return NextResponse.json({ error: newRes.error.message }, { status: 500 });
    if (!newRes.data) return NextResponse.json({ error: "RFQ not found." }, { status: 404 });

    // Map NEW -> OLD shape expected by your vendor UI
    const d: any = newRes.data;
    const row = {
      id: String(d.id),
      name: d.contact_name ?? null,
      phone: d.contact_phone ?? null,
      whatsapp: d.contact_whatsapp ?? null,
      email: d.contact_email ?? null,
      delivery_city: [d.locality, d.city].filter(Boolean).join(", ") || null,
      delivery_district: null,
      delivery_pincode: d.pincode ?? null,
      status: d.status ?? "open",
      created_at: d.created_at ?? null,
    };

    return NextResponse.json({ row });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}