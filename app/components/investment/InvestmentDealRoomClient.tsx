"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  fmtDateTime,
  fmtBubbleTime,
  fmtShortSeen,
  sortMessagesByCreatedAt,
  upsertUniqueMessage,
  replaceMessageById,
  type MsgRow,
} from "@/lib/conversations/chat-client-shared";

type ViewerRole = "investor" | "builder";

type DealRoomRow = Record<string, any>;
type DocumentRow = Record<string, any>;

type ApiEnvelope<T> = {
  ok?: boolean;
  message?: string;
  error?: string;
  data?: T;
};

function normalizeOne<T>(json: any): T | null {
  if (!json) return null;
  if (json.data) return json.data as T;
  return json as T;
}

function normalizeList<T>(json: any): T[] {
  if (!json) return [];
  if (Array.isArray(json?.data)) return json.data as T[];
  if (Array.isArray(json)) return json as T[];
  return [];
}

function fmtBytes(value: unknown) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "—";

  const units = ["B", "KB", "MB", "GB"];
  let size = num;
  let i = 0;

  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }

  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function getRoomTitle(room: DealRoomRow | null) {
  if (!room) return "Investment Deal Room";
  return (
    room.title ||
    room.opportunity_title ||
    room.opportunity_snapshot?.opportunity_title ||
    room.opportunity_snapshot?.title ||
    "Investment Deal Room"
  );
}

function getRoomSubtitle(room: DealRoomRow | null) {
  if (!room) return "—";
  return (
    room.opportunity_snapshot?.sector ||
    room.opportunity_snapshot?.location ||
    room.location ||
    room.city ||
    room.state ||
    room.opportunity_slug ||
    room.opportunity_title ||
    "—"
  );
}

function getBuilderLabel(room: DealRoomRow | null) {
  if (!room) return "Builder";
  return (
    room.builder_name ||
    room.promoter_name ||
    room.owner_name ||
    room.company_name ||
    room.business_name ||
    room.builder_email ||
    room.promoter_email ||
    room.builder_user_id ||
    "Builder"
  );
}

function getInvestorLabel(room: DealRoomRow | null) {
  if (!room) return "Investor";
  return (
    room.investor_name ||
    room.buyer_name ||
    room.investor_email ||
    room.investor_user_id ||
    "Investor"
  );
}

function getStatus(room: DealRoomRow | null) {
  return String(room?.status || "active");
}

function getStatusLabel(status: string) {
  const s = String(status || "").toLowerCase();

  if (["open", "active", "in_progress"].includes(s)) return "Active";
  if (s === "pending") return "Pending";
  if (["closed", "completed"].includes(s)) return "Closed";
  if (["cancelled", "rejected", "dropped"].includes(s)) return "Dropped";

  return status || "—";
}

