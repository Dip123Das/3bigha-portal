import { SupabaseClient } from "@supabase/supabase-js";
import { EnsureConversationPayload } from "@/types/conversation";

type EnsureResult = {
  conversationId: string;
  created: boolean;
  chatUrl: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: unknown) {
  return UUID_RE.test(String(v ?? "").trim());
}

function mustUuid(name: string, v: unknown) {
  const s = String(v ?? "").trim();
  if (!isUuid(s)) throw new Error(`Invalid ${name}.`);
  return s;
}

function cleanText(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

async function ensureParticipantRows(
  supabase: SupabaseClient,
  conversationId: string,
  buyerUserId: string,
  vendorUserId: string
) {
  const nowIso = new Date().toISOString();

  const upsertRes = await supabase
    .from("conversation_participants")
    .upsert(
      [
        {
          conversation_id: conversationId,
          user_id: buyerUserId,
          role: "buyer",
          last_read_at: nowIso,
        },
        {
          conversation_id: conversationId,
          user_id: vendorUserId,
          role: "vendor",
          last_read_at: null,
        },
      ],
      { onConflict: "conversation_id,user_id" }
    );

  if (upsertRes.error) {
    throw upsertRes.error;
  }
}

export async function ensureConversation(
  supabase: SupabaseClient,
  payload: EnsureConversationPayload
): Promise<EnsureResult> {
  const {
    contextType,
    contextId,
    buyerUserId,
    vendorUserId,
    title,
    contextSnapshot = {},
    rfqId = null,
    listingId = null,
    propertyId = null,
    serviceId = null,
    rentalId = null,
    starterMessage = null,
  } = payload;

  const cleanContextType = String(contextType ?? "").trim();
  const cleanContextId = mustUuid("contextId", contextId);
  const cleanBuyerUserId = mustUuid("buyerUserId", buyerUserId);
  const cleanVendorUserId = mustUuid("vendorUserId", vendorUserId);

  const cleanRfqId = rfqId ? mustUuid("rfqId", rfqId) : null;
  const cleanListingId = listingId ? mustUuid("listingId", listingId) : null;
  const cleanPropertyId = propertyId ? mustUuid("propertyId", propertyId) : null;
  const cleanServiceId = serviceId ? mustUuid("serviceId", serviceId) : null;
  const cleanRentalId = rentalId ? mustUuid("rentalId", rentalId) : null;

  let query = supabase
    .from("conversations")
    .select("id")
    .eq("context_type", cleanContextType)
    .eq("context_id", cleanContextId)
    .eq("buyer_user_id", cleanBuyerUserId)
    .eq("vendor_user_id", cleanVendorUserId)
    .eq("is_closed", false);

  if (cleanContextType === "rfq" && cleanRfqId) {
    query = query.eq("rfq_id", cleanRfqId);
  }
  if (cleanContextType === "listing" && cleanListingId) {
    query = query.eq("listing_id", cleanListingId);
  }
  if (cleanContextType === "property_inquiry" && cleanPropertyId) {
    query = query.eq("property_id", cleanPropertyId);
  }
  if (cleanContextType === "service_inquiry" && cleanServiceId) {
    query = query.eq("service_id", cleanServiceId);
  }
  if (cleanContextType === "rental_inquiry" && cleanRentalId) {
    query = query.eq("rental_id", cleanRentalId);
  }

  const existing = await query.limit(1).maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    const existingId = mustUuid("conversationId", existing.data.id);

    await ensureParticipantRows(
      supabase,
      existingId,
      cleanBuyerUserId,
      cleanVendorUserId
    );

    return {
      conversationId: existingId,
      created: false,
      chatUrl: `/dashboard/thread/${encodeURIComponent(existingId)}`,
    };
  }

  const insertPayload = {
    context_type: cleanContextType,
    context_id: cleanContextId,
    rfq_id: cleanRfqId,
    listing_id: cleanListingId,
    property_id: cleanPropertyId,
    service_id: cleanServiceId,
    rental_id: cleanRentalId,
    buyer_user_id: cleanBuyerUserId,
    vendor_user_id: cleanVendorUserId,
    created_by_user_id: cleanBuyerUserId,
    title: cleanText(title),
    context_snapshot:
      contextSnapshot && typeof contextSnapshot === "object" ? contextSnapshot : {},
    is_closed: false,
  };

  const inserted = await supabase
    .from("conversations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (inserted.error) throw inserted.error;

  const conversationId = mustUuid("conversationId", inserted.data?.id);

  await ensureParticipantRows(
    supabase,
    conversationId,
    cleanBuyerUserId,
    cleanVendorUserId
  );

  if (cleanText(starterMessage)) {
    const starter = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender_user_id: cleanBuyerUserId,
        sender_role: "buyer",
        message_type: "text",
        body: String(starterMessage).trim(),
        meta: {},
      });

    if (starter.error) throw starter.error;
  }

  return {
    conversationId,
    created: true,
    chatUrl: `/dashboard/thread/${encodeURIComponent(conversationId)}`,
  };
}