import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureConversation } from "@/lib/conversations/ensureConversation";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: unknown) {
  return UUID_RE.test(String(v ?? "").trim());
}

function cleanText(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function subjectTypeFromModule(module: string) {
  const m = String(module ?? "").trim().toLowerCase();
  if (m === "property") return "property";
  if (m === "material" || m === "materials") return "material";
  if (m === "service" || m === "services") return "service";
  if (m === "rental" || m === "rentals") return "rental";
  return "other";
}

function contextTypeFromModule(module: string) {
  const m = String(module ?? "").trim().toLowerCase();
  if (m === "property") return "property_inquiry";
  if (m === "service" || m === "services") return "service_inquiry";
  if (m === "rental" || m === "rentals") return "rental_inquiry";
  return "listing";
}

function listingIdFieldFromModule(module: string, refId: string) {
  const m = String(module ?? "").trim().toLowerCase();
  if (m === "property") return { propertyId: refId };
  if (m === "service" || m === "services") return { serviceId: refId };
  if (m === "rental" || m === "rentals") return { rentalId: refId };
  return { listingId: refId };
}

async function tryInsertEnquiry(
  supabase: any,
  payload: {
    buyerUserId: string;
    vendorUserId: string;
    subjectType: string;
    subjectId: string;
    title: string | null;
    message: string;
    buyerName: string | null;
    buyerPhone: string | null;
    buyerEmail: string | null;
  }
) {
  const {
    buyerUserId,
    vendorUserId,
    subjectType,
    subjectId,
    title,
    message,
    buyerName,
    buyerPhone,
    buyerEmail,
  } = payload;

  const tryEnquiries = await supabase
    .from("enquiries")
    .insert({
      buyer_user_id: buyerUserId,
      vendor_user_id: vendorUserId,
      subject_type: subjectType,
      subject_id: subjectId,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      message,
      status: "new",
    })
    .select("id")
    .single();

  if (!tryEnquiries.error && tryEnquiries.data?.id) {
    return {
      enquiryId: String(tryEnquiries.data.id),
      tableUsed: "enquiries" as const,
    };
  }

  const tryInquiries = await supabase
    .from("inquiries")
    .insert({
      buyer_user_id: buyerUserId,
      vendor_user_id: vendorUserId,
      subject_type: subjectType,
      subject_id: subjectId,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      status: "new",
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (!tryInquiries.error && tryInquiries.data?.id) {
    const enquiryId = String(tryInquiries.data.id);

    await supabase.from("inquiry_messages").insert({
      enquiry_id: enquiryId,
      sender_user_id: buyerUserId,
      sender_role: "buyer",
      body: message,
      created_at: new Date().toISOString(),
    });

    return {
      enquiryId,
      tableUsed: "inquiries" as const,
    };
  }

  return {
    enquiryId: null,
    tableUsed: null as null,
    insertErrors: {
      enquiries: tryEnquiries.error?.message ?? null,
      inquiries: tryInquiries.error?.message ?? null,
    },
  };
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // user auth/session check with normal server client
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();

    const module = String(body?.module ?? "").trim().toLowerCase();
    const refId = String(body?.refId ?? "").trim();
    const vendorUserId = String(body?.vendorUserId ?? "").trim();
    const title = cleanText(body?.title);
    const priceText = cleanText(body?.priceText);
    const message = String(body?.message ?? "").trim();

    if (!module || !refId || !vendorUserId || !message) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!isUuid(refId)) {
      return NextResponse.json({ error: "Invalid reference id." }, { status: 400 });
    }

    if (!isUuid(vendorUserId)) {
      return NextResponse.json({ error: "Invalid vendor user id." }, { status: 400 });
    }

    if (user.id === vendorUserId) {
      return NextResponse.json(
        { error: "Buyer and vendor cannot be the same user." },
        { status: 400 }
      );
    }

    let buyerName: string | null = null;
    let buyerPhone: string | null = null;

    const prof = await supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof.error && prof.data) {
      buyerName = cleanText((prof.data as any).full_name);
      buyerPhone = cleanText((prof.data as any).phone);
    }

    const subjectType = subjectTypeFromModule(module);

    // use admin client for writes that may involve multiple-user rows
    const supabaseAdmin = getSupabaseAdmin();

    const enquiryResult = await tryInsertEnquiry(supabaseAdmin, {
      buyerUserId: user.id,
      vendorUserId,
      subjectType,
      subjectId: refId,
      title,
      message,
      buyerName,
      buyerPhone,
      buyerEmail: user.email ?? null,
    });

    const contextType = contextTypeFromModule(module);

    const conversation = await ensureConversation(supabaseAdmin, {
      contextType,
      contextId: refId,
      buyerUserId: user.id,
      vendorUserId,
      title: title ?? `${subjectType} enquiry`,
      contextSnapshot: {
        module,
        title,
        priceText,
        refId,
        enquiryId: enquiryResult.enquiryId ?? null,
        enquiryTable: enquiryResult.tableUsed ?? null,
      },
      starterMessage: message,
      ...listingIdFieldFromModule(module, refId),
    } as any);

    return NextResponse.json({
      ok: true,
      enquiryId: enquiryResult.enquiryId ?? null,
      enquiryTable: enquiryResult.tableUsed ?? null,
      enquiryInsertErrors: (enquiryResult as any).insertErrors ?? null,
      conversationId: conversation.conversationId,
      created: conversation.created,
      chatUrl: conversation.chatUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create enquiry and chat." },
      { status: 500 }
    );
  }
}