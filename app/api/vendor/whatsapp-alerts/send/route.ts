import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function isWhatsAppEnabled() {
  return process.env.WHATSAPP_AUTO_SEND_ENABLED === "true";
}

function cleanPhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

async function sendWhatsAppTemplate({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  if (!isWhatsAppEnabled()) {
    return {
      skipped: true,
      reason: "WHATSAPP_AUTO_SEND_ENABLED is not true",
    };
  }

  const accessToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";
  const templateName = process.env.WHATSAPP_RANK_ALERT_TEMPLATE || "vendor_rank_alert";
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";

  if (!accessToken || !phoneNumberId) {
    throw new Error("Missing WhatsApp Cloud API env vars");
  }

  const res = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone(to),
        type: "template",
        template: {
          name: templateName,
          language: {
            code: templateLanguage,
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: message.slice(0, 900),
                },
              ],
            },
          ],
        },
      }),
    }
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.error?.message || "WhatsApp send failed");
  }

  return json;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    const body = await req.json();
    const notificationId = String(body?.notificationId || "");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Missing notificationId" },
        { status: 400 }
      );
    }

    const { data: notification, error: notificationErr } = await supabase
      .from("vendor_notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (notificationErr || !notification) {
      return NextResponse.json(
        { error: notificationErr?.message || "Notification not found" },
        { status: 404 }
      );
    }

    const { data: preference } = await supabase
      .from("vendor_whatsapp_preferences")
      .select("whatsapp_phone,auto_whatsapp_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!preference?.auto_whatsapp_enabled || !preference?.whatsapp_phone) {
      await supabase
        .from("vendor_notifications")
        .update({
          whatsapp_status: "skipped",
          whatsapp_error: "Vendor WhatsApp auto-send is not enabled",
        })
        .eq("id", notificationId);

      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Vendor WhatsApp auto-send is not enabled",
      });
    }

    const result = await sendWhatsAppTemplate({
      to: preference.whatsapp_phone,
      message: notification.message,
    });

    await supabase
      .from("vendor_notifications")
      .update({
        whatsapp_to: cleanPhone(preference.whatsapp_phone),
        whatsapp_sent: !result?.skipped,
        whatsapp_status: result?.skipped ? "skipped" : "sent",
        whatsapp_error: result?.skipped ? result.reason : null,
        whatsapp_sent_at: result?.skipped ? null : new Date().toISOString(),
        whatsapp_message_id: result?.messages?.[0]?.id || null,
      })
      .eq("id", notificationId);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to send WhatsApp alert" },
      { status: 500 }
    );
  }
}