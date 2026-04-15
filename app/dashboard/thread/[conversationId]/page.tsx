// app/dashboard/thread/[conversationId]/page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import BuyerConversationChatBox from "@/app/dashboard/buyer/chat/[conversationId]/buyer-conversation-chat-box";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBadConversationId(v?: string | null) {
  const s = String(v ?? "").trim();
  return (
    !s ||
    s === "id" ||
    s === "[id]" ||
    s === "[conversationId]" ||
    s === "<id>" ||
    !UUID_RE.test(s)
  );
}

type ConversationRow = {
  id: string;
  context_type: string | null;
  context_id: string | null;
  investment_deal_room_id?: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_closed?: boolean | null;
};

type MessageRow = {
  id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  message_type: string | null;
  body: string | null;
  meta?: Record<string, any> | null;
  created_at: string | null;
};

type ParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string | null;
  last_read_at: string | null;
};

type BusinessProfileRow = {
  user_id: string;
  business_name: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  name: string | null;
  phone: string | null;
};

function titleCase(v?: string | null) {
  const s = String(v ?? "").replace(/_/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function fmtBubbleTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function formatDayLabel(v?: string | null) {
  if (!v) return "Unknown date";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function isSameDay(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  try {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  } catch {
    return false;
  }
}

function isUnifiedLiveChatType(contextType?: string | null) {
  const ct = String(contextType || "").trim().toLowerCase();
  return (
    ct === "listing" ||
    ct === "property_inquiry" ||
    ct === "service_inquiry" ||
    ct === "rental_inquiry" ||
    ct === "investment_deal_room"
  );
}

function buildBackHref(conv: ConversationRow, isBuyer: boolean) {
  if (conv.context_type === "investment_deal_room") {
    const dealRoomId = String(conv.investment_deal_room_id || "").trim();
    if (!dealRoomId) return "/dashboard/inbox-v2";
    return isBuyer
      ? `/dashboard/investor/deal-rooms/${encodeURIComponent(dealRoomId)}`
      : `/dashboard/builder/deal-rooms/${encodeURIComponent(dealRoomId)}`;
  }

  if (conv.context_type === "rfq") {
    return "/vendor/inbox-v2";
  }

  return "/dashboard/inbox-v2";
}

export default async function UniversalThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId: rawConversationId } = await params;
  const conversationId = decodeURIComponent(
    String(rawConversationId || "")
  ).trim();

  if (isBadConversationId(conversationId)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-rose-700">
            Invalid thread
          </h1>
          <p className="mt-2 text-sm text-rose-600">
            The conversation id is missing or invalid.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/inbox-v2"
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to Unified Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/thread/${conversationId}`)}`
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .select(
      [
        "id",
        "context_type",
        "context_id",
        "investment_deal_room_id",
        "buyer_user_id",
        "vendor_user_id",
        "title",
        "created_at",
        "updated_at",
        "is_closed",
      ].join(",")
    )
    .eq("id", conversationId)
    .maybeSingle();

  const conv = (data ?? null) as ConversationRow | null;

  if (error || !conv) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-rose-700">
            Thread not found
          </h1>
          <p className="mt-2 text-sm text-rose-600">
            This conversation could not be loaded.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/inbox-v2"
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to Unified Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const userId = String(user.id);
  const isBuyer = String(conv.buyer_user_id || "") === userId;
  const isVendor = String(conv.vendor_user_id || "") === userId;

  if (!isBuyer && !isVendor) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-amber-800">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-amber-700">
            You do not have access to this thread.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/inbox-v2"
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to Unified Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const counterpartUserId = isBuyer
    ? String(conv.vendor_user_id || "")
    : String(conv.buyer_user_id || "");

  const [messagesRes, participantRes, businessRes, profileRes] =
    await Promise.all([
      supabase
        .from("conversation_messages")
        .select("id,sender_user_id,sender_role,message_type,body,meta,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),

      supabase
        .from("conversation_participants")
        .select("conversation_id,user_id,role,last_read_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .maybeSingle(),

      counterpartUserId
        ? supabase
            .from("business_profiles")
            .select("user_id,business_name")
            .eq("user_id", counterpartUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      counterpartUserId
        ? supabase
            .from("profiles")
            .select("id,full_name,name,phone")
            .eq("id", counterpartUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const messages = (messagesRes.data ?? []) as MessageRow[];
  const participant = (participantRes.data ?? null) as ParticipantRow | null;
  const business = (businessRes.data ?? null) as BusinessProfileRow | null;
  const profile = (profileRes.data ?? null) as ProfileRow | null;

  const counterpartName =
    business?.business_name ||
    profile?.full_name ||
    profile?.name ||
    (isBuyer ? "Vendor" : "Buyer");

  const counterpartPhone = profile?.phone ?? null;
  const backHref = buildBackHref(conv, isBuyer);
  const isClosed = !!conv.is_closed;
  const lastReadAt = participant?.last_read_at ?? null;
  const isUnifiedLiveChat = isUnifiedLiveChatType(conv.context_type);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Conversation</h1>
          <p className="text-sm text-slate-600">
            {titleCase(conv.context_type)} • {conv.title || "Thread"}
          </p>
        </div>

        <Link
          href={backHref}
          className="text-sm font-semibold text-slate-600 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-4 space-y-2">
        <div>
          <strong>Conversation ID:</strong> {conv.id}
        </div>
        <div>
          <strong>Context:</strong> {titleCase(conv.context_type)}
        </div>
        <div>
          <strong>Counterpart:</strong> {counterpartName}
        </div>
        <div>
          <strong>Status:</strong> {isClosed ? "Closed" : "Open"}
        </div>
        <div>
          <strong>Updated:</strong> {fmtDateTime(conv.updated_at)}
        </div>
        <div>
          <strong>Your last read:</strong> {fmtDateTime(lastReadAt)}
        </div>
      </div>

      {isUnifiedLiveChat ? (
        <BuyerConversationChatBox
          conversationId={conversationId}
          currentUserId={userId}
          counterpartName={counterpartName}
          counterpartPhone={counterpartPhone}
          contextType={String(conv.context_type ?? "")}
          contextTitle={String(conv.title ?? "")}
          initialMessages={messages.map((m) => ({
            ...m,
            sender_user_id: String(m.sender_user_id || ""),
            sender_role: String(m.sender_role || ""),
            message_type: String(m.message_type || "text"),
            body: String(m.body || ""),
          }))}
          initialUnreadCutoffAt={lastReadAt}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Universal thread entry is active. RFQ live chat will be connected
              next.
            </p>
          </div>

          <div className="max-h-[620px] overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, index) => {
                  const prev = index > 0 ? messages[index - 1] : null;
                  const mine = String(msg.sender_user_id || "") === userId;
                  const showDateDivider =
                    !prev || !isSameDay(prev.created_at, msg.created_at);

                  return (
                    <div key={msg.id}>
                      {showDateDivider ? (
                        <div className="flex justify-center py-2">
                          <div className="rounded-full border bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                            {formatDayLabel(msg.created_at)}
                          </div>
                        </div>
                      ) : null}

                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            mine
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-900"
                          }`}
                        >
                          <div
                            className={`mb-1 text-[11px] font-semibold ${
                              mine ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {mine ? "You" : counterpartName}
                          </div>

                          <div className="whitespace-pre-wrap break-words text-sm leading-6">
                            {msg.body || "—"}
                          </div>

                          <div
                            className={`mt-1.5 text-[11px] ${
                              mine ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            {fmtBubbleTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-5 py-4">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Live composer for {titleCase(conv.context_type)} will be connected
              in the next step.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}