// app/dashboard/thread/[conversationId]/page.tsx

import Link from "next/link";
import BuyerRfqChatBox from "@/app/dashboard/buyer/quote-compare/[rfqId]/chat/buyer-rfq-chat-box";
import VendorRfqChatBox from "@/app/vendor/inbox-v2/[rfqId]/chat/vendor-rfq-chat-box";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import DealScoreClient from "@/app/components/ai/DealScoreClient";
import BuyerConversationChatBox from "@/app/dashboard/buyer/chat/[conversationId]/buyer-conversation-chat-box";
import ConversationContextBanner from "@/components/chat/ConversationContextBanner";
import ProcurementActionSuggestions from "@/components/chat/ProcurementActionSuggestions";
import UniversalWorkflowHeader from "@/components/operational/UniversalWorkflowHeader";
import StickyWorkflowCommandBar from "@/components/operational/StickyWorkflowCommandBar";
import OperationalPageShell from "@/components/operational/OperationalPageShell";
import OperationalWorkspacePanel from "@/components/operational/OperationalWorkspacePanel";
import ContextualAiAssist from "@/components/ai-assist/ContextualAiAssist";
import { resolveNextAction } from "@/lib/workflow/next-action-engine";

import {
  buildBehaviorMemory,
  mergeBehaviorSignals,
} from "@/lib/ai/behavior-memory";

export const dynamic = "force-dynamic";

const operationalNextAction = resolveNextAction("thread");

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
  rfq_id?: string | null;
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

type NegotiationIntelligence = {
  dealScore: number;
  closurePrediction: "High" | "Medium" | "Low";
  urgency: "Critical" | "High" | "Normal";
  stage: string;
  risk: string;
  nextAction: string;
  paymentSignal: string;
  commitmentSignal: string;
  leverage: string;
  autonomousAction: string;
  autonomousReason: string;
  workflowRisk: "High" | "Medium" | "Low";
  supplierSignal: "Strong" | "Moderate" | "Weak";
  milestone: string;
};

type ProcurementTimelineAi = {
  timelineScore?: number;
  slaStatus?: string;
  nextMilestone?: string;
  deliveryPrediction?: string;
  paymentReminder?: string;
  followUpWindow?: string;
  vendorResponseTimer?: string;
  deliveryRisk?: "High" | "Medium" | "Low";
  paymentRisk?: "High" | "Medium" | "Low";
  timelineEvents?: { label: string; status: string }[];
  recommendedTimelineAction?: string;
};

type ProcurementAutoActionAi = {
  actionScore?: number;
  autoActionType?: string;
  priority?: "Critical" | "High" | "Medium" | "Low";
  shouldAutoNotify?: boolean;
  schedulerDecision?: string;
  notificationTitle?: string;
  notificationBody?: string;
  suggestedMessage?: string;
  executionReason?: string;
  workflowTags?: string[];
  nextRunWindow?: string;
};

