// app/api/rfq/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ensureConversation } from "@/lib/conversations/ensureConversation";
import type { ConversationContextType } from "@/types/conversation";

type AttachmentPayload = {
  bucket: string;
  object_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
};

type ItemPayload = {
  material_name: string;
  qty: number | null;
  unit: string | null;
  notes: string | null;
  sort_order: number;
};

type RfqModule = "materials" | "services" | "rentals" | "properties";

// ✅ DB allows ONLY these item_type values:
type RfqItemType = "material" | "service" | "rental" | "property" | "work_package";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeIndianPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;

  return "";
}

async function sendGupshupWhatsApp({
  to,
  text,
}: {
  to: string;
  text: string;
}) {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const sourcePhone = process.env.GUPSHUP_SOURCE_PHONE;
  const appName = process.env.GUPSHUP_APP_NAME;

  if (!apiKey || !sourcePhone || !appName || !to) {
    return { ok: false, skipped: true, error: "Gupshup env vars or phone missing." };
  }

  const form = new URLSearchParams();
  form.set("channel", "whatsapp");
  form.set("source", sourcePhone);
  form.set("destination", to);
  form.set("src.name", appName);
  form.set("message", JSON.stringify({ type: "text", text }));

  const res = await fetch("https://api.gupshup.io/sm/api/v1/msg", {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { ok: false, skipped: false, error: json?.message || "Gupshup send failed." };
  }

  return { ok: true, skipped: false, data: json };
}

function normalizeModule(x: any): RfqModule | null {
  const m = String(x ?? "").trim().toLowerCase();
  if (m === "materials") return "materials";
  if (m === "services") return "services";
  if (m === "rentals") return "rentals";
  if (m === "properties") return "properties";
  return null;
}

// ✅ map rfqs.module -> rfq_items.item_type (plural -> singular)
function moduleToItemType(module: RfqModule): RfqItemType {
  if (module === "materials") return "material";
  if (module === "services") return "service";
  if (module === "rentals") return "rental";
  return "property";
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return jsonError(
        "Server missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    // ✅ A) SSR cookie-based user detection
    const cookieStore = await cookies();

    const supabaseSsr = createServerClient(url, serviceKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
    } = await supabaseSsr.auth.getUser();

    const isAuthed = !!user?.id;

    // ✅ B) Admin client
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();

    // ✅ module (required)
    const module = normalizeModule(body?.module);
    if (!module) {
      return jsonError(
        "Module is required and must be one of: materials, services, rentals, properties."
      );
    }

    const title = String(body?.title ?? "").trim();
    if (!title) return jsonError("Title is required.");

    const city = String(body?.city ?? "").trim();
    const locality = String(body?.locality ?? "").trim();
    const pincode = String(body?.pincode ?? "").trim();

    if (!city || !locality || !pincode) {
      return jsonError("Location is required: City, Locality, Pincode.");
    }

    const contact_phone = String(body?.contact_phone ?? "").trim();
    const contact_email = String(body?.contact_email ?? "").trim();
    const contact_whatsapp = String(body?.contact_whatsapp ?? "").trim();

    // ✅ Public submission requires phone or email, but logged-in users can submit without it
    if (!isAuthed && !contact_phone && !contact_email) {
      return jsonError("For public submission, phone or email is required.");
    }

    const description = String(body?.description ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const district = String(body?.district ?? "").trim(); // optional
    const contact_name = String(body?.contact_name ?? "").trim();
    const needed_by = body?.needed_by ? String(body.needed_by) : null;

    const items: ItemPayload[] = Array.isArray(body?.items) ? body.items : [];
    const attachments: AttachmentPayload[] = Array.isArray(body?.attachments)
      ? body.attachments
      : [];

    const hasTyped = items.some((x) => String(x.material_name ?? "").trim() !== "");
    // 🚨 FRAUD DETECTION (RFQ LEVEL)
    const suspiciousWords = ["urgent money", "advance payment", "send money", "otp", "bank details"];

    const combinedText = `${title} ${description}`.toLowerCase();

    const isSuspicious = suspiciousWords.some((w) => combinedText.includes(w));

    if (isSuspicious) {
      await supabaseAdmin.from("vendor_notifications").insert({
        user_id: isAuthed ? user!.id : null,
        type: "fraud_flag",
        title: "Suspicious RFQ detected",
        message: "⚠️ Your RFQ content looks suspicious and may be reviewed by admin.",
        is_read: false,
      });
    }
    const hasFiles = attachments.length > 0;
    if (!hasTyped && !hasFiles) {
      return jsonError("Please add at least one typed item OR upload an attachment.");
    }

    // ✅ If authed and contact_email is empty, store user's email if available
    const finalContactEmail = contact_email || (isAuthed ? user?.email || "" : "");
    const finalContactPhone = contact_phone;

    // 1) Create RFQ (v2)
    const { data: rfq, error: rfqErr } = await supabaseAdmin
      .from("rfqs")
      .insert({
        requester_user_id: isAuthed ? user!.id : null,
        module, // ✅ must match rfqs_v2_module_check
        status: "open",
        title,
        description: description || null,
        city,
        district: district || null,
        locality,
        address: address || null,
        pincode,
        needed_by,
        contact_name: contact_name || null,
        contact_phone: finalContactPhone || null,
        contact_email: finalContactEmail ? finalContactEmail : null,
        contact_whatsapp: contact_whatsapp || null,
      })
      .select("id")
      .single();

    if (rfqErr || !rfq?.id) {
      return jsonError(rfqErr?.message || "RFQ insert failed.", 500);
    }

    // 🚀 AI AUTOPILOT (SAFE NON-BLOCKING)
    try {
      const matchUrl = new URL("/api/rfq/vendor-matches", req.url);

      matchUrl.searchParams.set("module", module);
      matchUrl.searchParams.set("item", title);
      matchUrl.searchParams.set("city", city);
      matchUrl.searchParams.set("locality", locality);
      matchUrl.searchParams.set("pincode", pincode);

      const matchRes = await fetch(matchUrl.toString());
      const matchJson = await matchRes.json();

      const vendors = Array.isArray(matchJson?.vendors)
        ? matchJson.vendors.slice(0, 3) // top 3 vendors only
        : [];

      for (const v of vendors) {
        if (!v?.user_id) continue;

        try {
          if (!isAuthed) continue;

          await ensureConversation(supabaseAdmin as any, {
            contextType: "rfq" as ConversationContextType,
            contextId: rfq.id,
            buyerUserId: user!.id,
            vendorUserId: String(v.user_id),
            title: `RFQ: ${title}`,
            starterMessage: `🚀 New Buyer Requirement

            Item: "${title}"
            Location: ${locality}, ${city} (${pincode})

            Please share:
            ✔ Best final price
            ✔ Delivery timeline
            ✔ Availability status

            ⚡ Buyer is actively comparing vendors. Fast response increases chances of deal closure.`,
            rfqId: rfq.id,
          });
        } catch {
          // ignore per-vendor failure
        }
      }
    } catch {
      // autopilot should NEVER break RFQ creation
    }

    const rfqId = String(rfq.id);

    let autoConversationId: string | null = null;
    let autoChatUrl: string | null = null;
    let autoChatVendorUserId: string | null = null;
    let autoChatVendorName: string | null = null;

    // 2) Insert items (rfq_items v2)
    // ✅ item_type must be one of: material/service/rental/property/work_package
    const item_type = moduleToItemType(module);

    const cleanItems = items
      .map((x, idx) => {
        const itemTitle = String(x.material_name ?? "").trim();
        if (!itemTitle) return null;

        return {
          rfq_id: rfqId,

          // ✅ REQUIRED for unique constraint (rfq_id, line_no)
          line_no: idx + 1,

          // ✅ REQUIRED for check constraint
          item_type,

          // ✅ REQUIRED (NOT NULL)
          title: itemTitle,

          // Optional columns
          qty: x.qty ?? null,
          unit: x.unit ?? null,
          uom: x.unit ?? null, // safe if column exists; if not, remove this line
          notes: x.notes ?? null,
          sort_order: Number.isFinite(x.sort_order) ? x.sort_order : idx,

          // Keep for backward compatibility / convenience
          material_name: itemTitle,
        };
      })
      .filter(Boolean) as any[];

    if (cleanItems.length > 0) {
      const { error: itemsErr } = await supabaseAdmin.from("rfq_items").insert(cleanItems);
      if (itemsErr) return jsonError(itemsErr.message || "Items insert failed.", 500);
    }

    // 2.5) ✅ NEW: Create vendor targets (so Vendor Inbox table shows newest RFQs)
    // Strategy:
    // - Match vendors by pincode first
    // - fallback to city/locality (ilike)
    // - Insert rows into rfq_targets (rfq_id, vendor_user_id)
    // NOTE: assumes vendors are stored in business_profiles (as your vendor APIs do)
    try {
      const ors: string[] = [];

      if (pincode) ors.push(`pincode.eq.${pincode}`);
      if (city) ors.push(`city.ilike.%${city}%`);
      if (locality) ors.push(`locality.ilike.%${locality}%`);

      // If we have no location at all, skip targeting (should not happen due to validation)
      if (ors.length > 0) {
        const { data: vendors, error: vErr } = await supabaseAdmin
          .from("business_profiles")
          .select("user_id,phone,boost_priority")
          .not("user_id", "is", null)
          .or(ors.join(","))
          .order("boost_priority", { ascending: false }) // ⭐ BOOST CORE
          .limit(50); // tighter pool = boost more valuable

        if (!vErr && vendors && vendors.length > 0) {
          // ⭐ BOOST SPLIT
          const boosted = (vendors || []).filter((v: any) => (v.boost_priority || 0) > 0);
          const normal = (vendors || []).filter((v: any) => (v.boost_priority || 0) === 0);

          // ⭐ PRIORITY: boosted first
          const sortedVendors = [...boosted, ...normal];

          const targetRows = sortedVendors
            .map((v: any) => ({
              vendor_user_id: String(v.user_id),
              vendor_phone: String(v.phone || "").trim(),
            }))
            // do not target the requester themselves (if logged in)
            .filter((v) => !isAuthed || v.vendor_user_id !== user!.id)
            .map((v) => ({
              rfq_id: rfqId,
              vendor_user_id: v.vendor_user_id,
              vendor_phone: v.vendor_phone,
            }));

          if (targetRows.length > 0) {
            // Use upsert to avoid duplicate target rows if API retried
            const { error: tErr } = await supabaseAdmin
              .from("rfq_targets")
              .upsert(targetRows as any, {
                onConflict: "rfq_id,vendor_user_id",
                ignoreDuplicates: true,
              });

            if (tErr) {
              // Don't fail the RFQ creation if targeting fails (optional).
              // If you want HARD fail, return jsonError(tErr.message, 500);
              console.warn("rfq_targets upsert failed:", tErr.message);
            } else {
              const rfqLink = `https://www.3bigha.com/dashboard/vendor/rfqs/${rfqId}`;

              const whatsappText = encodeURIComponent(
                `📢 New RFQ Received!\n\n${title}\n📍 ${locality}, ${city}\n\n👉 Open: ${rfqLink}`
              );

              const notificationRows = targetRows.map((target: any) => ({
                vendor_user_id: target.vendor_user_id,
                vendor_phone: target.vendor_phone || null,
                rfq_id: rfqId,
                type: "new_rfq",
                title: "New RFQ received",
                message: `${title} enquiry received from ${locality}, ${city}`,
                whatsapp_url: `https://wa.me/?text=${whatsappText}`,
                channel: "in_app",
                status: "pending",
              }));

              const { error: notifyErr } = await supabaseAdmin
                .from("vendor_notifications")
                .insert(notificationRows);

              if (notifyErr) {
                console.warn("vendor_notifications insert failed:", notifyErr.message);
              }

              await Promise.allSettled(
                targetRows.map(async (target: any) => {
                  const to = normalizeIndianPhone(target.vendor_phone || "");

                  if (!to) return;

                  const sendText = `📢 New RFQ Received!

${title}
📍 ${locality}, ${city}

👉 Open: ${rfqLink}`;

                  const result = await sendGupshupWhatsApp({
                    to,
                    text: sendText,
                  });

                  if (!result.ok && !result.skipped) {
                    console.warn(
                      "Gupshup WhatsApp send failed:",
                      result.error
                    );
                  }
                })
              );

              // ✅ AUTO CHAT CONNECT: create unified chat with top matched vendor
              try {
                const firstTarget = targetRows.find(
                  (target: any) =>
                    String(target.vendor_user_id || "").trim() &&
                    (!isAuthed || String(target.vendor_user_id) !== user!.id)
                );

                if (isAuthed && firstTarget?.vendor_user_id) {
                  const itemSummary = cleanItems
                    .map((x) => {
                      const qty = x.qty ? `${x.qty}` : "";
                      const unit = x.unit ? ` ${x.unit}` : "";
                      return `${qty}${unit} ${x.title}`.trim();
                    })
                    .filter(Boolean)
                    .join(", ");

                  const starterMessage = `Hello, I need ${itemSummary || title}${
                    locality || city
                      ? ` in ${[locality, city].filter(Boolean).join(", ")}`
                      : ""
                  }.
Please share your best price and delivery timeline.`;

                  const conversation = await ensureConversation(supabaseAdmin as any, {
                    contextType: "rfq" as ConversationContextType,
                    contextId: rfqId,
                    buyerUserId: user!.id,
                    vendorUserId: String(firstTarget.vendor_user_id),
                    title: `RFQ: ${title}`,
                    contextSnapshot: {
                      rfq_id: rfqId,
                      module,
                      title,
                      city,
                      locality,
                      pincode,
                      source: "rfq_create_auto_connect",
                    },
                    rfqId,
                    starterMessage,
                  });

                  autoConversationId = conversation?.conversationId || null;
                  autoChatUrl =
                    conversation?.chatUrl ||
                    (autoConversationId
                      ? `/dashboard/thread/${autoConversationId}`
                      : null);
                  autoChatVendorUserId = String(firstTarget.vendor_user_id);
                  autoChatVendorName = "matched vendor";
                }
              } catch (chatErr: any) {
                console.warn(
                  "Auto chat connect failed:",
                  chatErr?.message || chatErr
                );
              }
            }
          }
        }
      }
    } catch (e: any) {
      // Keep RFQ created even if targeting fails
      console.warn("rfq_targets targeting error:", e?.message || e);
    }

    // 3) Insert attachments metadata
    if (attachments.length > 0) {
      const rows = attachments.map((a) => ({
        rfq_id: rfqId,
        bucket: a.bucket,
        object_path: a.object_path,
        file_name: a.file_name,
        mime_type: a.mime_type ?? null,
        file_size: a.file_size ?? null,
      }));

      const { error: attErr } = await supabaseAdmin.from("rfq_attachments").insert(rows);
      if (attErr) return jsonError(attErr.message || "Attachments insert failed.", 500);
    }

    return NextResponse.json({
      ok: true,
      rfqId,
      authed: isAuthed,
      requester_user_id: isAuthed ? user!.id : null,
      module,
      item_type,
      auto_chat_created: Boolean(autoConversationId),
      autoConversationId,
      autoChatUrl,
      autoChatVendorUserId,
      autoChatVendorName,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Unknown server error", 500);
  }
}