function statusClasses(status: string) {
  switch (String(status).toLowerCase()) {
    case "open":
    case "active":
    case "in_progress":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "closed":
    case "completed":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "cancelled":
    case "rejected":
    case "dropped":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function getDocumentTitle(doc: DocumentRow) {
  return doc.title || doc.file_name || "Document";
}

function isSystemMessage(msg: MsgRow) {
  return String(msg.sender_role || "").toLowerCase() === "system";
}

function getMessageText(msg: MsgRow) {
  return String(msg.body || "");
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

function formatDayLabel(v?: string | null) {
  if (!v) return "Unknown date";
  try {
    const d = new Date(v);
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffMs = today.getTime() - thatDay.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "Unknown date";
  }
}

function isGroupedWithPrevious(prev?: MsgRow | null, curr?: MsgRow | null) {
  if (!prev || !curr) return false;
  if (!isSameDay(prev.created_at, curr.created_at)) return false;
  if (isSystemMessage(prev) || isSystemMessage(curr)) return false;
  if (prev.message_type === "system" || curr.message_type === "system") return false;

  return String(prev.sender_user_id ?? "") === String(curr.sender_user_id ?? "");
}

function getDateDividerLabel(v?: string | null) {
  return formatDayLabel(v);
}

function getCounterpartUserId(room: DealRoomRow | null, viewerRole: ViewerRole) {
  if (!room) return "";
  return viewerRole === "builder"
    ? String(room.investor_user_id || "")
    : String(room.builder_user_id || "");
}

function getMyLastReadAt(room: DealRoomRow | null, viewerRole: ViewerRole) {
  if (!room) return null;
  return viewerRole === "builder"
    ? (room.builder_last_read_at ?? null)
    : (room.investor_last_read_at ?? null);
}

function getCounterpartLastReadAt(room: DealRoomRow | null, viewerRole: ViewerRole) {
  if (!room) return null;
  return viewerRole === "builder"
    ? (room.investor_last_read_at ?? null)
    : (room.builder_last_read_at ?? null);
}

function isMessageSeenByCounterpart(
  msg: MsgRow | null,
  counterpartLastReadAt?: string | null
) {
  if (!msg?.created_at || !counterpartLastReadAt) return false;

  try {
    const msgTime = new Date(msg.created_at).getTime();
    const readTime = new Date(counterpartLastReadAt).getTime();

    return readTime >= msgTime;
  } catch {
    return false;
  }
}

function getMessageDeliveryLabel(args: {
  mine: boolean;
  msg: MsgRow | null;
  counterpartOnline: boolean;
  counterpartLastSeenAt?: string | null;
  counterpartLastReadAt?: string | null;
}) {
  const {
    mine,
    msg,
    counterpartOnline,
    counterpartLastSeenAt,
    counterpartLastReadAt,
  } = args;

  if (!mine || !msg?.created_at) return null;

  if (isMessageSeenByCounterpart(msg, counterpartLastReadAt)) {
    return {
      text: "Seen",
      className: "text-emerald-400",
    };
  }

  let delivered = false;

  try {
    const msgTime = new Date(msg.created_at).getTime();

    delivered =
      counterpartOnline ||
      (!!counterpartLastSeenAt &&
        new Date(counterpartLastSeenAt).getTime() >= msgTime);
  } catch {
    delivered = counterpartOnline;
  }

  if (delivered) {
    return {
      text: "Delivered",
      className: "text-blue-400",
    };
  }

  return {
    text: "Sent",
    className: "text-slate-400",
  };
}

function stopTitleFlash(
  timerRef: React.MutableRefObject<number | null>,
  lastTitleRef: React.MutableRefObject<string>
) {
  if (timerRef.current) {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  if (typeof document !== "undefined" && lastTitleRef.current) {
    document.title = lastTitleRef.current;
  }
}

function startTitleFlash(
  timerRef: React.MutableRefObject<number | null>,
  lastTitleRef: React.MutableRefObject<string>,
  title: string
) {
  if (typeof document === "undefined") return;
  if (timerRef.current) return;

  lastTitleRef.current = document.title;

  let on = false;
  timerRef.current = window.setInterval(() => {
    on = !on;
    document.title = on ? title : lastTitleRef.current;
  }, 1000);
}

const INVESTMENT_QUICK_REPLIES: Record<ViewerRole, string[]> = {
  investor: [
    // Interest & entry
    "I am interested in this opportunity. Please share the deal structure.",
    "What is the minimum and ideal investment ticket size?",
    "What is the expected IRR and holding period?",

    // Financials
    "Please share projected cash flow, ROI, and break-even timeline.",
    "Can you share past performance or similar completed projects?",
    "What are the major cost components and margins in this project?",

    // Risk & security
    "What security or collateral is provided for this investment?",
    "How is investor capital protected in downside scenarios?",
    "What are the key risks involved and mitigation strategies?",

    // Legal & structure
    "Under what legal structure is this investment offered (JV/SPV/partnership)?",
    "What agreements/documents will be executed before investment?",
    "Is NDA required before sharing detailed documents?",

    // Exit
    "What is the exit strategy and expected timeline?",
    "How will profit distribution be handled?",
    "Is early exit possible for investors?",

    // Process
    "What are the next steps to proceed with due diligence?",
    "Can we schedule a call to discuss this opportunity in detail?",
  ],

  builder: [
    // Response & onboarding
    "Thank you for your interest. I will share the project overview shortly.",
    "Let me walk you through the deal structure and expected returns.",

    // Financial sharing
    "I will share financial projections, ROI, and timelines shortly.",
    "We have completed similar projects—happy to share past performance data.",

    // Risk handling
    "The investment is structured with defined safeguards and exit clarity.",
    "I will explain risk factors and mitigation strategies in detail.",

    // Legal clarity
    "We typically proceed via SPV/JV structure with proper agreements.",
    "NDA can be executed before sharing detailed financial documents.",

    // Exit clarity
    "Exit is planned via sale/realisation at defined milestones.",
    "Profit distribution is structured based on agreed ratios.",

    // Engagement
    "Please share your preferred ticket size and investment horizon.",
    "We can schedule a call to discuss details and next steps.",
    "I can share all documents required for your due diligence process.",
  ],
};

const INVESTMENT_STARTER_REPLIES: Record<ViewerRole, string[]> = {
  investor: [
    "Hi, I am interested in this opportunity.",
    "Can you give me a brief overview of the project?",
    "What is the expected return and duration?",
    "How can I proceed further?",
  ],
  builder: [
    "Thank you for your interest. Let me explain the opportunity.",
    "I can give you a quick overview of the project.",
    "We can discuss the investment structure and returns.",
    "Please let me know your investment interest and budget.",
  ],
};

const CHAT_EMOJIS = ["👍", "👌", "🙏", "😊", "📄", "📞", "✅", "❓", "💰", "📊"];

function shortMessagePreview(value: string, max = 80) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

function splitQuotedMessage(value: string) {
  const raw = String(value || "");

  const match = raw.match(/^↪ Replying to:\s*(.+?)\n\n([\s\S]*)$/);
  if (!match) {
    return {
      quoted: null as string | null,
      body: raw,
    };
  }

  const quotedRaw = String(match[1] || "").trim();
  const bodyRaw = String(match[2] || "").trim();

  const cleanedQuoted = quotedRaw.replace(/^↪ Replying to:\s*/i, "").trim();

  return {
    quoted: cleanedQuoted || null,
    body: bodyRaw || "",
  };
}

function getQuotedPreviewFromMessage(msg: MsgRow) {
  return splitQuotedMessage(getMessageText(msg)).quoted;
}

function getDisplayMessageBody(msg: MsgRow) {
  return splitQuotedMessage(getMessageText(msg)).body;
}

function isEmojiOnlyMessage(value: string) {
  const text = String(value || "").trim();
  if (!text) return false;

  const withoutSpaces = text.replace(/\s+/g, "");
  return /^[\p{Emoji}\uFE0F]+$/u.test(withoutSpaces);
}

function getStageSuggestion(intent: string | null) {
  if (!intent) return null;

  if (intent === "returns") {
    return {
      label: "Move to Financial Discussion",
      stage: "financial_discussion",
    };
  }

  if (intent === "documents") {
    return {
      label: "Move to Due Diligence",
      stage: "due_diligence",
    };
  }

  if (intent === "risk") {
    return {
      label: "Move to Risk Review",
      stage: "risk_review",
    };
  }

  if (intent === "meeting") {
    return {
      label: "Move to Call / Discussion",
      stage: "discussion",
    };
  }

  if (intent === "general") {
    return {
      label: "Move to Discussion",
      stage: "discussion",
    };
  }

  return null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isNearBottom(el: HTMLDivElement | null, threshold = 120) {
  if (!el) return true;
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distanceFromBottom <= threshold;
}

function pickSmartReplies(viewerRole: ViewerRole, latestMessage: MsgRow | null) {
  if (!latestMessage) {
    return {
      confidence: "starter" as const,
      topic: "start" as const,
      replies: INVESTMENT_QUICK_REPLIES[viewerRole].slice(0, 6),
    };
  }

  const text = normalizeText(latestMessage.body);

  if (viewerRole === "investor") {
    if (
      text.includes("return") ||
      text.includes("irr") ||
      text.includes("roi") ||
      text.includes("profit")
    ) {
      return {
        confidence: "high" as const,
        topic: "returns" as const,
        replies: [
          "Please share the projected IRR, ROI, and profit-sharing ratio.",
          "What assumptions are used in these return projections?",
          "Please share the expected holding period and exit timeline.",
          "How frequently will investor updates and financial reports be shared?",
        ],
      };
    }

    if (
      text.includes("document") ||
      text.includes("agreement") ||
      text.includes("nda") ||
      text.includes("legal")
    ) {
      return {
        confidence: "high" as const,
        topic: "documents" as const,
        replies: [
          "Please share the draft agreements and legal structure details.",
          "Is NDA mandatory before accessing all documents?",
          "What documents are required from my side to proceed?",
          "Please confirm the compliance and title verification process.",
        ],
      };
    }

    if (
      text.includes("security") ||
      text.includes("collateral") ||
      text.includes("risk") ||
      text.includes("protect")
    ) {
      return {
        confidence: "high" as const,
        topic: "risk" as const,
        replies: [
          "How is investor capital protected in downside scenarios?",
          "What security or collateral backs this investment?",
          "Please explain the main risks and mitigation strategy.",
          "What happens if the exit is delayed beyond the projected timeline?",
        ],
      };
    }

    if (
      text.includes("call") ||
      text.includes("meeting") ||
      text.includes("discuss")
    ) {
      return {
        confidence: "high" as const,
        topic: "meeting" as const,
        replies: [
          "Yes, I am available for a discussion. Please suggest a suitable time.",
          "Please share the main discussion points before the call.",
          "Can we also review the financial model during the meeting?",
          "Please confirm the next steps after the discussion.",
        ],
      };
    }

    return {
      confidence: "medium" as const,
      topic: "general" as const,
      replies: [
        "Please share the next steps for due diligence.",
        "Kindly share the project financials and timeline.",
        "What is the minimum and ideal investment ticket size?",
        "Can you explain the security, exit, and profit-sharing model?",
      ],
    };
  }

  if (
    text.includes("return") ||
    text.includes("irr") ||
    text.includes("roi") ||
    text.includes("profit")
  ) {
    return {
      confidence: "high" as const,
      topic: "returns" as const,
      replies: [
        "I will share the projected returns, assumptions, and holding period.",
        "The profit-sharing model can be structured clearly in the term sheet.",
        "I can also share the expected exit path and timeline.",
        "Let me provide the financial model for your review.",
      ],
    };
  }

  if (
    text.includes("document") ||
    text.includes("agreement") ||
    text.includes("nda") ||
    text.includes("legal")
  ) {
    return {
      confidence: "high" as const,
      topic: "documents" as const,
      replies: [
        "I will share the required documents and agreement flow shortly.",
        "NDA can be completed before detailed file access is granted.",
        "We usually proceed with proper legal documentation at each step.",
        "I can outline the documentation checklist for due diligence.",
      ],
    };
  }

  if (
    text.includes("security") ||
    text.includes("collateral") ||
    text.includes("risk") ||
    text.includes("protect")
  ) {
    return {
      confidence: "high" as const,
      topic: "risk" as const,
      replies: [
        "I will explain the safeguards, security structure, and risk controls.",
        "Let me clarify how investor capital is protected in this model.",
        "I can share the main project risks and mitigation plan.",
        "We can review downside protection and exit contingencies in detail.",
      ],
    };
  }

  if (
    text.includes("call") ||
    text.includes("meeting") ||
    text.includes("discuss")
  ) {
    return {
      confidence: "high" as const,
      topic: "meeting" as const,
      replies: [
        "We can schedule a call to discuss the opportunity in detail.",
        "Please share your preferred time slot for the discussion.",
        "I will prepare the main financial and legal points for the call.",
        "After the call, I can share the relevant documents for review.",
      ],
    };
  }

  return {
    confidence: "medium" as const,
    topic: "general" as const,
    replies: [
      "Thank you for your interest. I will share the project overview shortly.",
      "I can walk you through the deal structure and expected returns.",
      "Please share your expected ticket size and investment horizon.",
      "We can proceed step by step with due diligence and documentation.",
    ],
  };
}

function MetricCard({
  label,
  children,
  subtext,
}: {
  label: string;
  children: React.ReactNode;
  subtext?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-3">{children}</div>
      {subtext ? <div className="mt-1 text-xs text-slate-500">{subtext}</div> : null}
    </div>
  );
}

export default function InvestmentDealRoomClient({
  roomId,
  viewerRole,
}: {
  roomId: string;
  viewerRole: ViewerRole;
}) {
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingNda, setSavingNda] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [acceptingNda, setAcceptingNda] = useState(false);

  const [roomError, setRoomError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [success, setSuccess] = useState("");

  const [room, setRoom] = useState<DealRoomRow | null>(null);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [text, setText] = useState("");
  const [lastReplyIntent, setLastReplyIntent] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [stickyDate, setStickyDate] = useState("");
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [didAutoScrollToUnread, setDidAutoScrollToUnread] = useState(false);
  const [counterpartLastSeenAt, setCounterpartLastSeenAt] = useState<string | null>(null);
  const [counterpartLastReadAt, setCounterpartLastReadAt] = useState<string | null>(null);
  const [myLastReadAt, setMyLastReadAt] = useState<string | null>(null);
  const [counterpartOnline, setCounterpartOnline] = useState(false);
  const [recentCounterpartActivityAt, setRecentCounterpartActivityAt] = useState<string | null>(null);
  const [presenceTick, setPresenceTick] = useState(0);
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [_quotedMessageId, setQuotedMessageId] = useState<string | null>(null);
  const [quotedMessageText, setQuotedMessageText] = useState("");
  const [activeActionMessageId, setActiveActionMessageId] = useState<string | null>(null);
  const [_touchActionMessageId, setTouchActionMessageId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docKind, setDocKind] = useState("general");
  const [docNote, setDocNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const unreadDividerRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const isComposingRef = useRef(false);
  const messageToneEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const toneGainRef = useRef<GainNode | null>(null);
  const lastTitleRef = useRef("");
  const titleFlashTimerRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<any>(null);
  const tabIdRef = useRef(
    `deal-room-tab-${Math.random().toString(36).slice(2)}-${Date.now()}`
  );

  const roomHref =
    viewerRole === "builder"
      ? "/dashboard/builder/deal-rooms"
      : "/dashboard/investor/deal-rooms";

  const unifiedInboxHref = room?.conversation_id
    ? `/dashboard/inbox-v2?conversationId=${encodeURIComponent(
        String(room.conversation_id)
      )}`
    : "/dashboard/inbox-v2";

  const currentUserId =
    viewerRole === "builder"
      ? String(room?.builder_user_id || "")
      : String(room?.investor_user_id || "");

  const counterpartUserId =
    viewerRole === "builder"
      ? String(room?.investor_user_id || "")
      : String(room?.builder_user_id || "");

  async function ensureMessageToneReady() {
    try {
      const AudioContextCtor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return false;

      if (!audioContextRef.current) {
        const ctx: AudioContext = new AudioContextCtor();
        const gain = ctx.createGain();
        gain.gain.value = 0.18;
        gain.connect(ctx.destination);

        audioContextRef.current = ctx;
        toneGainRef.current = gain;
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      return audioContextRef.current.state === "running";
    } catch {
      return false;
    }
  }

  function playMessageTone() {
    try {
      const ctx = audioContextRef.current;
      const gain = toneGainRef.current;
      if (!ctx || !gain || ctx.state !== "running") return;

      const now = ctx.currentTime;

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = "triangle";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(1040, now);
      osc2.frequency.setValueAtTime(760, now + 0.11);

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start(now);
      osc1.stop(now + 0.12);

      osc2.start(now + 0.11);
      osc2.stop(now + 0.30);
    } catch {
      // ignore tone errors
    }
  }

  async function loadRoom(options?: { silent?: boolean }) {
    const silent = Boolean(options?.silent);

    if (!silent) {
      setLoadingRoom(true);
    }

    setRoomError("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}`,
        { method: "GET", cache: "no-store" }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DealRoomRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load deal room.");
      }

      const data = normalizeOne<DealRoomRow>(json);
      if (!data) throw new Error("Deal room not found.");

      setRoom(data);
    } catch (e: any) {
      setRoomError(e?.message || "Failed to load deal room.");
    } finally {
      if (!silent) {
        setLoadingRoom(false);
      }
    }
  }

  async function loadMessages(options?: { silent?: boolean }) {
    const silent = Boolean(options?.silent);

    if (!silent) {
      setLoadingMessages(true);
    }

    setMessageError("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/messages`,
        { method: "GET", cache: "no-store" }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<MsgRow[]>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load messages.");
      }

      const rows = normalizeList<MsgRow>(json);
      setMessages(sortMessagesByCreatedAt(rows));

      if (shouldStickToBottomRef.current && !isComposingRef.current) {
        requestAnimationFrame(() => {
          scrollToLatest("auto");
        });
      }
    } catch (e: any) {
      setMessageError(e?.message || "Failed to load messages.");
    } finally {
      if (!silent) {
        setLoadingMessages(false);
      }
    }
  }

  async function loadDocuments() {
    setLoadingDocuments(true);
    setDocumentError("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/documents`,
        { method: "GET", cache: "no-store" }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DocumentRow[]>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load documents.");
      }

      setDocuments(normalizeList<DocumentRow>(json));
    } catch (e: any) {
      setDocumentError(e?.message || "Failed to load documents.");
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function markSeen() {
    try {
      const nowIso = new Date().toISOString();

      // only my own read cursor should update locally
      setMyLastReadAt(nowIso);

      await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/seen`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
    } catch {
      // ignore
    }
  }

  async function loadPresenceFromUserPresence() {
    try {
      if (!counterpartUserId) {
        return;
      }

      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from("user_presence")
        .select("user_id,is_online,last_active_at,last_heartbeat_at")
        .eq("user_id", counterpartUserId)
        .maybeSingle();

      const heartbeatMs = data?.last_heartbeat_at
        ? new Date(data.last_heartbeat_at).getTime()
        : 0;

      const effectivelyOnline =
        !!data?.is_online && heartbeatMs > Date.now() - 180000;

      let onlineNow = effectivelyOnline;

      if (!onlineNow && data?.last_active_at) {
        const lastActive = new Date(data.last_active_at).getTime();
        if (Date.now() - lastActive < 60000) {
          onlineNow = true;
        }
      }

      setCounterpartOnline(onlineNow);

      if (data?.last_active_at) {
        setCounterpartLastSeenAt((prev) => {
          if (!prev) return data.last_active_at;

          try {
            const prevTime = new Date(prev).getTime();
            const nextTime = new Date(data.last_active_at).getTime();
            return nextTime > prevTime ? data.last_active_at : prev;
          } catch {
            return prev || data.last_active_at;
          }
        });
      } else if (!effectivelyOnline) {
        setCounterpartLastSeenAt(
          getCounterpartLastReadAt(room, viewerRole) ?? null
        );
      }
    } catch {
      setCounterpartOnline(false);
      setCounterpartLastSeenAt(getCounterpartLastReadAt(room, viewerRole) ?? null);
    }
  }

  useEffect(() => {
    if (!roomId) return;

    loadRoom();
    loadMessages();
    loadDocuments();

    if (typeof document !== "undefined") {
      lastTitleRef.current = document.title;
    }

    const enableTone = async () => {
      messageToneEnabledRef.current = true;
      const ready = await ensureMessageToneReady();

      if (ready) {
        playMessageTone();
      }

      window.removeEventListener("pointerdown", enableTone);
      window.removeEventListener("keydown", enableTone);
      window.removeEventListener("touchstart", enableTone);
      window.removeEventListener("click", enableTone);
    };

    window.addEventListener("pointerdown", enableTone, { once: true });
    window.addEventListener("keydown", enableTone, { once: true });
    window.addEventListener("touchstart", enableTone, { once: true });
    window.addEventListener("click", enableTone, { once: true });

    return () => {
      window.removeEventListener("pointerdown", enableTone);
      window.removeEventListener("keydown", enableTone);
      window.removeEventListener("touchstart", enableTone);
      window.removeEventListener("click", enableTone);

      try {
        if (audioContextRef.current) {
          void audioContextRef.current.close();
          audioContextRef.current = null;
          toneGainRef.current = null;
        }
      } catch {}

      stopTitleFlash(titleFlashTimerRef, lastTitleRef);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const supabase = getSupabaseBrowser();

    const typingChannel = supabase
      .channel(`investment-deal-room-typing-${roomId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const senderUserId = String(payload?.payload?.userId || "");
        if (!senderUserId || senderUserId === currentUserId) return;

        const nowIso = new Date().toISOString();
        setRecentCounterpartActivityAt(nowIso);
        setCounterpartOnline(true);
        setCounterpartLastSeenAt(nowIso);
        setIsCounterpartTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setIsCounterpartTyping(false);

          try {
            const lastMs = nowIso ? new Date(nowIso).getTime() : 0;
            if (Date.now() - lastMs > 120000) {
              setCounterpartOnline(false);
            }
          } catch {}
        }, 2500);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setIsCounterpartTyping(false);
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
    };
  }, [roomId, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    async function sendHeartbeat(isOnline: boolean) {
      try {
        const supabase = getSupabaseBrowser();
        const nowIso = new Date().toISOString();

        await supabase.from("user_presence").upsert(
          {
            user_id: currentUserId,
            is_online: isOnline,
            last_active_at: nowIso,
            last_heartbeat_at: nowIso,
          },
          { onConflict: "user_id" }
        );
      } catch {
        // ignore heartbeat errors
      }
    }

    void sendHeartbeat(true);

    const interval = window.setInterval(() => {
      if (!cancelled) {
        void sendHeartbeat(document.visibilityState === "visible");
      }
    }, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat(true);
      } else {
        void sendHeartbeat(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      void sendHeartbeat(false);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!roomId) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`investment-deal-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_messages",
          filter: `deal_room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const incoming = payload.new as MsgRow;
            const senderRole = String((incoming as any)?.sender_role || "").toLowerCase();
            const isMine = senderRole === viewerRole;

            setMessages((prev) =>
              sortMessagesByCreatedAt(upsertUniqueMessage(prev, incoming))
            );

            if (!isMine) {
              const nowIso = new Date().toISOString();

              setRecentCounterpartActivityAt(nowIso);
              setCounterpartOnline(true);

              setCounterpartLastSeenAt((prev) => {
                if (!prev) return nowIso;

                try {
                  const prevTime = new Date(prev).getTime();
                  const nextTime = new Date(nowIso).getTime();
                  return nextTime > prevTime ? nowIso : prev;
                } catch {
                  return prev || nowIso;
                }
              });

              void loadPresenceFromUserPresence();

              if (
                document.visibilityState !== "visible" ||
                !shouldStickToBottomRef.current
              ) {
                setShowJumpToLatest(true);
              }

              if (document.visibilityState !== "visible") {
                startTitleFlash(
                  titleFlashTimerRef,
                  lastTitleRef,
                  "New investment message"
                );
              }

              if (messageToneEnabledRef.current) {
                void ensureMessageToneReady().then((ok) => {
                  if (ok) playMessageTone();
                });
              }
            }

            if (!isComposingRef.current) {
              if (shouldStickToBottomRef.current) {
                requestAnimationFrame(() => scrollToLatest("smooth"));
              } else {
                setShowJumpToLatest(true);
              }
            }

            if (!isMine) {
              void markSeen();
            }

            return;
          }

          if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              sortMessagesByCreatedAt(
                replaceMessageById(prev, payload.new as MsgRow)
              )
            );
            return;
          }

          if (payload.eventType === "DELETE") {
            const deletedId = String((payload.old as any)?.id || "");
            if (!deletedId) return;
            setMessages((prev) =>
              prev.filter((m) => String(m.id || "") !== deletedId)
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_documents",
          filter: `deal_room_id=eq.${roomId}`,
        },
        () => {
          void loadDocuments();
          void loadRoom({ silent: true });
        }
      )
           .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "investment_deal_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoom((prev) => ({ ...(prev || {}), ...(payload.new as any) }));
          void loadRoom({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, viewerRole, counterpartUserId]);

  useEffect(() => {
    if (!loadingMessages && roomId) {
      markSeen();
    }
  }, [loadingMessages, roomId, messages.length]);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel("deal-room-events");

      bc.onmessage = (event) => {
        const data = event?.data;
        if (!data) return;

        if (data.senderTabId && data.senderTabId === tabIdRef.current) return;

        if (data.type === "investment_message_sent" && data.roomId === roomId) {
          if (!isComposingRef.current) {
            void loadMessages({ silent: true });
          }

          if (messageToneEnabledRef.current) {
            void ensureMessageToneReady().then((ok) => {
              if (ok) playMessageTone();
            });
          }

          void markSeen();
        }
      };

      return () => {
        bc.close();
      };
    } catch {}
  }, [roomId]);

  useEffect(() => {
    const close = () => closeMessageActions();

    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void loadPresenceFromUserPresence();
      stopTitleFlash(titleFlashTimerRef, lastTitleRef);
      void markSeen();
      if (!isComposingRef.current && document.activeElement !== textareaRef.current) {
        void loadMessages({ silent: true });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadPresenceFromUserPresence();
        stopTitleFlash(titleFlashTimerRef, lastTitleRef);
        void markSeen();
        if (!isComposingRef.current) {
          void loadMessages({ silent: true });
        }
      }
    };

    const presenceInterval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !isCounterpartTyping) {
        void loadPresenceFromUserPresence();
      }
    }, 10000);

    const messageInterval = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        !isComposingRef.current &&
        !sending &&
        !uploading &&
        !loadingMessages
      ) {
        void loadMessages({ silent: true });
      }
    }, 5000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(presenceInterval);
      window.clearInterval(messageInterval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [roomId, viewerRole, room, isCounterpartTyping]);

  const status = getStatus(room);

  const isClosedRoom = useMemo(() => {
    const s = status.toLowerCase();
    return ["closed", "completed", "cancelled", "rejected", "dropped"].includes(s);
  }, [status]);

  const ndaRequired = useMemo(() => {
    return Boolean(
      room?.nda_required ?? room?.requires_nda ?? room?.is_nda_required
    );
  }, [room]);

  const ndaAccepted = useMemo(() => {
    return Boolean(
      room?.investor_nda_accepted_at ||
        room?.current_user_nda_accepted_at ||
        room?.nda_accepted_at ||
        room?.has_accepted_nda ||
        room?.nda_accepted
    );
  }, [room]);

  const ndaAcceptedAt = useMemo(() => {
    return (
      room?.investor_nda_accepted_at ||
      room?.current_user_nda_accepted_at ||
      room?.nda_accepted_at ||
      null
    );
  }, [room]);

  const isNdaLockedForInvestor =
    viewerRole === "investor" && ndaRequired && !ndaAccepted;

  const counterpartLabel =
    viewerRole === "builder" ? getInvestorLabel(room) : getBuilderLabel(room);

  useEffect(() => {
    setMyLastReadAt(getMyLastReadAt(room, viewerRole));
    setCounterpartLastReadAt(getCounterpartLastReadAt(room, viewerRole));

    const roomCounterpartRead = getCounterpartLastReadAt(room, viewerRole);
    if (roomCounterpartRead) {
      setCounterpartLastSeenAt((prev) => {
        if (!prev) return roomCounterpartRead;

        try {
          const prevTime = new Date(prev).getTime();
          const nextTime = new Date(roomCounterpartRead).getTime();
          return nextTime > prevTime ? roomCounterpartRead : prev;
        } catch {
          return prev || roomCounterpartRead;
        }
      });
    }
  }, [room, viewerRole]);

  useEffect(() => {
    if (!currentUserId) return;
    void loadPresenceFromUserPresence();
  }, [room, viewerRole, presenceTick, currentUserId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPresenceTick((v) => v + 1);
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const orderedMessages = useMemo(() => {
    return sortMessagesByCreatedAt(messages);
  }, [messages]);

  const latestNonSystemMessage = useMemo(() => {
    const filtered = [...orderedMessages]
      .filter((msg) => !isSystemMessage(msg))
      .sort((a, b) => {
        const aa = new Date(a.created_at || 0).getTime();
        const bb = new Date(b.created_at || 0).getTime();
        return bb - aa;
      });

    return filtered[0] || null;
  }, [orderedMessages]);

  const latestCounterpartMessageAt = useMemo(() => {
    const latest = [...orderedMessages]
      .filter((msg) => {
        if (isSystemMessage(msg)) return false;
        const role = String((msg as any).sender_role || "").toLowerCase();
        return role && role !== viewerRole;
      })
      .sort((a, b) => {
        const aa = new Date(a.created_at || 0).getTime();
        const bb = new Date(b.created_at || 0).getTime();
        return bb - aa;
      })[0];

    return latest?.created_at ? String(latest.created_at) : null;
  }, [orderedMessages, viewerRole]);

  useEffect(() => {
    const currentCount = orderedMessages.length;
    const previousCount = previousMessageCountRef.current;

    if (currentCount === 0) {
      previousMessageCountRef.current = 0;
      return;
    }

    if (currentCount > previousCount) {
      if (!isComposingRef.current) {
        if (shouldStickToBottomRef.current) {
          requestAnimationFrame(() => scrollToLatest("smooth"));
        } else {
          setShowJumpToLatest(true);
        }
      }
    }

    previousMessageCountRef.current = currentCount;
  }, [orderedMessages]);

  useEffect(() => {
    if (!orderedMessages.length) {
      setFirstUnreadMessageId(null);
      setDidAutoScrollToUnread(false);
      return;
    }

    const cutoff = myLastReadAt ? new Date(myLastReadAt).getTime() : 0;

    const firstUnread = orderedMessages.find((msg) => {
      const senderRole = String((msg.sender_role || "")).toLowerCase();
      const isMine = senderRole === viewerRole;
      if (isMine || isSystemMessage(msg) || !msg.created_at) return false;

      return new Date(msg.created_at).getTime() > cutoff;
    });

    setFirstUnreadMessageId(firstUnread?.id ? String(firstUnread.id) : null);
  }, [orderedMessages, viewerRole, myLastReadAt]);

  useEffect(() => {
    if (!firstUnreadMessageId || didAutoScrollToUnread) return;
    if (!unreadDividerRef.current) return;

    const timer = window.setTimeout(() => {
      unreadDividerRef.current?.scrollIntoView({
        behavior: "auto",
        block: "center",
      });
      setDidAutoScrollToUnread(true);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [firstUnreadMessageId, didAutoScrollToUnread]);

  const effectiveCounterpartOnline = useMemo(() => {
    if (isCounterpartTyping) return true;
    if (counterpartOnline) return true;

    const candidates = [
      recentCounterpartActivityAt,
      latestCounterpartMessageAt,
      counterpartLastSeenAt,
    ].filter(Boolean) as string[];

    if (!candidates.length) return false;

    try {
      const latestMs = Math.max(
        ...candidates
          .map((value) => new Date(value).getTime())
          .filter(Number.isFinite)
      );

      return Date.now() - latestMs < 180000;
    } catch {
      return false;
    }
  }, [
    isCounterpartTyping,
    counterpartOnline,
    recentCounterpartActivityAt,
    latestCounterpartMessageAt,
    counterpartLastSeenAt,
  ]);

  const smartReplyState = useMemo(() => {
    if (orderedMessages.length === 0) {
      return {
        confidence: "starter" as const,
        topic: "start" as const,
        replies: INVESTMENT_STARTER_REPLIES[viewerRole],
      };
    }

    return pickSmartReplies(viewerRole, latestNonSystemMessage);
  }, [viewerRole, latestNonSystemMessage, orderedMessages.length]);

  const smartReplies = smartReplyState.replies;

  const stageSuggestion = useMemo(() => {
    const intent = lastReplyIntent || smartReplyState.topic;
    return getStageSuggestion(intent);
  }, [lastReplyIntent, smartReplyState.topic]);

  function scrollToLatest(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    setShowJumpToLatest(false);
    shouldStickToBottomRef.current = true;
  }

  function handleMessagesScroll() {
    const el = messagesScrollRef.current;
    if (!el) return;

    const nearBottom = isNearBottom(el);
    shouldStickToBottomRef.current = nearBottom;

    if (nearBottom) {
      setShowJumpToLatest(false);
    }

    const messageNodes = el.querySelectorAll("[data-msg-date]");
    let current = "";

    messageNodes.forEach((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();

      if (rect.top - parentRect.top <= 60) {
        current = (node as HTMLElement).dataset.msgDate || "";
      }
    });

    if (current) {
      setStickyDate(current);
    }
  }

  function insertEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
    setSuccess("");
    setMessageError("");
    isComposingRef.current = true;
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function quoteMessageToComposer(msg: MsgRow) {
    const preview = shortMessagePreview(getDisplayMessageBody(msg), 100);
    setQuotedMessageId(String(msg.id || ""));
    setQuotedMessageText(preview);
    setSuccess("");
    setMessageError("");
    isComposingRef.current = true;
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function clearQuotedMessage() {
    setQuotedMessageId(null);
    setQuotedMessageText("");
  }

  function openMessageActions(messageId: string) {
    setActiveActionMessageId(messageId);
    setTouchActionMessageId(messageId);
  }

  function closeMessageActions() {
    setActiveActionMessageId(null);
    setTouchActionMessageId(null);
  }

  function beginTouchHold(messageId: string) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    longPressTimerRef.current = setTimeout(() => {
      openMessageActions(messageId);
    }, 450);
  }

  function cancelTouchHold() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function getSenderLabel(msg: MsgRow) {
    if (isSystemMessage(msg)) return "System";

    const senderRole = String((msg as any).sender_role || "").toLowerCase();

    if (senderRole === viewerRole) return "You";
    if (senderRole === "investor") return "Investor";
    if (senderRole === "builder") return "Builder";

    return "Participant";
  }

  async function handleSend() {
    const rawMessage = text.trim();
    if (!rawMessage) return;

    const message = quotedMessageText
      ? `↪ Replying to: ${quotedMessageText}\n\n${rawMessage}`
      : rawMessage;

    setSending(true);
    setMessageError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            meta: {
              intent: lastReplyIntent,
              source: lastReplyIntent ? "smart_reply" : "manual",
            },
          }),
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<MsgRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to send message.");
      }

      const created = normalizeOne<MsgRow>(json);

      if (created) {
        setMessages((prev) =>
          sortMessagesByCreatedAt(upsertUniqueMessage(prev, created))
        );
        requestAnimationFrame(() => scrollToLatest("smooth"));
      } else {
        await loadMessages({ silent: true });
      }

      setText("");
      setLastReplyIntent(null);
      clearQuotedMessage();
      closeMessageActions();
      setShowEmojiBar(false);
      setSuccess("Message sent.");
      shouldStickToBottomRef.current = true;

      try {
        const bc = new BroadcastChannel("deal-room-events");
        bc.postMessage({
          type: "investment_message_sent",
          roomId,
          at: Date.now(),
          senderTabId: tabIdRef.current,
        });
        bc.close();
      } catch {}

      try {
        if (document.visibilityState === "visible") {
          await markSeen();
        }
      } catch {}

      requestAnimationFrame(() => {
        isComposingRef.current = false;
        shouldStickToBottomRef.current = true;
        textareaRef.current?.focus();
      });
    } catch (e: any) {
      setMessageError(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function handleUploadDocument() {
    if (isNdaLockedForInvestor) {
      setDocumentError("Please accept the NDA before uploading documents.");
      return;
    }
    if (!selectedFile) {
      setDocumentError("Please choose a file first.");
      return;
    }

    setUploading(true);
    setDocumentError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      if (docTitle.trim()) formData.append("title", docTitle.trim());
      if (docKind.trim()) formData.append("kind", docKind.trim());
      if (docNote.trim()) formData.append("note", docNote.trim());

      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/documents`,
        { method: "POST", body: formData }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DocumentRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to upload document.");
      }

      setDocTitle("");
      setDocKind("general");
      setDocNote("");
      setSelectedFile(null);
      setSuccess(json?.message || "Document uploaded successfully.");
      await loadDocuments();
      await loadRoom({ silent: true });
    } catch (e: any) {
      setDocumentError(e?.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAcceptNda() {
    setAcceptingNda(true);
    setRoomError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/accept-nda`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DealRoomRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to accept NDA.");
      }

      const updated = normalizeOne<DealRoomRow>(json);
      if (updated) {
        setRoom((prev) => ({ ...(prev || {}), ...updated }));
      } else {
        await loadRoom({ silent: true });
      }

      setSuccess(json?.message || "NDA accepted.");
    } catch (e: any) {
      setRoomError(e?.message || "Failed to accept NDA.");
    } finally {
      setAcceptingNda(false);
    }
  }

  async function handleToggleNdaRequired(nextValue: boolean) {
    setSavingNda(true);
    setRoomError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/nda`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nda_required: nextValue }),
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DealRoomRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update NDA setting.");
      }

      const updated = normalizeOne<DealRoomRow>(json);
      if (updated) {
        setRoom((prev) => ({ ...(prev || {}), ...updated }));
      } else {
        await loadRoom({ silent: true });
      }

      setSuccess(
        nextValue ? "NDA requirement enabled." : "NDA requirement disabled."
      );
    } catch (e: any) {
      setRoomError(e?.message || "Failed to update NDA setting.");
    } finally {
      setSavingNda(false);
    }
  }

  async function handleUpdateStage(nextStage: string) {
    setSavingStage(true);
    setRoomError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/investment/deal-rooms/${encodeURIComponent(roomId)}/stage`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: nextStage }),
        }
      );

      const json = (await res.json().catch(() => null)) as
        | ApiEnvelope<DealRoomRow>
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update stage.");
      }

      const updated = normalizeOne<DealRoomRow>(json);
      if (updated) {
        setRoom((prev) => ({ ...(prev || {}), ...updated }));
      } else {
        await loadRoom({ silent: true });
      }

      setSuccess(json?.message || "Deal stage updated.");
    } catch (e: any) {
      setRoomError(e?.message || "Failed to update stage.");
    } finally {
      setSavingStage(false);
    }
  }

  function sendTypingPulse() {
    if (!typingChannelRef.current || !currentUserId) return;

    try {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUserId,
          at: new Date().toISOString(),
        },
      });
    } catch {}
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    sendTypingPulse();

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && !isClosedRoom && text.trim()) {
        handleSend();
      }
    }
  }

  if (loadingRoom) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 shadow-sm">
          <div className="px-6 py-8 lg:px-8">
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {viewerRole === "builder" ? "Builder Hub" : "Investor Hub"}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Loading Deal Room...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (roomError && !room) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-rose-700">
            Unable to load deal room
          </h1>
          <p className="mt-2 text-sm text-rose-600">{roomError}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={roomHref}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Back to Deal Rooms
            </Link>

            <button
              type="button"
              onClick={() => {
                loadRoom();
                loadMessages();
                loadDocuments();
              }}
              className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 shadow-sm">
        <div className="flex flex-col gap-5 px-5 py-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <div className="mb-3">
              <Link
                href={roomHref}
                className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-950"
              >
                ← Back to Deal Rooms
              </Link>
            </div>

            <div className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              {viewerRole === "builder" ? "Builder Deal Room" : "Investment Deal Room"}
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {getRoomTitle(room)}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Continue the investment discussion, manage file sharing, and track
              progress in one place.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                  status
                )}`}
              >
                {getStatusLabel(status)}
              </span>

              <span className="text-sm text-slate-500">
                {viewerRole === "builder" ? "Investor" : "Builder"}: {counterpartLabel}
              </span>

              <span className="text-sm text-slate-500">
                Opportunity: {getRoomSubtitle(room)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                loadRoom();
                loadMessages();
                loadDocuments();
              }}
              disabled={
                loadingMessages ||
                loadingRoom ||
                loadingDocuments ||
                sending ||
                uploading
              }
              className="inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>

            <Link
              href={unifiedInboxHref}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              {room?.conversation_id ? "Open in Unified Inbox" : "Unified Inbox"}
            </Link>
          </div>
        </div>
      </div>

      {success ? (
        <div className="mb-4 mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
          <div className="font-semibold">Success</div>
          <div className="mt-1">{success}</div>
        </div>
      ) : null}

      {roomError ? (
        <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Room Error</div>
          <div className="mt-1">{roomError}</div>
        </div>
      ) : null}

      {messageError ? (
        <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Message Error</div>
          <div className="mt-1">{messageError}</div>
        </div>
      ) : null}

      {documentError ? (
        <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Document Error</div>
          <div className="mt-1">{documentError}</div>
        </div>
      ) : null}

      {viewerRole === "investor" && isNdaLockedForInvestor ? (
        <div className="mb-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-amber-900">
                NDA acceptance required
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Accept the NDA to unlock protected document access in this deal room.
              </p>
            </div>

            <button
              onClick={handleAcceptNda}
              disabled={acceptingNda}
              className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acceptingNda ? "Accepting NDA..." : "Accept NDA"}
            </button>
          </div>
        </div>
      ) : null}

      {viewerRole === "builder" && ndaRequired ? (
        <div
          className={`mb-6 rounded-[1.75rem] border p-5 shadow-sm ${
            ndaAccepted
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3
                className={`text-base font-semibold ${
                  ndaAccepted ? "text-green-800" : "text-amber-900"
                }`}
              >
                {ndaAccepted
                  ? "Investor NDA accepted"
                  : "Investor NDA acceptance pending"}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  ndaAccepted ? "text-green-700" : "text-amber-800"
                }`}
              >
                {ndaAccepted
                  ? `Accepted${ndaAcceptedAt ? ` on ${fmtDateTime(ndaAcceptedAt)}` : ""}.`
                  : "Protected files remain locked for the investor until acceptance."}
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                ndaAccepted
                  ? "border-green-200 bg-white text-green-700"
                  : "border-amber-200 bg-white text-amber-700"
              }`}
            >
              {ndaAccepted ? "Accepted" : "Pending"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Deal Room Status" subtext="Current room state">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
              status
            )}`}
          >
            {getStatusLabel(status)}
          </span>
        </MetricCard>

        <MetricCard label="Deal Stage" subtext="Current progress stage">
          {viewerRole === "builder" ? (
            <select
              value={room?.stage || room?.deal_stage || "interested"}
              onChange={(e) => handleUpdateStage(e.target.value)}
              disabled={savingStage}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              <option value="interested">Interested</option>
              <option value="discussion">Discussion</option>
              <option value="due_diligence">Due Diligence</option>
              <option value="negotiation">Negotiation</option>
              <option value="term_sheet">Term Sheet</option>
              <option value="closed">Closed</option>
              <option value="dropped">Dropped</option>
            </select>
          ) : (
            <div className="text-sm font-semibold text-slate-900">
              {String(room?.stage || room?.deal_stage || "interested")
                .split("_")
                .map((x: string) => x.charAt(0).toUpperCase() + x.slice(1))
                .join(" ")}
            </div>
          )}
        </MetricCard>

        <MetricCard label="NDA" subtext="Document access control">
          {viewerRole === "builder" ? (
            <div className="space-y-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  !ndaRequired
                    ? "border-slate-200 bg-slate-100 text-slate-700"
                    : ndaAccepted
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {!ndaRequired ? "Not Required" : ndaAccepted ? "Accepted" : "Pending"}
              </span>

              <button
                type="button"
                onClick={() => handleToggleNdaRequired(!ndaRequired)}
                disabled={savingNda}
                className="rounded-xl border border-slate-950 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {savingNda
                  ? "Saving..."
                  : ndaRequired
                  ? "Disable NDA"
                  : "Enable NDA"}
              </button>
            </div>
          ) : (
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                !ndaRequired
                  ? "border-slate-200 bg-slate-100 text-slate-700"
                  : ndaAccepted
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {!ndaRequired ? "Not Required" : ndaAccepted ? "Accepted" : "Pending"}
            </span>
          )}
        </MetricCard>

        <MetricCard
          label={viewerRole === "builder" ? "Investor" : "Builder"}
          subtext="Connected participant"
        >
          <div className="break-words text-sm font-semibold text-slate-900">
            {counterpartLabel}
          </div>
        </MetricCard>

        <MetricCard label="Documents" subtext="Shared files in this room">
          <div className="text-2xl font-bold tracking-tight text-slate-950">
            {documents.length}
          </div>
        </MetricCard>

        <MetricCard label="Last Activity" subtext="Most recent room update">
          <div className="text-sm font-semibold text-slate-900">
            {fmtDateTime(room?.last_message_at || room?.updated_at || room?.created_at)}
          </div>
        </MetricCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-950">Conversation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Direct discussion for this investment opportunity.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          isCounterpartTyping
                            ? "bg-blue-500"
                            : effectiveCounterpartOnline
                            ? "bg-emerald-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <span
                        className={
                          isCounterpartTyping
                            ? "text-blue-600"
                            : effectiveCounterpartOnline
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }
                      >
                        {isCounterpartTyping
                          ? `${viewerRole === "builder" ? "Investor" : "Builder"} typing...`
                          : effectiveCounterpartOnline
                          ? `${viewerRole === "builder" ? "Investor" : "Builder"} online`
                          : counterpartLastSeenAt
                          ? `${viewerRole === "builder" ? "Investor" : "Builder"} last active ${fmtShortSeen(counterpartLastSeenAt)}`
                          : `${viewerRole === "builder" ? "Investor" : "Builder"} offline`}
                      </span>
                    </div>
            </div>

            <div
              ref={messagesScrollRef}
              onScroll={handleMessagesScroll}
              className="relative min-h-[260px] max-h-[520px] overflow-y-auto overscroll-contain bg-gradient-to-b from-white to-slate-50 px-4 py-4"
            >
              {stickyDate ? (
                <div className="sticky top-0 z-20 flex justify-center pointer-events-none">
                  <div className="mt-1 rounded-full bg-slate-200/90 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur">
                    {stickyDate}
                  </div>
                </div>
              ) : null}

              {loadingMessages ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Loading messages...
                </div>
              ) : orderedMessages.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-base font-semibold text-slate-950">
                    No messages yet
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Start the conversation below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderedMessages.map((msg, index) => {
                    const senderRole = String((msg as any).sender_role || "").toLowerCase();
                    const isMine = senderRole === viewerRole;
                    const system = isSystemMessage(msg);

                    const prev = index > 0 ? orderedMessages[index - 1] : null;
                    const next =
                      index < orderedMessages.length - 1
                        ? orderedMessages[index + 1]
                        : null;

                    const isLastOwnVisibleMessage =
                      isMine &&
                      String(msg.id) ===
                        String(
                          [...orderedMessages]
                            .filter((m) => {
                              const role = String((m as any).sender_role || "").toLowerCase();
                              return role === viewerRole && !isSystemMessage(m);
                            })
                            .slice(-1)[0]?.id || ""
                        );

                    const displayBody = getDisplayMessageBody(msg);
                    const quotedPreview = getQuotedPreviewFromMessage(msg);
                    const emojiOnly = isEmojiOnlyMessage(displayBody);

                    const deliveryState = getMessageDeliveryLabel({
                      mine: isLastOwnVisibleMessage,
                      msg,
                      counterpartOnline: effectiveCounterpartOnline,
                      counterpartLastSeenAt,
                      counterpartLastReadAt,
                    });

                    const showDateDivider =
                      !prev || !isSameDay(prev.created_at, msg.created_at);

                    const groupedWithPrevious = isGroupedWithPrevious(prev, msg);
                    const groupedWithNext = isGroupedWithPrevious(msg, next);

                    const bubbleRadius = system
                      ? "rounded-2xl"
                      : isMine
                      ? groupedWithPrevious && groupedWithNext
                        ? "rounded-[20px] rounded-tr-md rounded-br-md"
                        : groupedWithPrevious
                        ? "rounded-[20px] rounded-tr-md"
                        : groupedWithNext
                        ? "rounded-[20px] rounded-br-md"
                        : "rounded-[20px] rounded-br-md"
                      : groupedWithPrevious && groupedWithNext
                      ? "rounded-[20px] rounded-tl-md rounded-bl-md"
                      : groupedWithPrevious
                      ? "rounded-[20px] rounded-tl-md"
                      : groupedWithNext
                      ? "rounded-[20px] rounded-bl-md"
                      : "rounded-[20px] rounded-bl-md";

                    if (system) {
                      return (
                        <React.Fragment key={String(msg.id)}>
                          {showDateDivider ? (
                            <div className="flex justify-center py-1">
                              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                                {getDateDividerLabel(msg.created_at)}
                              </div>
                            </div>
                          ) : null}

                          <div className="flex justify-center">
                            <div
                              data-msg-date={getDateDividerLabel(msg.created_at)}
                              className="max-w-[90%] rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-center text-xs text-blue-700 shadow-sm"
                            >
                              {getMessageText(msg)}
                              <div className="mt-1 text-[11px] text-blue-600">
                                {fmtDateTime(msg.created_at)}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={String(msg.id)}>
                        {showDateDivider ? (
                          <div className="flex justify-center py-1">
                            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                              {getDateDividerLabel(msg.created_at)}
                            </div>
                          </div>
                        ) : null}

                        {firstUnreadMessageId === String(msg.id) ? (
                          <div
                            ref={unreadDividerRef}
                            className="my-3 flex items-center gap-3"
                          >
                            <div className="h-[2px] flex-1 bg-red-400" />
                            <div className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-extrabold text-red-700 shadow-sm">
                              NEW MESSAGES
                            </div>
                            <div className="h-[2px] flex-1 bg-red-400" />
                          </div>
                        ) : null}

                        <div
                          ref={(el) => {
                            messageRefs.current[String(msg.id)] = el;
                          }}
                          data-msg-date={getDateDividerLabel(msg.created_at)}
                          title="Double click or long press for actions"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMessageId((prev) =>
                              prev === String(msg.id) ? null : String(msg.id)
                            );
                          }}
                          onTouchStart={() => beginTouchHold(String(msg.id))}
                          onTouchEnd={cancelTouchHold}
                          onTouchCancel={cancelTouchHold}
                          onTouchMove={cancelTouchHold}
                          className={`flex ${isMine ? "justify-end" : "justify-start"} ${
                            groupedWithPrevious ? "mt-1" : "mt-3"
                          }`}
                        >
                          <div
                            className={`max-w-[82%] px-4 py-2.5 shadow-sm transition hover:shadow-md ${bubbleRadius} ${
                              isMine
                                ? "bg-slate-950 text-white"
                                : "border border-slate-200 bg-slate-50 text-slate-900"
                            }`}
                          >
                            {!groupedWithPrevious ? (
                              <div
                                className={`mb-1 text-[11px] font-semibold ${
                                  isMine ? "text-slate-300" : "text-slate-500"
                                }`}
                              >
                                {getSenderLabel(msg)}
                              </div>
                            ) : null}

                            {quotedPreview ? (
                              <div
                                className={`mb-2 rounded-xl border px-3 py-2.5 text-[11px] ${
                                  isMine
                                    ? "border-slate-700 bg-slate-900/70 text-slate-300"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                <div className="font-semibold">
                                  Replying to
                                </div>
                                <div className="mt-1 line-clamp-2">
                                  {quotedPreview}
                                </div>
                              </div>
                            ) : null}

                            <div
                              className={`whitespace-pre-wrap break-words ${
                                emojiOnly ? "text-2xl leading-none" : "text-sm leading-6"
                              }`}
                            >
                              {displayBody}
                            </div>

                            {activeActionMessageId === String(msg.id) ? (
                              <div
                                className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] rounded-2xl border px-2.5 py-2 shadow-sm ${
                                  isMine
                                    ? "border-slate-700 bg-slate-900/70"
                                    : "border-slate-200 bg-white"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    quoteMessageToComposer(msg);
                                    closeMessageActions();
                                  }}
                                  className={`rounded-full border px-2 py-0.5 font-semibold transition ${
                                    isMine
                                      ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Reply
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(
                                        quotedPreview
                                          ? `Replying to: ${quotedPreview}\n\n${displayBody}`
                                          : displayBody
                                      );
                                      setSuccess("Message copied.");
                                    } catch {
                                      setSuccess("");
                                    }
                                    closeMessageActions();
                                  }}
                                  className={`rounded-full border px-2 py-0.5 font-semibold transition ${
                                    isMine
                                      ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  Copy
                                </button>

                                {isMine ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled
                                      className={`rounded-full border px-2 py-0.5 font-semibold opacity-50 ${
                                        isMine
                                          ? "border-slate-600 text-slate-300"
                                          : "border-slate-300 text-slate-600"
                                      }`}
                                      title="Edit needs investment message PATCH API"
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      disabled
                                      className={`rounded-full border px-2 py-0.5 font-semibold opacity-50 ${
                                        isMine
                                          ? "border-slate-600 text-slate-300"
                                          : "border-slate-300 text-slate-600"
                                      }`}
                                      title="Delete needs investment message DELETE API"
                                    >
                                      Delete
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}

                            <div
                              className={`mt-1.5 flex items-center gap-2 text-[11px] ${
                                isMine ? "text-slate-400" : "text-slate-500"
                              }`}
                              suppressHydrationWarning
                            >
                              <span>{fmtBubbleTime(msg.created_at)}</span>
                              {deliveryState && isLastOwnVisibleMessage ? (
                                <>
                                  <span>•</span>
                                  <span className={deliveryState.className}>
                                    {deliveryState.text}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  <div ref={bottomRef} />
                </div>
              )}

              {showJumpToLatest ? (
                <button
                  type="button"
                  onClick={() => {
                    stopTitleFlash(titleFlashTimerRef, lastTitleRef);
                    scrollToLatest("smooth");
                    void markSeen();
                  }}
                  className="sticky bottom-3 ml-auto mt-3 block rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
                >
                  New messages ↓
                </button>
              ) : null}
            </div>

            <div className="border-t border-slate-200 p-4">
              {isClosedRoom ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  This deal room is currently{" "}
                  <span className="font-semibold">{status}</span>. New messages are disabled.
                </div>
              ) : (
                <div className="space-y-3">
                  {quotedMessageText ? (
                    <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                          Replying to
                        </div>
                        <div className="mt-1 truncate text-sm text-blue-900">
                          {quotedMessageText}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={clearQuotedMessage}
                        className="rounded-full border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-white"
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}

                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setSuccess("");
                      setMessageError("");
                      isComposingRef.current = true;
                      if (lastReplyIntent) setLastReplyIntent(null);
                    }}
                    onFocus={() => {
                      void ensureMessageToneReady().then((ok) => {
                        if (ok) {
                          messageToneEnabledRef.current = true;
                        }
                      });
                    }}
                    onBlur={() => {
                      isComposingRef.current = false;
                      shouldStickToBottomRef.current = isNearBottom(messagesScrollRef.current);
                    }}
                    onKeyDown={handleKeyDown}
                    rows={4}
                    placeholder={
                      viewerRole === "investor"
                        ? "Write your investment query, due diligence point, or reply..."
                        : "Write your response, investment detail, or next-step update..."
                    }
                    className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    {stageSuggestion && (lastReplyIntent || orderedMessages.length > 0) ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
                        <span className="text-blue-700">
                          Suggested: {stageSuggestion.label}
                        </span>

                        <button
                          type="button"
                          disabled={savingStage}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            if (!stageSuggestion.stage) return;
                            handleUpdateStage(stageSuggestion.stage);
                          }}
                        >
                          {savingStage ? "Applying..." : "Apply"}
                        </button>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {viewerRole === "investor"
                            ? orderedMessages.length === 0
                              ? "Start Conversation"
                              : "Investor Smart Replies"
                            : orderedMessages.length === 0
                            ? "Start Conversation"
                            : "Builder Smart Replies"}
                        </p>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            smartReplyState.confidence === "high"
                              ? "bg-emerald-50 text-emerald-700"
                              : smartReplyState.confidence === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {smartReplyState.confidence === "high"
                            ? "High confidence"
                            : smartReplyState.confidence === "medium"
                            ? "Medium confidence"
                            : "Starter"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setText("");
                          setTimeout(() => textareaRef.current?.focus(), 0);
                        }}
                        disabled={sending || !text.trim()}
                        className="text-[11px] font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear draft
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {smartReplies.map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => {
                            const intent =
                              smartReplyState.topic === "start"
                                ? "general"
                                : smartReplyState.topic || "general";

                            setText((prev) => (prev.trim() ? `${prev}\n${reply}` : reply));
                            setLastReplyIntent(intent);
                            setSuccess("");
                            setMessageError("");
                            isComposingRef.current = true;

                            setTimeout(() => textareaRef.current?.focus(), 0);
                          }}
                          disabled={sending}
                          className={`relative z-10 max-w-full cursor-pointer rounded-full border px-3 py-1.5 text-left text-xs font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                            smartReplyState.confidence === "high"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
                              : smartReplyState.confidence === "medium"
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-950 hover:text-slate-950"
                          }`}
                          title={reply}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {smartReplyState.confidence === "high"
                        ? `Suggestions matched strongly to the latest ${smartReplyState.topic} discussion. Tap to insert and edit before sending.`
                        : smartReplyState.confidence === "medium"
                        ? "Suggestions are based on the recent conversation context. Tap to insert and edit before sending."
                        : "Starter suggestions are shown because this chat has no messages yet. Tap to insert and edit before sending."}
                    </p>

                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setShowEmojiBar((prev) => !prev)}
                        className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                      >
                        {showEmojiBar ? "Hide emojis" : "Add emoji"}
                      </button>

                      <p className="text-xs text-slate-500">
                        Press Enter to send. Shift + Enter for new line.
                      </p>
                    </div>

                    {showEmojiBar ? (
                      <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        {CHAT_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertEmoji(emoji)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm transition hover:border-slate-950 hover:bg-slate-50"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || !text.trim()}
                        className="rounded-2xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sending
                          ? "Sending..."
                          : viewerRole === "investor"
                          ? "Send to Builder"
                          : "Send to Investor"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-5">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-950">Documents</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload and track files shared in this deal room.
              </p>
            </div>

            <div className="space-y-4 p-6">
              {isNdaLockedForInvestor ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Upload is locked until you accept the NDA.
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Optional title"
                  disabled={isNdaLockedForInvestor || uploading}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Document Type
                </label>
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                  disabled={isNdaLockedForInvestor || uploading}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="general">General</option>
                  <option value="financial">Financial</option>
                  <option value="legal">Legal</option>
                  <option value="agreement">Agreement</option>
                  <option value="property">Property</option>
                  <option value="project_report">Project Report</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Note
                </label>
                <textarea
                  value={docNote}
                  onChange={(e) => setDocNote(e.target.value)}
                  rows={3}
                  placeholder="Optional note"
                  disabled={isNdaLockedForInvestor || uploading}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  File
                </label>
                <input
                  type="file"
                  disabled={isNdaLockedForInvestor || uploading}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-700"
                />
                {selectedFile ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Selected: {selectedFile.name} ({fmtBytes(selectedFile.size)})
                  </p>
                ) : null}
              </div>

              <button
                onClick={handleUploadDocument}
                disabled={isNdaLockedForInvestor || uploading || !selectedFile}
                className="w-full rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-950">Shared Files</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review all files shared in this room.
              </p>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-6">
              {loadingDocuments ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-base font-semibold text-slate-950">
                    No documents uploaded yet
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Once files are shared in this room, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={String(doc.id)}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                    >
                      <div className="text-sm font-semibold text-slate-950">
                        {getDocumentTitle(doc)}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {doc.kind ? `Type: ${String(doc.kind)}` : "Type: general"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        File: {doc.file_name || "—"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Size: {fmtBytes(doc.file_size_bytes)}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Uploaded: {fmtDateTime(doc.created_at)}
                      </div>

                      {doc.note ? (
                        <div className="mt-2 text-sm text-slate-700">{String(doc.note)}</div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={async () => {
                            if (isNdaLockedForInvestor) {
                              alert("Please accept the NDA before opening documents.");
                              return;
                            }

                            try {
                              const res = await fetch(
                                `/api/investment/deal-rooms/${roomId}/documents/${doc.id}`
                              );
                              const json = await res.json();

                              if (!res.ok) {
                                alert(json?.error || "Failed to open file.");
                                return;
                              }

                              if (json?.data?.signed_url) {
                                window.open(json.data.signed_url, "_blank");
                              }
                            } catch {
                              alert("Failed to open file.");
                            }
                          }}
                          disabled={isNdaLockedForInvestor}
                          className="inline-flex rounded-2xl border border-slate-950 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
                        >
                          {isNdaLockedForInvestor ? "Locked by NDA" : "Open File"}
                        </button>

                        <button
                          onClick={async () => {
                            const ok = confirm("Delete this document?");
                            if (!ok) return;

                            try {
                              const res = await fetch(
                                `/api/investment/deal-rooms/${roomId}/documents/${doc.id}`,
                                { method: "DELETE" }
                              );

                              const json = await res.json();

                              if (!res.ok) {
                                alert(json?.error || "Delete failed.");
                                return;
                              }

                              await loadDocuments();
                            } catch {
                              alert("Delete failed.");
                            }
                          }}
                          className="inline-flex rounded-2xl border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-950">Deal Room Info</h2>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Room ID
                </div>
                <div className="mt-1 break-all text-sm text-slate-900">
                  {room?.id || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Opportunity ID
                </div>
                <div className="mt-1 break-all text-sm text-slate-900">
                  {room?.opportunity_id || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Conversation ID
                </div>
                <div className="mt-1 break-all text-sm text-slate-900">
                  {room?.conversation_id || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {viewerRole === "builder" ? "Investor" : "Builder"} User ID
                </div>
                <div className="mt-1 break-all text-sm text-slate-900">
                  {viewerRole === "builder"
                    ? room?.investor_user_id || "—"
                    : room?.builder_user_id || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Created
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {fmtDateTime(room?.created_at)}
                </div>
              </div>

              {room?.opportunity_snapshot ? (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Opportunity Snapshot
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
                    {JSON.stringify(room.opportunity_snapshot, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}