function getNegotiationIntelligence(args: {
  messages: MessageRow[];
  isClosed: boolean;
  isBuyer: boolean;
  contextType?: string | null;
}) {
  const text = args.messages.map((m) => String(m.body || "")).join(" ").toLowerCase();
  const last = args.messages[args.messages.length - 1] || null;
  const lastAgeHours = last?.created_at
    ? (Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60)
    : 999;

  const hasPrice = /₹|rs\.?|price|rate|total|quote|amount|cost/.test(text);
  const hasDelivery = /delivery|deliver|timeline|days|tomorrow|today|date/.test(text);
  const hasPayment = /payment|advance|upi|cash|bank|gst|invoice/.test(text);
  const hasCommitment = /confirm|final|ok|done|accept|agree|book/.test(text);
  const hasRisk = /delay|later|problem|issue|not possible|unavailable|cancel/.test(text);

  let dealScore = 25;
  if (args.messages.length >= 2) dealScore += 15;
  if (hasPrice) dealScore += 18;
  if (hasDelivery) dealScore += 15;
  if (hasPayment) dealScore += 12;
  if (hasCommitment) dealScore += 20;
  if (hasRisk) dealScore -= 18;
  if (lastAgeHours > 48) dealScore -= 8;
  if (args.isClosed) dealScore = 100;

  dealScore = Math.max(1, Math.min(100, Math.round(dealScore)));

  const workflowRisk: NegotiationIntelligence["workflowRisk"] =
    hasRisk || lastAgeHours > 72 ? "High" : lastAgeHours > 36 ? "Medium" : "Low";

  const supplierSignal: NegotiationIntelligence["supplierSignal"] =
    dealScore >= 75 ? "Strong" : dealScore >= 45 ? "Moderate" : "Weak";

  const autonomousAction =
    args.isClosed
      ? "Archive learning and keep this deal as execution record."
      : hasCommitment
        ? "Confirm final terms and close the procurement milestone."
        : hasPrice && hasDelivery
          ? "Request payment/GST terms and final confirmation."
          : lastAgeHours > 48
            ? "Send follow-up to revive this negotiation."
            : "Continue gathering price, scope, timeline and availability.";

  const autonomousReason =
    workflowRisk === "High"
      ? "Thread has risk/staleness signals that may block deal execution."
      : workflowRisk === "Medium"
        ? "Thread is aging; keeping it warm can protect conversion."
        : "Thread is active enough for normal procurement execution.";

  const milestone =
    args.isClosed
      ? "Closed"
      : hasCommitment
        ? "Final confirmation"
        : hasPrice && hasDelivery
          ? "Terms clarification"
          : hasPrice
            ? "Timeline/payment collection"
            : "Discovery";

  return {
    dealScore,
    closurePrediction: args.isClosed || dealScore >= 75 ? "High" : dealScore >= 45 ? "Medium" : "Low",
    urgency: lastAgeHours > 72 ? "High" : hasCommitment && !args.isClosed ? "Critical" : "Normal",
    stage: args.isClosed
      ? "Deal closed"
      : hasCommitment
        ? "Final confirmation stage"
        : hasPrice && hasDelivery
          ? "Negotiation stage"
          : args.messages.length > 0
            ? "Discovery conversation"
            : "Not started",
    risk: hasRisk
      ? "Risk signal detected. Confirm availability, timeline and terms before closing."
      : lastAgeHours > 72
        ? "Conversation is stale. Follow-up recommended."
        : "No major risk detected from visible messages.",
    nextAction: args.isClosed
      ? "Review closed deal and keep record."
      : hasCommitment
        ? "Confirm final price, delivery/work date, payment terms and close the deal."
        : hasPrice
          ? "Ask for final delivery timeline, GST/invoice and payment terms."
          : "Ask counterpart to confirm price, scope, availability and timeline.",
    paymentSignal: hasPayment
      ? "Payment/GST/invoice terms discussed."
      : "Payment terms not clearly discussed yet.",
    commitmentSignal: hasCommitment
      ? "Commitment words detected in conversation."
      : "No clear commitment detected yet.",
    leverage: args.isBuyer
      ? "Use competing quotes, delivery timeline and hidden charges as negotiation leverage."
      : "Use availability, trust, faster delivery and clear terms as closing leverage.",
    autonomousAction,
    autonomousReason,
    workflowRisk,
    supplierSignal,
    milestone,
  } as NegotiationIntelligence;
}

