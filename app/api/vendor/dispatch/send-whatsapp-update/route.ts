import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanPhone(phone: string | null | undefined) {
  return String(phone || "").replace(/\D/g, "");
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.3bigha.com";
}

function statusText(status: string) {
  const map: Record<string, string> = {
    pending: "Order received",
    assigned: "Vehicle assigned",
    loaded: "Material loaded",
    in_transit: "Vehicle is on the way",
    delivered: "Delivery completed",
    cancelled: "Delivery cancelled",
    failed: "Delivery failed",
  };

  return map[status] || status.replace(/_/g, " ");
}

async function sendWhatsAppMessage(to: string, message: string) {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const source = process.env.GUPSHUP_SOURCE_NUMBER;
  const appName = process.env.GUPSHUP_APP_NAME;

  if (!apiKey || !source || !appName) {
    return {
      ok: false,
      skipped: true,
      reason: "Gupshup WhatsApp environment variables are missing.",
    };
  }

  const body = new URLSearchParams({
    channel: "whatsapp",
    source,
    destination: to,
    "src.name": appName,
    message: JSON.stringify({
      type: "text",
      text: message,
    }),
  });

  const res = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();

  return {
    ok: res.ok,
    status: res.status,
    response: text,
  };
}

export async function POST(req: Request) {
  const supabase = getSupabaseServerClient(cookies());

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return NextResponse.json({ ok: false, error: sessionError.message }, { status: 401 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dispatchId = String(body.dispatchId || "").trim();

  if (!dispatchId) {
    return NextResponse.json({ ok: false, error: "dispatchId is required." }, { status: 400 });
  }

  const { data: dispatch, error } = await supabase
    .from("inventory_dispatches")
    .select("*")
    .eq("id", dispatchId)
    .eq("vendor_user_id", session.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!dispatch) {
    return NextResponse.json({ ok: false, error: "Dispatch not found." }, { status: 404 });
  }

  const buyerPhone = cleanPhone(dispatch.buyer_phone);

  if (!buyerPhone) {
    return NextResponse.json({ ok: false, error: "Buyer phone number not available." }, { status: 400 });
  }

  const { data: vehicle } = dispatch.vehicle_id
    ? await supabase
        .from("vendor_vehicles")
        .select("vehicle_type,vehicle_number,driver_name,driver_phone,load_capacity,current_status")
        .eq("id", dispatch.vehicle_id)
        .maybeSingle()
    : { data: null };

  const trackingLink = `${siteUrl()}/delivery-track/${dispatch.id}`;

  const message = [
    `3Bigha Delivery Update`,
    ``,
    `Material: ${dispatch.material_name || "Material"}`,
    `Quantity: ${dispatch.quantity || 0} ${dispatch.unit || ""}`,
    `Status: ${statusText(dispatch.dispatch_status)}`,
    dispatch.order_reference ? `Reference: ${dispatch.order_reference}` : "",
    vehicle?.vehicle_number ? `Vehicle: ${vehicle.vehicle_number}` : "",
    vehicle?.driver_name ? `Driver: ${vehicle.driver_name}` : "",
    vehicle?.driver_phone ? `Driver Phone: ${vehicle.driver_phone}` : "",
    dispatch.expected_delivery_at
      ? `Expected Delivery: ${new Date(dispatch.expected_delivery_at).toLocaleString("en-IN")}`
      : "",
    ``,
    `Track delivery: ${trackingLink}`,
    ``,
    `- 3Bigha`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendWhatsAppMessage(buyerPhone, message);

  await supabase.from("inventory_dispatches").update({
    buyer_note: `WhatsApp update attempted at ${new Date().toISOString()}`,
    updated_at: new Date().toISOString(),
  }).eq("id", dispatch.id);

  return NextResponse.json({
    ok: true,
    dispatchId: dispatch.id,
    buyerPhone,
    trackingLink,
    whatsapp: result,
  });
}