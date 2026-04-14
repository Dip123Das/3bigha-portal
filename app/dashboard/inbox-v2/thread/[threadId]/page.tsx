// app/dashboard/inbox-v2/thread/[threadId]/page.tsx

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type ConversationRow = {
  id: string;
  context_type: string | null;
  investment_deal_room_id?: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
};

export const dynamic = "force-dynamic";

export default async function UnifiedInboxThreadResolverPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const conversationId = decodeURIComponent(String(threadId || "")).trim();

  if (!conversationId) {
    redirect("/dashboard/inbox-v2");
  }

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/inbox-v2/thread/${conversationId}`)}`);
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("id, context_type, investment_deal_room_id, buyer_user_id, vendor_user_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    redirect("/dashboard/inbox-v2");
  }

  const row = data as ConversationRow;
  const userId = String(user.id);
  const isBuyer = String(row.buyer_user_id || "") === userId;
  const isVendor = String(row.vendor_user_id || "") === userId;

  if (row.context_type === "investment_deal_room") {
    const dealRoomId = String(row.investment_deal_room_id || "").trim();
    if (!dealRoomId) {
      redirect("/dashboard/inbox-v2");
    }

    if (isBuyer) {
      redirect(`/dashboard/investor/deal-rooms/${encodeURIComponent(dealRoomId)}`);
    }

    if (isVendor) {
      redirect(`/dashboard/builder/deal-rooms/${encodeURIComponent(dealRoomId)}`);
    }

    redirect("/dashboard/inbox-v2");
  }

  if (
    row.context_type === "listing" ||
    row.context_type === "property_inquiry" ||
    row.context_type === "service_inquiry" ||
    row.context_type === "rental_inquiry"
  ) {
    if (isBuyer) {
      redirect(`/dashboard/buyer/chat/${encodeURIComponent(conversationId)}`);
    }

    if (isVendor) {
      redirect(`/dashboard/vendor/chat/${encodeURIComponent(conversationId)}`);
    }

    redirect("/dashboard/inbox-v2");
  }

  if (row.context_type === "rfq") {
    redirect("/vendor/inbox-v2");
  }

  redirect("/dashboard/inbox-v2");
}