function workflowRiskClass(level: NegotiationIntelligence["workflowRisk"]) {
  if (level === "High") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function supplierSignalClass(level: NegotiationIntelligence["supplierSignal"]) {
  if (level === "Strong") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (level === "Moderate") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function riskToneClass(level?: string) {
  if (level === "High" || level === "Critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (level === "Medium" || level === "At risk") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function getAppOrigin() {
  const h = await headers();
  const host = h.get("host") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const proto = h.get("x-forwarded-proto") || "https";

  if (String(host).startsWith("http")) return String(host).replace(/\/$/, "");
  return `${proto}://${host}`;
}

async function loadProcurementThreadAi(args: {
  conversationId: string;
  conversation: ConversationRow;
  messages: MessageRow[];
  isBuyer: boolean;
  unreadCount: number;
  negotiationAi: NegotiationIntelligence;
}) {
  const origin = await getAppOrigin();

  const payload = {
    conversationId: args.conversationId,
    module: args.conversation.context_type || "thread",
    contextType: args.conversation.context_type,
    side: args.isBuyer ? "buyer" : "vendor",
    lastActivityAt:
      args.messages[args.messages.length - 1]?.created_at ||
      args.conversation.updated_at ||
      args.conversation.created_at,
    unreadCount: args.unreadCount,
    procurementScore: args.negotiationAi.dealScore,
    timelineScore: args.negotiationAi.dealScore,
    messages: args.messages.map((m) => ({
      role: m.sender_role || "user",
      body: m.body || "",
      created_at: m.created_at,
    })),
  };

  try {
    const [timelineRes, autoActionRes] = await Promise.all([
      fetch(`${origin}/api/ai/procurement-timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      }),
      fetch(`${origin}/api/ai/procurement-auto-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      }),
    ]);

    const [timelineText, autoActionText] = await Promise.all([
      timelineRes.text(),
      autoActionRes.text(),
    ]);

    return {
      timeline: safeJsonParse<ProcurementTimelineAi>(timelineText, {}),
      autoAction: safeJsonParse<ProcurementAutoActionAi>(autoActionText, {}),
    };
  } catch {
    return {
      timeline: {} as ProcurementTimelineAi,
      autoAction: {} as ProcurementAutoActionAi,
    };
  }
}

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
    return isBuyer ? "/dashboard/inbox-v2" : "/vendor/inbox-v2";
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
        "rfq_id",
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
  const counterpartRoleLabel = isBuyer ? "Vendor" : "Buyer";
  const backHref = buildBackHref(conv, isBuyer);
  const isClosed = !!conv.is_closed;
  const lastReadAt = participant?.last_read_at ?? null;
  const isUnifiedLiveChat = isUnifiedLiveChatType(conv.context_type);
  const rfqId =
    String(conv.context_type || "").trim().toLowerCase() === "rfq"
      ? String((conv as any).rfq_id || conv.context_id || "").trim()
      : "";

  const negotiationAi = getNegotiationIntelligence({
    messages,
    isClosed,
    isBuyer,
    contextType: conv.context_type,
  });

  const unreadCount = messages.filter((m) => {
    const senderUserId = String(m.sender_user_id || "").trim();
    const createdAtMs = m.created_at ? new Date(m.created_at).getTime() : 0;
    const lastReadMs = lastReadAt ? new Date(lastReadAt).getTime() : 0;

    return senderUserId && senderUserId !== userId && createdAtMs > lastReadMs;
  }).length;

  const procurementAi = await loadProcurementThreadAi({
    conversationId,
    conversation: conv,
    messages,
    isBuyer,
    unreadCount,
    negotiationAi,
  });

    const threadBehaviorMemory = buildBehaviorMemory(
    messages.map((m) => ({
      module:
        String(conv.context_type || "").trim().toLowerCase() === "rfq"
          ? "rfq"
          : String(conv.context_type || "").trim() || "direct",

      action:
        String(m.sender_user_id || "") === userId
          ? "chat"
          : "view",

      entityId: m.id,
      entityTitle:
        conv.title ||
        counterpartName ||
        "Conversation thread",

      category:
        negotiationAi.stage ||
        titleCase(conv.context_type),

      type:
        m.message_type ||
        "message",

      city: "",
      district: "",
      locality: "",

      createdAt:
        m.created_at || undefined,
    }))
  );

  const threadBehaviorSignals = mergeBehaviorSignals(
    threadBehaviorMemory,
    {
      module:
        String(conv.context_type || "").trim().toLowerCase() === "rfq"
          ? "rfq"
          : String(conv.context_type || "").trim() || "direct",

      category:
        negotiationAi.stage,

      city: "",
    }
  );

  return (
    <OperationalPageShell>
      <div className="mx-auto max-w-5xl space-y-6">
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

      <StickyWorkflowCommandBar
        stage={negotiationAi.stage}
        risk={negotiationAi.workflowRisk}
        nextAction={negotiationAi.nextAction}
        primaryLabel="Reply Now"
        primaryHref="#message-composer"
        secondaryHref={backHref}
        secondaryLabel="Open Inbox"
      />

      <ConversationContextBanner />

      <OperationalWorkspacePanel
        title="Conversation Work Space"
        nextAction={negotiationAi.nextAction}
        status={`Stage: ${negotiationAi.stage} • Risk: ${negotiationAi.workflowRisk}`}
        actions={[
          { label: "Reply Now", href: "#message-composer", tone: "primary" },
          { label: "Open Inbox", href: backHref, tone: "neutral" },
          rfqId
            ? {
                label: "Quote Compare",
                href: `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`,
                tone: "warning",
              }
            : { label: "New RFQ", href: "/rfq/general/new", tone: "success" },
        ]}
      />

      <ProcurementActionSuggestions />

      <UniversalWorkflowHeader
        eyebrow="Deal Workflow"
        title={`You are in: ${conv.title || "Conversation"}`}
        status={`Stage: ${negotiationAi.stage} • Risk: ${negotiationAi.workflowRisk} • Score: ${negotiationAi.dealScore}/100`}
        nextAction={negotiationAi.nextAction}
        steps={[
          { label: "Requirement", done: true },
          { label: "Conversation", done: messages.length > 0 },
          {
            label: "Negotiation",
            active: String(negotiationAi.stage || "").toLowerCase().includes("negotiation"),
          },
          {
            label: "Confirmation",
            active: String(negotiationAi.stage || "").toLowerCase().includes("confirmation"),
          },
          { label: "Delivery" },
          { label: "Complete", done: isClosed },
        ]}
        actions={[
          { label: "Reply Now", href: "#message-composer", primary: true },
          { label: "Open Inbox", href: backHref },
          rfqId
            ? {
                label: "Quote Compare",
                href: `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`,
              }
            : { label: "Back to Inbox", href: "/dashboard/inbox-v2" },
        ]}
      />

      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white shadow-sm">
              {String(counterpartName || "?").trim().charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-950">
                  {counterpartName}
                </h2>

                <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                  ✔ Verified {counterpartRoleLabel}
                </span>

                {isBuyer ? (
                  <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-800">
                    ⭐ Premium visibility ready
                  </span>
                ) : null}

                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                    isClosed
                      ? "border border-slate-200 bg-slate-100 text-slate-600"
                      : "border border-green-200 bg-green-100 text-green-700"
                  }`}
                >
                  {isClosed ? "Closed" : "Open"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-600">
                {titleCase(conv.context_type)} • {conv.title || "Thread"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  🕒 Updated {fmtDateTime(conv.updated_at)}
                </span>

                {counterpartPhone ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                    📞 Phone available
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                    📞 Phone not shared
                  </span>
                )}

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  🔐 Only participants can view this chat
                </span>

                {isBuyer ? (
                  <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-emerald-700">
                    🎯 Matched by 3bigha smart routing
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:min-w-[210px]">
             <div className="font-bold text-slate-900">Deal safety tip</div>
            <div className="mt-1 text-xs leading-5">
              Before closing, confirm final price, delivery/work timeline,
              GST/invoice, payment terms and hidden charges in chat.
            </div>
          </div>
        </div>
      </div>

      <ContextualAiAssist
        title="Conversation guidance"
        description="Helpful guidance for reply, follow-up, payment terms, delivery timeline and deal closure."
      >
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Deal Status
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              What should I do next?
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              {negotiationAi.nextAction}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 shadow-sm">
            Deal Progress {negotiationAi.dealScore}/100
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            ["Closure", negotiationAi.closurePrediction, "✅"],
            ["Urgency", negotiationAi.urgency, "🚨"],
            ["Stage", negotiationAi.stage, "📍"],
            ["Messages", messages.length, "💬"],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {icon} {label}
              </div>
              <div className="mt-2 text-lg font-black text-slate-950">
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="font-black text-emerald-800">🎯 Suggested Next Step</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
              {negotiationAi.nextAction}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="font-black text-amber-800">🤝 Negotiation Leverage</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-amber-900">
              {negotiationAi.leverage}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="font-black text-violet-800">💳 Payment Terms</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-violet-900">
              {negotiationAi.paymentSignal}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="font-black text-rose-800">⚠ Risk & Commitment Signal</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-rose-900">
              {negotiationAi.commitmentSignal} {negotiationAi.risk}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {rfqId ? (
            <Link
              href={`/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}`}
              className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:opacity-90"
            >
              Open Quote Comparison
            </Link>
          ) : null}

          <Link
            href="/dashboard/inbox-v2"
            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            Back to Inbox
          </Link>

          <Link
            href="/rfq/general/new"
            className="inline-flex rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-black text-white transition hover:opacity-90"
          >
            + New Requirement
          </Link>
        </div>
      </div>

            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
              Workflow Follow-up System
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              Follow-up and Deal Movement Support
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              This section helps you decide the next practical action: reply, follow up, confirm terms, move milestone or close the deal.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm">
            Milestone: {negotiationAi.milestone}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              🚦 Workflow Risk
            </div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${workflowRiskClass(
                negotiationAi.workflowRisk
              )}`}
            >
              {negotiationAi.workflowRisk}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              🏆 Supplier Signal
            </div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${supplierSignalClass(
                negotiationAi.supplierSignal
              )}`}
            >
              {negotiationAi.supplierSignal}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              📍 Milestone
            </div>
            <div className="mt-2 text-sm font-black text-slate-950">
              {negotiationAi.milestone}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              🤖 Agent Mode
            </div>
            <div className="mt-2 text-sm font-black text-slate-950">
              {isClosed ? "Record" : "Active execution"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="font-black text-emerald-800">
              🤖 Autonomous Action
            </div>
            <div className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
              {negotiationAi.autonomousAction}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <div className="font-black text-cyan-800">
              🧠 Why This Action
            </div>
            <div className="mt-2 text-sm font-semibold leading-6 text-cyan-900">
              {negotiationAi.autonomousReason}
            </div>
          </div>
        </div>
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div className="font-black text-violet-800">
            🧠 Thread Behavior Memory
          </div>

          <div className="mt-2 text-sm font-semibold leading-6 text-violet-900">
            {threadBehaviorMemory.summary}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-black text-violet-700">
              Memory Score {threadBehaviorMemory.estimatedIntentScore}/100
            </span>

            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Module: {threadBehaviorSignals.module || "Learning"}
            </span>

            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              Stage: {threadBehaviorSignals.category || "Learning"}
            </span>

            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              Messages: {threadBehaviorMemory.totalEvents}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-700">
              AI Procurement Timeline & Auto-Action Engine
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              SLA, Delivery, Payment & Scheduler Intelligence
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              This layer reads the thread and predicts delivery risk, payment reminder need,
              follow-up window, SLA status and the next autonomous procurement action.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-black text-amber-700 shadow-sm">
              Timeline {procurementAi.timeline.timelineScore ?? negotiationAi.dealScore}/100
            </span>

            <span className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm">
              Action {procurementAi.autoAction.actionScore ?? negotiationAi.dealScore}/100
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              📅 SLA Status
            </div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${riskToneClass(
                procurementAi.timeline.slaStatus
              )}`}
            >
              {procurementAi.timeline.slaStatus || "Monitoring"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              🚚 Delivery Risk
            </div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${riskToneClass(
                procurementAi.timeline.deliveryRisk
              )}`}
            >
              {procurementAi.timeline.deliveryRisk || "Medium"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              💳 Payment Risk
            </div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${riskToneClass(
                procurementAi.timeline.paymentRisk
              )}`}
            >
              {procurementAi.timeline.paymentRisk || "Medium"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              🤖 Auto Priority
            </div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${riskToneClass(
                procurementAi.autoAction.priority
              )}`}
            >
              {procurementAi.autoAction.priority || "Low"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="font-black text-blue-800">📍 Next Timeline Milestone</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-blue-900">
              {procurementAi.timeline.nextMilestone || negotiationAi.milestone}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="font-black text-emerald-800">🎯 Recommended Timeline Action</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
              {procurementAi.timeline.recommendedTimelineAction || negotiationAi.nextAction}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="font-black text-violet-800">💳 Payment Reminder AI</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-violet-900">
              {procurementAi.timeline.paymentReminder || negotiationAi.paymentSignal}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="font-black text-rose-800">🚚 Delivery Prediction</div>
            <div className="mt-2 text-sm font-semibold leading-6 text-rose-900">
              {procurementAi.timeline.deliveryPrediction || "Delivery timeline needs confirmation."}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-black text-slate-900">⚙ Scheduler & Auto-Action Decision</div>
          <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            {procurementAi.autoAction.schedulerDecision || "Continue monitoring this procurement thread."}
          </div>

          {procurementAi.autoAction.suggestedMessage ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
              Suggested message: {procurementAi.autoAction.suggestedMessage}
            </div>
          ) : null}
        </div>

        {Array.isArray(procurementAi.timeline.timelineEvents) &&
        procurementAi.timeline.timelineEvents.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-5">
            {procurementAi.timeline.timelineEvents.slice(0, 5).map((event, index) => (
              <div
                key={`${event.label}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Step {index + 1}
                </div>
                <div className="mt-2 text-sm font-black text-slate-900">
                  {event.label}
                </div>
                <div
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${riskToneClass(
                    event.status === "done" ? "Low" : "Medium"
                  )}`}
                >
                  {event.status}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      </ContextualAiAssist>

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
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">
              Conversation Timeline
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              RFQ unified thread is active.
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
            {String(conv.context_type || "").trim().toLowerCase() === "rfq" && rfqId ? (
                    isBuyer ? (
                    <BuyerRfqChatBox
                      rfqId={rfqId}
                      conversationId={conversationId}
                      currentUserId={user.id}
                      vendorName={counterpartName}
                      vendorPhone={counterpartPhone ?? null}
                      initialMessages={messages as any}
                    />
                  ) : (
                    <VendorRfqChatBox
                      rfqId={rfqId}
                      conversationId={conversationId}
                      currentUserId={user.id}
                      buyerName={counterpartName}
                      buyerPhone={counterpartPhone ?? null}
                      initialMessages={messages as any}
                    />
                  )
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Live composer for {titleCase(conv.context_type)} will be connected
                in the next step.
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </OperationalPageShell>
  );
}