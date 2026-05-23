"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type AttachmentRow = {
  kind?: "image" | "file";
  name?: string;
  path?: string;
  mime?: string;
  size?: number;
};

type MsgRow = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string;
  body: string;
  meta?: {
    attachments?: AttachmentRow[];
    reply_to?: {
      id?: string;
      body?: string;
      sender_role?: string;
      sender_user_id?: string;
    };
    reactions?: {
      [emoji: string]: string[];
    };
    [key: string]: any;
  } | null;
  created_at: string | null;
};

type ConversationParticipantRow = {
  conversation_id: string;
  user_id: string;
  role?: string | null;
  last_read_at: string | null;
};

type UserPresenceRow = {
  user_id: string;
  is_online: boolean | null;
  last_active_at: string | null;
  last_heartbeat_at: string | null;
  current_page: string | null;
  updated_at: string | null;
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateDividerLabel(v?: string | null) {
  if (!v) return "";

  try {
    const d = new Date(v);
    const now = new Date();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (sameDay(d, now)) return "Today";
    if (sameDay(d, yesterday)) return "Yesterday";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(v);
  }
}

function fmtShortSeen(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function fmtDeliveryStatus(args: {
  mine: boolean;
  isLatestOwnMessage: boolean;
  seenThisMessage: boolean;
  counterpartOnline: boolean;
  counterpartLastSeenAt: string | null;
  createdAt: string | null;
}) {
  const {
    mine,
    isLatestOwnMessage,
    seenThisMessage,
    counterpartOnline,
    counterpartLastSeenAt,
    createdAt,
  } = args;

  if (!mine || !isLatestOwnMessage) return null;

  if (seenThisMessage) {
  return {
    text: "Seen",
    color: "#166534",
  };
}

  const delivered =
    counterpartOnline ||
    (!!counterpartLastSeenAt &&
      !!createdAt &&
      new Date(counterpartLastSeenAt).getTime() >= new Date(createdAt).getTime());

  if (delivered) {
    return {
      text: "Delivered",
      color: "#2563eb",
    };
  }

  return {
    text: "Sent",
    color: "#475569",
  };
}

function formatBytes(bytes?: number) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(att?: AttachmentRow) {
  return att?.kind === "image" || String(att?.mime || "").toLowerCase().startsWith("image/");
}

function isAudioAttachment(att?: AttachmentRow) {
  return String(att?.mime || "").toLowerCase().startsWith("audio/");
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👎"];
const COMPOSER_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "❤️", "😮", "😢", "🎉", "🔥"];

const QUICK_REPLIES = [
  "Please confirm final price including delivery.",
  "Please share GST bill / invoice before dispatch.",
  "Please confirm quantity, brand and delivery location.",
  "Can you offer a better price if I confirm today?",
  "Please share payment terms before I proceed.",
  "Please confirm dispatch time and delivery charge.",
];

const BUYER_AI_ACTIONS = [
  "Ask missing details",
  "Negotiate better price",
  "Ask bulk discount",
  "Ask free delivery",
  "Ask for invoice",
  "Confirm delivery",
  "Ask payment terms",
  "Compare with other vendors",
];

const CHAT_BUCKET = "rfq_chat_attachments";
const MAX_FILES = 5;
const ONLINE_WINDOW_MS = 45_000;
const POLL_INTERVAL_MS = 2500;
const HEARTBEAT_INTERVAL_MS = 15000;

export default function BuyerRfqChatBox(props: {
  rfqId: string;
  conversationId: string;
  currentUserId: string;
  vendorName: string;
  vendorPhone?: string | null;
  vendorUserId?: string | null;
  initialMessages: MsgRow[];
}) {
  const { rfqId, conversationId, currentUserId, initialMessages, vendorPhone, vendorUserId } = props;

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [messages, setMessages] = useState<MsgRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFilePreviewUrls, setSelectedFilePreviewUrls] = useState<Record<string, string>>({});
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [counterpartLastSeenAt, setCounterpartLastSeenAt] = useState<string | null>(null);
  const [myLastSeenAt, setMyLastSeenAt] = useState<string | null>(null);
  const [counterpartOnline, setCounterpartOnline] = useState(false);
  const [presenceTick, setPresenceTick] = useState(0);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [stickyDate, setStickyDate] = useState<string>("");
  const [didAutoScrollToUnread, setDidAutoScrollToUnread] = useState(false);
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [dealReady, setDealReady] = useState<any>(null);
  const [dealReadyLoading, setDealReadyLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [err, setErr] = useState("");
  const [failedTextRetry, setFailedTextRetry] = useState<{
    body: string;
    replyTo: MsgRow | null;
  } | null>(null);
  const [recordedAudioFile, setRecordedAudioFile] = useState<File | null>(null);
  const [recordedAudioPreviewUrl, setRecordedAudioPreviewUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isHoldRecording, setIsHoldRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MsgRow | null>(null);
  const [showEmojiBox, setShowEmojiBox] = useState(false);
  const [actionMenu, setActionMenu] = useState<{
    message: MsgRow;
    x: number;
    y: number;
  } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<MsgRow | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [hoverReactionMessageId, setHoverReactionMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const unreadDividerRef = useRef<HTMLDivElement | null>(null);
  const scrollBoxRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleFlashTimerRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string>("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipClickAfterHoldRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const orderedRef = useRef<MsgRow[]>(initialMessages);
  const isNearBottomRef = useRef(true);
  const lastHotDealAlertKeyRef = useRef("");

  const ordered = useMemo(() => {
    return [...messages].sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return at - bt;
    });
  }, [messages]);

  useEffect(() => {
    orderedRef.current = ordered;
  }, [ordered]);

  useEffect(() => {
    if (!conversationId || ordered.length === 0) return;

    const dealMessages = ordered
      .filter((m) => {
        const isSystem =
          m.sender_role === "system" || m.message_type === "system";
        const isDeleted = Boolean(m.meta?.deleted);
        return !isSystem && !isDeleted;
      })
      .map((m) => ({
        role: String(m.sender_role || "user"),
        body: String(m.body || ""),
      }))
      .filter((m) => m.body.trim().length > 0);

    if (dealMessages.length === 0) return;

    const timer = window.setTimeout(() => {
      fetch("/api/ai/vendor-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          side: "buyer",
          vendorUserId: vendorUserId || "",
          conversationId,
          messages: dealMessages,
        }),
      }).catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [ordered, conversationId, vendorUserId]);
  useEffect(() => {
  if (!ordered.length) return;

  const unread = ordered.find((m) => {
    if (String(m.sender_user_id ?? "") === String(currentUserId)) return false;

    if (!myLastSeenAt) return true;

    if (!m.created_at) return false;

    return new Date(m.created_at).getTime() >
      new Date(myLastSeenAt).getTime();
  });

  setFirstUnreadMessageId(unread?.id ?? null);
}, [ordered, myLastSeenAt, currentUserId]);

  const latestOwnMessageId = useMemo(() => {
    const own = [...ordered]
      .filter(
        (m) =>
          String(m.sender_user_id ?? "") === String(currentUserId) &&
          m.sender_role !== "system" &&
          m.message_type !== "system"
      )
      .sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      })[0];

    return own?.id ?? null;
  }, [ordered, currentUserId]);

  useEffect(() => {
  if (!conversationId || ordered.length === 0) return;

  const recentMessages = ordered
    .filter((m) => {
      const isSystem = m.sender_role === "system" || m.message_type === "system";
      const isDeleted = Boolean(m.meta?.deleted);
      return !isSystem && !isDeleted;
    })
    .slice(-8)
    .map((m) => ({
      role: m.sender_role === "buyer" ? "buyer" : "vendor",
      body: String(m.body || ""),
    }));

  if (recentMessages.length === 0) return;

  const timer = setTimeout(async () => {
    try {
      setDealReadyLoading(true);

      const res = await fetch("/api/ai/deal-ready", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: recentMessages,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.data) {
        setDealReady(json.data);
      }
    } catch {
      // silent
    } finally {
      setDealReadyLoading(false);
    }
  }, 900);

  return () => clearTimeout(timer);
}, [ordered, conversationId]);

  useEffect(() => {
  if (!conversationId || ordered.length === 0) return;

  const recentMessages = ordered
    .filter((m) => {
      const isSystem = m.sender_role === "system" || m.message_type === "system";
      const isDeleted = Boolean(m.meta?.deleted);
      return !isSystem && !isDeleted;
    })
    .slice(-8)
    .map((m) => ({
      role: m.sender_role === "buyer" ? "buyer" : "vendor",
      body: String(m.body || ""),
    }));

  if (recentMessages.length === 0) return;

  const timer = setTimeout(async () => {
    try {
      setAiLoading(true);

      const res = await fetch("/api/ai/chat-reply-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          side: "buyer",
          messages: recentMessages,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.suggestions?.length) {
        setAiSuggestions(json.suggestions.slice(0, 4));
      } else {
        setAiSuggestions([]);
      }
    } catch {
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  }, 800);

  return () => clearTimeout(timer);
}, [ordered, conversationId]);

  useEffect(() => {
  setMessages(initialMessages ?? []);
  setDidAutoScrollToUnread(false);
}, [initialMessages]);

  useEffect(() => {
    const nextMap: Record<string, string> = {};
    const previousMap = { ...selectedFilePreviewUrls };

    for (const file of selectedFiles) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (file.type.startsWith("image/")) {
        nextMap[key] = previousMap[key] || URL.createObjectURL(file);
      }
    }

    for (const key of Object.keys(previousMap)) {
      if (!nextMap[key]) {
        URL.revokeObjectURL(previousMap[key]);
      }
    }

    setSelectedFilePreviewUrls(nextMap);

    return () => {
      for (const key of Object.keys(nextMap)) {
        URL.revokeObjectURL(nextMap[key]);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles]);
  
  useEffect(() => {
    if (!isNearBottomRef.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ordered]);
  useEffect(() => {
  if (!firstUnreadMessageId) return;
  if (didAutoScrollToUnread) return;

  const el = unreadDividerRef.current;
  if (!el) return;

  setTimeout(() => {
    el.scrollIntoView({
      behavior: "auto",
      block: "center",
    });
    setDidAutoScrollToUnread(true);
  }, 100);
}, [firstUnreadMessageId, didAutoScrollToUnread]);
    useEffect(() => {
    return () => {
      if (recordedAudioPreviewUrl) {
        URL.revokeObjectURL(recordedAudioPreviewUrl);
      }
    };
  }, [recordedAudioPreviewUrl]);

useEffect(() => {
  presenceTimerRef.current = setInterval(() => {
    setPresenceTick((v) => v + 1);
  }, 15000);

  return () => {
    if (presenceTimerRef.current) {
      clearInterval(presenceTimerRef.current);
    }
  };
}, []);

useEffect(() => {
  const el = scrollBoxRef.current;
  if (!el) return;

  const onScroll = () => {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    const nearBottom = distanceFromBottom < 120;

    isNearBottomRef.current = nearBottom;

    setShowJumpToLatest(!nearBottom);

    const messageNodes = el.querySelectorAll("[data-msg-date]");

    let current = "";

    messageNodes.forEach((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();

      if (rect.top - parentRect.top <= 60) {
        current = (node as HTMLElement).dataset.msgDate || "";
      }
    });

    if (current) setStickyDate(current);
  };

  el.addEventListener("scroll", onScroll);

  return () => {
    el.removeEventListener("scroll", onScroll);
  };
}, []);

  function upsertMessage(next: MsgRow) {
    setMessages((prev) => {
      const exists = prev.some((m) => String(m.id) === String(next.id));
      if (exists) return prev;
      return [...prev, next];
    });
  }
  function scrollToLatest() {
  endRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}
function jumpToMessage(messageId?: string | null) {
  const id = String(messageId ?? "").trim();
  if (!id) return;

  const el = messageRefs.current[id];
  if (!el) return;

  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  setHighlightedMessageId(id);

  window.setTimeout(() => {
    setHighlightedMessageId((prev) => (prev === id ? null : prev));
  }, 1800);
}

  function replaceAllMessages(next: MsgRow[]) {
    setMessages((prev) => {
      const prevIds = prev.map((m) => String(m.id)).join("|");
      const nextIds = next.map((m) => String(m.id)).join("|");
      if (prevIds === nextIds) return prev;
      return next;
    });
  }

  function playSoftNotification() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.18);

      window.setTimeout(() => {
        try {
          ctx.close();
        } catch {}
      }, 300);
    } catch {}
  }

  function stopTitleFlash() {
    if (titleFlashTimerRef.current) {
      window.clearInterval(titleFlashTimerRef.current);
      titleFlashTimerRef.current = null;
    }
    if (originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
  }

  function startTitleFlash() {
    if (typeof document === "undefined") return;
    if (titleFlashTimerRef.current) return;

    originalTitleRef.current = document.title;
    let toggle = false;

    titleFlashTimerRef.current = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? "💬 New message - 3Bigha.com" : originalTitleRef.current;
    }, 1000);
  }

  async function getCounterpartUserId() {
  if (!conversationId || !currentUserId) return "";

  try {
    const { data } = await supabase
      .from("conversation_participants")
      .select("conversation_id,user_id,role,last_read_at")
      .eq("conversation_id", conversationId);

    const rows = (data ?? []) as ConversationParticipantRow[];

    const counterpart = rows.find(
      (row) => String(row.user_id ?? "") !== String(currentUserId)
    );

    return String(counterpart?.user_id ?? "");
  } catch {
    return "";
  }
}
  async function touchMyPresence() {
    if (!currentUserId) return;

    try {
      const now = new Date().toISOString();

      await supabase.from("user_presence").upsert(
        {
          user_id: currentUserId,
          is_online: true,
          last_active_at: now,
          last_heartbeat_at: now,
          current_page: `/dashboard/buyer/quote-compare/${rfqId}/chat`,
          updated_at: now,
        },
        {
          onConflict: "user_id",
        }
      );
    } catch {}
  }

  async function markConversationRead() {
  if (!conversationId || !currentUserId) return;

  try {
    const nowIso = new Date().toISOString();

    setMyLastSeenAt(nowIso);

    await supabase
      .from("conversation_participants")
      .update({
        last_read_at: nowIso,
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId);

    stopTitleFlash();
  } catch {}
}

    async function loadCounterpartReadStatus() {
    if (!conversationId || !currentUserId) return;

    try {
      const { data: readData } = await supabase
        .from("conversation_participants")
        .select("conversation_id,user_id,role,last_read_at")
        .eq("conversation_id", conversationId)
        .neq("user_id", currentUserId);

      const rows = (readData ?? []) as ConversationParticipantRow[];
      const latest = [...rows].sort((a, b) => {
        const at = a.last_read_at ? new Date(a.last_read_at).getTime() : 0;
        const bt = b.last_read_at ? new Date(b.last_read_at).getTime() : 0;
        return bt - at;
      })[0];

      setCounterpartLastSeenAt(latest?.last_read_at ?? null);
      await loadCounterpartPresence();
    } catch {
      setCounterpartLastSeenAt(null);
      setCounterpartOnline(false);
    }
  }
  async function loadMyReadStatus() {
  if (!conversationId || !currentUserId) return;

  try {
    const { data } = await supabase
      .from("conversation_participants")
      .select("conversation_id,user_id,role,last_read_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", currentUserId)
      .maybeSingle();

    const row = (data ?? null) as ConversationParticipantRow | null;
    setMyLastSeenAt(row?.last_read_at ?? null);
  } catch {
    setMyLastSeenAt(null);
  }
}

    async function loadCounterpartPresence() {
    if (!conversationId || !currentUserId) return;

    try {
      const counterpartUserId = await getCounterpartUserId();

      if (!counterpartUserId) {
        setCounterpartOnline(false);
        return;
      }

      const { data: presenceData } = await supabase
        .from("user_presence")
        .select("user_id,is_online,last_active_at,last_heartbeat_at,current_page,updated_at")
        .eq("user_id", counterpartUserId)
        .maybeSingle();

      const presence = (presenceData ?? null) as UserPresenceRow | null;
      const heartbeatMs = presence?.last_heartbeat_at
        ? new Date(presence.last_heartbeat_at).getTime()
        : 0;

      const effectivelyOnline =
        !!presence?.is_online &&
        heartbeatMs > Date.now() - ONLINE_WINDOW_MS;

      setCounterpartOnline(effectivelyOnline);

      if (!effectivelyOnline && presence?.last_active_at) {
        setCounterpartLastSeenAt(presence.last_active_at);
      }
    } catch {
      setCounterpartOnline(false);
    }
  }

  async function pollLatestMessages() {
    if (!conversationId) return;

    try {
      const { data } = await supabase
        .from("conversation_messages")
        .select("id,sender_user_id,sender_role,message_type,body,meta,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const rows = (data ?? []) as MsgRow[];

      const prevOrdered = orderedRef.current;
      const prevLastId = prevOrdered.length ? String(prevOrdered[prevOrdered.length - 1]?.id ?? "") : "";
      const nextLastId = rows.length ? String(rows[rows.length - 1]?.id ?? "") : "";

      replaceAllMessages(rows);

      if (!rows.length) return;

      const newest = rows[rows.length - 1];
      const isIncoming = String(newest?.sender_user_id ?? "") !== String(currentUserId);

      if (prevLastId && nextLastId && prevLastId !== nextLastId && isIncoming) {
        const pageVisible = document.visibilityState === "visible";
        const pageFocused =
          typeof document.hasFocus === "function" ? document.hasFocus() : true;

        if (!pageVisible || !pageFocused) {
          playSoftNotification();
          startTitleFlash();
        }

        if (pageVisible && pageFocused) {
          await markConversationRead();
        }
      }
    } catch {}
  }

  function sendTypingPulse() {
    if (!typingChannelRef.current) return;

    try {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user: currentUserId,
          at: new Date().toISOString(),
        },
      });
    } catch {}
  }

  useEffect(() => {
  void markConversationRead();
  void touchMyPresence();
  void loadMyReadStatus();
  void loadCounterpartReadStatus();
  void loadCounterpartPresence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    const messageChannel = supabase
      .channel(`buyer-rfq-chat-${conversationId}-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const row = payload?.new as MsgRow | undefined;
          if (!row?.id) return;

          upsertMessage(row);

          const isIncoming = String(row.sender_user_id ?? "") !== String(currentUserId);

          if (isIncoming) {
            const pageVisible = document.visibilityState === "visible";
            const pageFocused =
              typeof document.hasFocus === "function" ? document.hasFocus() : true;

            if (!pageVisible || !pageFocused) {
              playSoftNotification();
              startTitleFlash();
            }

            if (pageVisible && pageFocused) {
              await markConversationRead();
            }
          }
        }
      )
      .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "conversation_participants",
    filter: `conversation_id=eq.${conversationId}`,
  },
  async (payload: any) => {
    const row = (payload?.new ?? payload?.old) as ConversationParticipantRow | undefined;
    if (!row?.conversation_id) return;

    if (String(row.user_id ?? "") === String(currentUserId)) {
      setMyLastSeenAt(row.last_read_at ?? null);
      return;
    }

    setCounterpartLastSeenAt(row.last_read_at ?? null);
    await loadCounterpartPresence();
  }
)
      .subscribe();

    const typingChannel = supabase
      .channel(`typing-${conversationId}-${currentUserId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "typing" }, () => {
        setIsCounterpartTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setIsCounterpartTyping(false);
        }, 3000);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    pollTimerRef.current = setInterval(() => {
      void pollLatestMessages();
      void loadCounterpartReadStatus();
    }, POLL_INTERVAL_MS);

    heartbeatTimerRef.current = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        (typeof document.hasFocus !== "function" || document.hasFocus())
      ) {
        void markConversationRead();
        void touchMyPresence();
      }
    }, HEARTBEAT_INTERVAL_MS);

    void pollLatestMessages();

    return () => {
      stopTitleFlash();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }

      typingChannelRef.current = null;

if (presenceChannelRef.current) {
  supabase.removeChannel(presenceChannelRef.current);
  presenceChannelRef.current = null;
}

supabase.removeChannel(messageChannel);
supabase.removeChannel(typingChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    function onFocus() {
  void markConversationRead();
  void touchMyPresence();
  void loadMyReadStatus();
  void loadCounterpartReadStatus();
  void loadCounterpartPresence();
  stopTitleFlash();
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    void markConversationRead();
    void touchMyPresence();
    void loadMyReadStatus();
    void loadCounterpartReadStatus();
    void loadCounterpartPresence();
    stopTitleFlash();
  }
}

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, currentUserId]);
  
  useEffect(() => {
  let cancelled = false;

  async function setupPresenceChannel() {
    const counterpartUserId = await getCounterpartUserId();
    if (!counterpartUserId || cancelled) return;

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    const presenceChannel = supabase
      .channel(`buyer-presence-${conversationId}-${counterpartUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${counterpartUserId}`,
        },
        async () => {
          await loadCounterpartPresence();
        }
      )
      .subscribe();

    presenceChannelRef.current = presenceChannel;
  }

  void setupPresenceChannel();

  return () => {
    cancelled = true;

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [conversationId, currentUserId, supabase]);
  useEffect(() => {
    function onWindowClick() {
  closeActionMenu();
  setShowEmojiBox(false);
  setHoverReactionMessageId(null);
}

    function onEscape(e: KeyboardEvent) {
  if (e.key === "Escape") {
    closeActionMenu();
    setShowEmojiBox(false);
    setHoverReactionMessageId(null);
    closeDeleteConfirm();
  }
}

    window.addEventListener("click", onWindowClick);
    window.addEventListener("contextmenu", onWindowClick);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("contextmenu", onWindowClick);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);
  useEffect(() => {
    let active = true;

    async function ensureSignedUrls() {
      const attachmentsToResolve: string[] = [];

      for (const m of ordered) {
        const atts = Array.isArray(m.meta?.attachments) ? m.meta?.attachments : [];
        for (const att of atts || []) {
          const path = String(att?.path || "");
          if (path && !attachmentUrls[path]) {
            attachmentsToResolve.push(path);
          }
        }
      }

      if (attachmentsToResolve.length === 0) return;

      const uniquePaths = Array.from(new Set(attachmentsToResolve));
      const nextMap: Record<string, string> = {};

      for (const path of uniquePaths) {
        const { data, error } = await supabase.storage
          .from(CHAT_BUCKET)
          .createSignedUrl(path, 60 * 60);

        if (!error && data?.signedUrl) {
          nextMap[path] = data.signedUrl;
        }
      }

      if (!active || Object.keys(nextMap).length === 0) return;

      setAttachmentUrls((prev) => ({ ...prev, ...nextMap }));
    }

    void ensureSignedUrls();

    return () => {
      active = false;
    };
  }, [ordered, attachmentUrls, supabase]);

  function getReplyPreviewText(message?: MsgRow | null) {
    const textBody = String(message?.body ?? "").trim();
    if (textBody) return textBody.length > 120 ? `${textBody.slice(0, 120)}…` : textBody;

    const attachments = Array.isArray(message?.meta?.attachments) ? message?.meta?.attachments : [];
    if (attachments.length > 0) {
      const first = attachments[0];
      return first?.kind === "image" ? "📷 Image" : "📎 Attachment";
    }

    return "Message";
  }

  function getReplyPreviewSender(message?: MsgRow | null) {
    if (!message) return "";
    return String(message.sender_user_id ?? "") === String(currentUserId) ? "You" : "Vendor";
  }

  function startReply(message: MsgRow) {
    setReplyingTo(message);
  }

  function cancelReply() {
    setReplyingTo(null);
  }

  function openActionMenu(message: MsgRow, x: number, y: number) {
  setActionMenu({ message, x, y });
  setShowReactionPicker(false);
  setHoverReactionMessageId(null);
  setShowEmojiBox(false);
}

  function closeActionMenu() {
  setActionMenu(null);
  setShowReactionPicker(false);
  setHoverReactionMessageId(null);
}

  function openDeleteConfirm(message: MsgRow) {
  setDeleteConfirmMessage(message);
  closeActionMenu();
}

function closeDeleteConfirm() {
  setDeleteConfirmMessage(null);
}

  function startEditMessage(message: MsgRow) {
  setEditingMessageId(message.id);
  setEditingText(String(message.body ?? ""));
  closeActionMenu();
}

function cancelEditMessage() {
  setEditingMessageId(null);
  setEditingText("");
}

async function saveEditMessage(messageId: string) {
  const body = editingText.trim();
  if (!body) return;

  try {
    const res = await fetch(
      `/api/rfq-conversations/${encodeURIComponent(rfqId)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ body }),
      }
    );

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(json?.error ?? "Failed to edit message.");
      return;
    }

    const nextMsg = json?.message;
    if (!nextMsg) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              body: nextMsg.body,
              meta: nextMsg.meta ?? m.meta ?? {},
            }
          : m
      )
    );

    cancelEditMessage();
  } catch (e: any) {
    setErr(e?.message ?? "Failed to edit message.");
  }
}

async function deleteMessageForEveryone(messageId: string) {
  try {
    const res = await fetch(
      `/api/rfq-conversations/${encodeURIComponent(rfqId)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: "DELETE",
        headers: {
          accept: "application/json",
        },
      }
    );

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(json?.error ?? "Failed to delete message.");
      return;
    }

    const nextMsg = json?.message;
    if (!nextMsg) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              body: "",
              message_type: "text",
              meta: nextMsg.meta ?? m.meta ?? {},
            }
          : m
      )
    );

    cancelEditMessage();
    closeActionMenu();
    closeDeleteConfirm();
  } catch (e: any) {
    setErr(e?.message ?? "Failed to delete message.");
  }
}

  async function copyMessageText(message: MsgRow) {
    const value = String(message.body ?? "").trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      closeActionMenu();
    } catch {}
  }

  function insertEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
    setShowEmojiBox(false);
  }
    async function toggleReaction(message: MsgRow, emoji: string) {
    try {
      const current = message.meta?.reactions || {};
      const list = current[emoji] || [];

      let updated: string[];

      if (list.includes(currentUserId)) {
        updated = list.filter((u) => u !== currentUserId);
      } else {
        updated = [...list, currentUserId];
      }

      const nextReactions = {
        ...current,
        [emoji]: updated,
      };

      const { error } = await supabase
        .from("conversation_messages")
        .update({
          meta: {
            ...(message.meta || {}),
            reactions: nextReactions,
          },
        })
        .eq("id", message.id);

      if (error) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                meta: {
                  ...(m.meta || {}),
                  reactions: nextReactions,
                },
              }
            : m
        )
      );
    } catch {}
  }

    function retryFailedTextSend() {
    if (!failedTextRetry || loading) return;
    void sendMessage(failedTextRetry.body, failedTextRetry.replyTo);
  }

    function clearRecordedAudio() {
    if (recordedAudioPreviewUrl) {
      URL.revokeObjectURL(recordedAudioPreviewUrl);
    }
    setRecordedAudioFile(null);
    setRecordedAudioPreviewUrl("");
  }

  async function startAudioRecording(mode: "tap" | "hold" = "tap") {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });

        const previewUrl = URL.createObjectURL(blob);

        setRecordedAudioFile(file);
        setRecordedAudioPreviewUrl(previewUrl);
        setIsRecording(false);
        setIsHoldRecording(false);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setIsHoldRecording(mode === "hold");
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "Microphone access failed.");
      setIsRecording(false);
      setIsHoldRecording(false);
    }
  }

  function stopAudioRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      setIsHoldRecording(false);
    }
  }

  function handleMicClick() {
    if (skipClickAfterHoldRef.current) {
      skipClickAfterHoldRef.current = false;
      return;
    }

    if (isRecording) {
      stopAudioRecording();
    } else {
      void startAudioRecording("tap");
    }
  }

  function handleMicPressStart() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = setTimeout(() => {
      skipClickAfterHoldRef.current = true;
      void startAudioRecording("hold");
    }, 250);
  }

  function handleMicPressEnd() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isRecording && isHoldRecording) {
      stopAudioRecording();
    }
  }

  function applyQuickReply(value: string) {
    setText(value);
  }

  function onPickFiles(files: FileList | null) {
    const picked = Array.from(files ?? []);
    if (!picked.length) return;

    const next = [...selectedFiles, ...picked].slice(0, MAX_FILES);
    setSelectedFiles(next);
    setErr("");

    if (picked.length + selectedFiles.length > MAX_FILES) {
      setErr(`Maximum ${MAX_FILES} files allowed at a time.`);
    }
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearSelectedFiles() {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendMessage(messageOverride?: string, replyOverride?: MsgRow | null) {
    const body = (messageOverride ?? text).trim();
    const hasFiles = selectedFiles.length > 0 || !!recordedAudioFile;
    const effectiveReplyingTo = replyOverride ?? replyingTo;
    const replyToId = String(effectiveReplyingTo?.id ?? "").trim();

    if ((!body && !hasFiles) || loading) return;

    setLoading(true);
    setErr("");

    if (!hasFiles) {
      setFailedTextRetry(null);
    }

    try {
      let res: Response;

      if (hasFiles) {
        const form = new FormData();
        form.append("conversation_id", conversationId);
        form.append("body", body);

        if (replyToId) {
          form.append("reply_to_id", replyToId);
        }

        for (const file of selectedFiles) {
          form.append("files", file);
        }

        if (recordedAudioFile) {
          form.append("files", recordedAudioFile);
        }

        res = await fetch(`/api/rfq-conversations/${encodeURIComponent(rfqId)}/messages`, {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch(`/api/rfq-conversations/${encodeURIComponent(rfqId)}/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            body,
            reply_to_id: replyToId || undefined,
          }),
        });
      }

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error ?? "Failed to send message.");

        if (!hasFiles && body) {
          setFailedTextRetry({
            body,
            replyTo: effectiveReplyingTo ?? null,
          });
        }

        return;
      }

      upsertMessage({
        id: json.id,
        sender_user_id: currentUserId,
        sender_role: "buyer",
        message_type: json?.message_type ?? (hasFiles ? "file" : "text"),
        body: json?.body ?? body,
        created_at: json.created_at ?? new Date().toISOString(),
        meta: json?.meta ?? {},
      });

      setText("");
      clearSelectedFiles();
      clearRecordedAudio();
      setReplyingTo(null);
      setShowEmojiBox(false);
      setIsCounterpartTyping(false);
      setFailedTextRetry(null);
      await markConversationRead();
      await touchMyPresence();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send message.");

      if (!hasFiles && body) {
        setFailedTextRetry({
          body,
          replyTo: effectiveReplyingTo ?? null,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function renderAttachment(att: AttachmentRow, i: number) {
    const path = String(att?.path || "");
    const signedUrl = path ? attachmentUrls[path] : "";
    const image = isImageAttachment(att);
    const audio = isAudioAttachment(att);

    if (audio) {
      return (
        <div
          key={`${path}-${i}`}
          style={{
            marginTop: 8,
            border: "1px solid #d1d5db",
            borderRadius: 12,
            padding: 10,
            background: "#f9fafb",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
            🎤 Voice message
          </div>

          {signedUrl ? (
            <audio controls src={signedUrl} style={{ width: "100%" }} />
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Preparing audio...</div>
          )}

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78 }}>
            {att?.name || "Audio"} {att?.size ? `• ${formatBytes(att.size)}` : ""}
          </div>
        </div>
      );
    }

    if (image) {
      return (
        <div key={`${path}-${i}`} style={{ marginTop: 8 }}>
          {signedUrl ? (
            <a href={signedUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <img
                src={signedUrl}
                alt={att?.name || "attachment"}
                style={{
                  maxWidth: "100%",
                  maxHeight: 260,
                  borderRadius: 12,
                  display: "block",
                  border: "1px solid #d1d5db",
                }}
              />
            </a>
          ) : (
            <div
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: 12,
                background: "#f9fafb",
                fontSize: 13,
              }}
            >
              Loading image...
            </div>
          )}

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78 }}>
            {att?.name || "Image"} {att?.size ? `• ${formatBytes(att.size)}` : ""}
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${path}-${i}`}
        style={{
          marginTop: 8,
          border: "1px solid #d1d5db",
          borderRadius: 12,
          padding: 10,
          background: "#f9fafb",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13 }}>📎 {att?.name || "File"}</div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78 }}>
          {att?.mime || "Unknown type"} {att?.size ? `• ${formatBytes(att.size)}` : ""}
        </div>
        {signedUrl ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              marginTop: 8,
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Open file
          </a>
        ) : (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Preparing file link...</div>
        )}
      </div>
    );
  }

    const buyerAi = useMemo(() => {
    const cleanMessages = ordered
      .filter((m) => {
        const isSystem = m.sender_role === "system" || m.message_type === "system";
        const isDeleted = Boolean(m.meta?.deleted);
        return !isSystem && !isDeleted;
      })
      .map((m) => String(m.body || "").toLowerCase())
      .join(" ");

    const hasPrice = /₹|rs\.?|price|rate|amount|total|final/.test(cleanMessages);
    const hasDelivery = /deliver|delivery|dispatch|tomorrow|today|time|date/.test(cleanMessages);
    const hasQuantity = /qty|quantity|bag|bags|piece|pieces|kg|ton|cft|sqft|order/.test(cleanMessages);
    const hasInvoice = /invoice|bill|gst|tax/.test(cleanMessages);
    const hasPayment = /payment|advance|cash|upi|bank|pay/.test(cleanMessages);
    const hasLocation = /location|address|site|delivery point|where/.test(cleanMessages);
    const hasNegotiation =
      /discount|less|reduce|better price|best price|final price|negotiate|offer/.test(cleanMessages);

    const hasDeliveryCharge =
      /delivery charge|transport|freight|loading|unloading|extra charge/.test(cleanMessages);

    const score =
      20 +
      (hasPrice ? 18 : 0) +
      (hasDelivery ? 18 : 0) +
      (hasQuantity ? 14 : 0) +
      (hasInvoice ? 10 : 0) +
      (hasPayment ? 10 : 0) +
      (hasLocation ? 10 : 0);

    const negotiationTips: string[] = [];

    if (hasPrice && !hasNegotiation) {
      negotiationTips.push("Ask for a better final price before confirming.");
    }

    if (hasPrice && !hasDeliveryCharge) {
      negotiationTips.push("Check whether delivery / transport charge is included.");
    }

    if (!hasInvoice) {
      negotiationTips.push("Ask for GST bill / invoice to avoid dispute.");
    }

    if (!hasPayment) {
      negotiationTips.push("Do not pay before payment terms are clear.");
    }

    const missing: string[] = [];
    if (!hasPrice) missing.push("final price");
    if (!hasQuantity) missing.push("quantity / brand");
    if (!hasDelivery) missing.push("delivery time");
    if (!hasLocation) missing.push("delivery location");
    if (!hasInvoice) missing.push("invoice / bill");
    if (!hasPayment) missing.push("payment terms");

    const latestVendorMessage = [...ordered]
      .reverse()
      .find(
        (m) =>
          String(m.sender_user_id ?? "") !== String(currentUserId) &&
          m.sender_role !== "system" &&
          m.message_type !== "system" &&
          !m.meta?.deleted &&
          String(m.body || "").trim()
      );

    const latestVendorText = String(latestVendorMessage?.body || "").toLowerCase();

    let suggestedReply = "Please confirm final price, quantity, delivery location, invoice and payment terms before I proceed.";

    if (/deliver|dispatch|tomorrow|today|time/.test(latestVendorText)) {
      suggestedReply = "Okay, please confirm final price including delivery charge, invoice availability and payment terms.";
    } else if (/price|rate|₹|rs/.test(latestVendorText)) {
      suggestedReply = "Thank you. Please confirm whether this is the final price including delivery and GST bill.";
    } else if (/send me|confirm|okay/.test(latestVendorText)) {
      suggestedReply = "Before confirming, please share final price, quantity, delivery location, invoice and payment terms.";
    }

    const stage =
      score >= 80
        ? "Ready to proceed"
        : score >= 60
        ? "Almost ready, details missing"
        : score >= 40
        ? "Negotiation stage"
        : "Early discussion";

    const isReadyToClose =
      score >= 75 && missing.length <= 2;

    return {
      score: Math.min(score, 100),
      stage,
      missing,
      suggestedReply,
      negotiationTips,
      isReadyToClose,
    };
  }, [ordered, currentUserId]);

  useEffect(() => {
    if (!conversationId || !buyerAi.isReadyToClose) return;

    const recentMessages = ordered
      .filter((m) => {
        const isSystem = m.sender_role === "system" || m.message_type === "system";
        const isDeleted = Boolean(m.meta?.deleted);
        return !isSystem && !isDeleted && String(m.body || "").trim();
      })
      .slice(-6)
      .map((m) => ({
        role: m.sender_role === "buyer" ? "buyer" : "vendor",
        body: String(m.body || ""),
      }));

    if (recentMessages.length === 0) return;

    const alertKey = `${conversationId}-${buyerAi.score}-${buyerAi.missing.join("|")}-${recentMessages
      .map((m) => m.body)
      .join("|")}`;

    if (lastHotDealAlertKeyRef.current === alertKey) return;
    lastHotDealAlertKeyRef.current = alertKey;

    const timer = window.setTimeout(() => {
      fetch("/api/ai/vendor-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          side: "buyer",
          trigger: "hot_deal_ready_to_close",
          vendorUserId: vendorUserId || "",
          conversationId,
          rfqId,
          buyerScore: buyerAi.score,
          missing: buyerAi.missing,
          monetization: {
            type: "boost_opportunity",
            priority: "high",
            message: "Buyer is ready to close. Vendor should respond quickly.",
          },
          messages: recentMessages,
        }),
      }).catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    buyerAi.isReadyToClose,
    buyerAi.score,
    buyerAi.missing,
    conversationId,
    rfqId,
    vendorUserId,
    ordered,
  ]);

  function applyBuyerAiAction(action: string) {
    if (action === "Ask missing details") {
      setText(
        buyerAi.missing.length
          ? `Please confirm ${buyerAi.missing.join(", ")} before I proceed.`
          : "Please confirm all final deal details before I proceed."
      );
      return;
    }

    if (action === "Negotiate better price") {
      setText("If I confirm today, please give your best final price. I am ready to proceed if the rate is suitable.");
      return;
    }

    if (action === "Ask bulk discount") {
      setText("For this quantity, can you offer a bulk discount or any better rate?");
      return;
    }

    if (action === "Ask free delivery") {
      setText("Can you include delivery / transport charge within the final price?");
      return;
    }

    if (action === "Ask for invoice") {
      setText("Please confirm whether you can provide GST bill / invoice before dispatch.");
      return;
    }

    if (action === "Confirm delivery") {
      setText("Please confirm exact dispatch time, delivery date and delivery charge.");
      return;
    }

    if (action === "Ask payment terms") {
      setText("Please share payment terms clearly before I proceed.");
      return;
    }

    if (action === "Compare with other vendors") {
      setText("I am comparing with other vendors. Please share your best final price and delivery terms.");
      return;
    }

    setText(buyerAi.suggestedReply);
  }

  function applyBuyerSuggestionToTextarea(suggestion?: string) {
    const value = String(suggestion ?? "").trim();
    if (!value) return;

    setText(value);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  const presenceLabel = isCounterpartTyping
    ? "Typing..."
    : counterpartOnline
    ? "Online"
    : counterpartLastSeenAt
    ? `Last seen ${fmtShortSeen(counterpartLastSeenAt)}`
    : "Offline";

  const presenceColor = isCounterpartTyping
    ? "#2563eb"
    : counterpartOnline
    ? "#16a34a"
    : "#6b7280";

  void presenceTick;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid #e5e7eb",
          background: "#f9fafb",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{props.vendorName}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Vendor</div>
          <div
            style={{
              fontSize: 12,
              marginTop: 2,
              color: presenceColor,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 12,
                background: presenceColor,
                display: "inline-block",
              }}
            />
            {presenceLabel}
          </div>
        </div>

        {vendorPhone ? (
          <a
            href={`tel:${vendorPhone}`}
            style={{
              textDecoration: "none",
              fontWeight: 900,
              border: "1px solid #d1d5db",
              borderRadius: 12,
              padding: "8px 14px",
              color: "#111827",
              background: "#fff",
            }}
          >
            📞 Call
          </a>
        ) : null}
      </div>

        <div
          ref={scrollBoxRef}
          style={{
          padding: 14,
          minHeight: 340,
          maxHeight: 540,
          overflowY: "auto",
          overflowX: "hidden",
          display: "grid",
          gap: 10,
          background: "#f3f4f6",
        }}
      >
        {stickyDate ? (
  <div
    style={{
      position: "relative",
      top: 0,
      zIndex: 1,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        marginTop: 6,
        padding: "6px 12px",
        borderRadius: 12,
        background: "#e5e7eb",
        color: "#374151",
        fontSize: 12,
        fontWeight: 800,
        boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
      }}
    >
      {stickyDate}
    </div>
  </div>
) : null}
        {ordered.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No messages yet.</div>
        ) : (
          ordered.map((m, index) => {
            const mine = m.sender_user_id === currentUserId && m.sender_role !== "system";
            const isSystem = m.sender_role === "system" || m.message_type === "system";
            const attachments = Array.isArray(m.meta?.attachments) ? m.meta?.attachments : [];
            const prev = index > 0 ? ordered[index - 1] : null;
            const showDateDivider =
  !prev ||
  new Date(prev.created_at ?? 0).toDateString() !==
    new Date(m.created_at ?? 0).toDateString();
    const next = index < ordered.length - 1 ? ordered[index + 1] : null;
    

const prevTime = prev?.created_at ? new Date(prev.created_at).getTime() : 0;
const currentTime = m.created_at ? new Date(m.created_at).getTime() : 0;

const prevMine =
  !!prev &&
  String(prev.sender_user_id ?? "") === String(m.sender_user_id ?? "") &&
  prev.sender_role === m.sender_role &&
  prev.message_type !== "system" &&
  m.message_type !== "system" &&
  !showDateDivider &&
  currentTime - prevTime < 5 * 60 * 1000;

const nextTime = next?.created_at ? new Date(next.created_at).getTime() : 0;

const nextMine =
  !!next &&
  String(next.sender_user_id ?? "") === String(m.sender_user_id ?? "") &&
  next.sender_role === m.sender_role &&
  next.message_type !== "system" &&
  m.message_type !== "system" &&
  new Date(next.created_at ?? 0).toDateString() ===
    new Date(m.created_at ?? 0).toDateString() &&
  nextTime - currentTime < 5 * 60 * 1000;
            const seenThisMessage =
              mine &&
              latestOwnMessageId === m.id &&
              !!counterpartLastSeenAt &&
              !!m.created_at &&
              new Date(counterpartLastSeenAt).getTime() >= new Date(m.created_at).getTime();
              const deliveryState = fmtDeliveryStatus({
  mine,
  isLatestOwnMessage: latestOwnMessageId === m.id,
  seenThisMessage,
  counterpartOnline,
  counterpartLastSeenAt,
  createdAt: m.created_at,
});

            if (isSystem) {
              return (
                <div key={m.id} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: "#eef2f7",
                      fontSize: 12,
                      color: "#374151",
                      maxWidth: "85%",
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{ marginTop: 4, fontSize: 11, opacity: 0.6 }}
                    suppressHydrationWarning
                  >
                    {fmtDateTime(m.created_at)}
                  </div>
                </div>
              );
            }

return (
  <React.Fragment key={m.id}>
  {firstUnreadMessageId === m.id ? (
  <div
    ref={unreadDividerRef}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      margin: "10px 0",
    }}
  >
      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: "#dc2626",
          background: "#fff",
          padding: "2px 10px",
          borderRadius: 12,
          border: "1px solid #fecaca",
        }}
      >
        {(() => {
  const unreadCount = ordered.filter((x) => {
    if (String(x.sender_user_id ?? "") === String(currentUserId)) return false;
    if (!x.created_at) return false;
    if (!myLastSeenAt) return true;

    return new Date(x.created_at).getTime() > new Date(myLastSeenAt).getTime();
  }).length;

  return `${unreadCount} Unread Message${unreadCount === 1 ? "" : "s"}`;
})()}
      </div>
      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
    </div>
  ) : null}

<div
  ref={(el) => {
    messageRefs.current[m.id] = el;
  }}
  data-msg-date={getDateDividerLabel(m.created_at)}
  style={{
    display: "flex",
    justifyContent: mine ? "flex-end" : "flex-start",
    marginTop: prevMine ? -2 : 0,
  }}
>
                <div
                  onDoubleClick={(e) => {
                    openActionMenu(m, e.clientX, e.clientY);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openActionMenu(m, e.clientX, e.clientY);
                  }}
                  onMouseEnter={() => {
  if (!m.meta?.deleted) {
    setHoverReactionMessageId(m.id);
  }
}}
onMouseLeave={() => {
  setHoverReactionMessageId((prev) => (prev === m.id ? null : prev));
}}
                  onTouchStart={(e) => {
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }

                    const touch = e.touches[0];

                    typingTimeoutRef.current = setTimeout(() => {
  setHoverReactionMessageId(m.id);
  openActionMenu(m, touch.clientX, touch.clientY);
}, 450);
                  }}
                  onTouchEnd={() => {
                    if (typingTimeoutRef.current) {
                      clearTimeout(typingTimeoutRef.current);
                    }
                  }}
style={{
  maxWidth: "76%",
  position: "relative",
  padding: "10px 12px",
  borderRadius: mine
    ? prevMine && nextMine
      ? "16px 4px 4px 16px"
      : prevMine
      ? "16px 4px 16px 16px"
      : nextMine
      ? "16px 16px 4px 16px"
      : "16px 16px 4px 16px"
    : prevMine && nextMine
    ? "4px 16px 16px 4px"
    : prevMine
    ? "4px 16px 16px 16px"
    : nextMine
    ? "16px 16px 16px 4px"
    : "16px 16px 16px 4px",
  background: mine ? "#dcfce7" : "#ffffff",
  border: "1px solid #e5e7eb",
  outline: highlightedMessageId === m.id ? "2px solid #f59e0b" : "none",
  boxShadow:
    highlightedMessageId === m.id
      ? "0 0 0 4px rgba(245,158,11,0.18)"
      : "0 1px 2px rgba(0,0,0,0.03)",
  marginTop: prevMine ? 2 : 0,
}}
                >
                  {!prevMine ? (
  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4, opacity: 0.8 }}>
    {mine ? "You" : "Vendor"}
  </div>
) : null}

{m.meta?.reply_to ? (
  <div
    onClick={() => jumpToMessage(m.meta?.reply_to?.id)}
    style={{
      marginBottom: m.body ? 8 : 6,
      padding: "8px 10px",
      borderLeft: "3px solid #94a3b8",
      background: "#ffffff",
      borderRadius: 8,
      fontSize: 12,
      cursor: "pointer",
    }}
    title="Jump to original message"
  >
                      <div style={{ fontWeight: 800, marginBottom: 2 }}>
                        {String(m.meta.reply_to.sender_user_id ?? "") === String(currentUserId)
                          ? "You"
                          : "Vendor"}
                      </div>
                      <div
                        style={{
                          opacity: 0.8,
                          whiteSpace: "pre-wrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {String(m.meta.reply_to.body ?? "").trim() || "Message"}
                      </div>
                    </div>
                  ) : null}

                  {m.meta?.deleted ? (
  <div
    style={{
      whiteSpace: "pre-wrap",
      lineHeight: 1.45,
      fontStyle: "italic",
      opacity: 0.65,
    }}
  >
    This message was deleted.
  </div>
) : editingMessageId === m.id ? (
  <div style={{ display: "grid", gap: 8 }}>
    <textarea
      value={editingText}
      onChange={(e) => setEditingText(e.target.value)}
      rows={3}
      style={{
        width: "100%",
        padding: 10,
        borderRadius: 10,
        border: "1px solid #d1d5db",
        resize: "vertical",
        outline: "none",
        background: "#fff",
      }}
    />

    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={cancelEditMessage}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={() => saveEditMessage(m.id)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #bbf7d0",
          background: "#ecfdf5",
          color: "#065f46",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Save
      </button>
    </div>
  </div>
) : m.body ? (
  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{m.body}</div>
) : null}

                  {attachments.length > 0 ? (
                    <div style={{ marginTop: m.body ? 6 : 0 }}>
                      {attachments.map((att, i) => renderAttachment(att, i))}
                    </div>
                  ) : null}

                  {m.meta?.reactions ? (
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {Object.entries(m.meta.reactions).map(([emoji, users]) => {
                        const reactionUsers = Array.isArray(users) ? (users as string[]) : [];
                        const count = reactionUsers.length;
                        if (!count) return null;

                        const reacted = reactionUsers.includes(currentUserId);

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(m, emoji)}
                            style={{
                              borderRadius: 12,
                              border: "1px solid #e5e7eb",
                              background: reacted ? "#dcfce7" : "#fff",
                              padding: "2px 8px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            {emoji} {count}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {hoverReactionMessageId === m.id && !m.meta?.deleted ? (
  <div
    onClick={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      top: -18,
      right: mine ? 8 : "auto",
      left: mine ? "auto" : 8,
      display: "flex",
      gap: 6,
      alignItems: "center",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "4px 6px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
      zIndex: 3,
    }}
  >
    {REACTION_EMOJIS.slice(0, 4).map((emoji) => (
      <button
        key={emoji}
        type="button"
        onClick={async () => {
          await toggleReaction(m, emoji);
          setHoverReactionMessageId(null);
        }}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
        }}
      >
        {emoji}
      </button>
    ))}

    <button
      type="button"
      onClick={(e) => {
  e.stopPropagation();
  setActionMenu({
    message: m,
    x: e.clientX,
    y: e.clientY,
  });
  setShowReactionPicker(true);
  setHoverReactionMessageId(null);
}}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1,
        padding: "2px 4px",
        fontWeight: 900,
      }}
      title="More actions"
    >
      +
    </button>
  </div>
) : null}

<div
  style={{
    marginTop: 6,
    fontSize: 11,
    opacity: 0.72,
    textAlign: "right",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  }}
  suppressHydrationWarning
>
  <span>
    {m.meta?.edited ? "edited • " : ""}
    {fmtDateTime(m.created_at)}
  </span>

  {deliveryState ? (
    <span
      style={{
        fontWeight: 800,
        color: deliveryState.color,
      }}
    >
      {deliveryState.text}
    </span>
  ) : null}
</div>

                </div>
              </div>
            </React.Fragment>
            );
          })
        )}
        <div ref={endRef} />
        {showJumpToLatest ? (
  <button
    onClick={scrollToLatest}
    style={{
      position: "relative",
      bottom: 10,
      marginLeft: "auto",
      marginRight: 10,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid #d1d5db",
      background: "#fff",
      fontWeight: 800,
      fontSize: 12,
      boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
      cursor: "pointer",
      zIndex: 10,
    }}
  >
    ⬇ New Messages
  </button>
) : null}
      </div>

      {actionMenu ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            top: actionMenu.y,
            left: actionMenu.x,
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
            padding: 8,
            minWidth: 180,
          }}
        >
          <div
  style={{
    padding: "6px 12px 8px 12px",
    borderBottom: "1px solid #f1f5f9",
    marginBottom: 6,
  }}
>
  <div
    style={{
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: 0.2,
      color:
        String(actionMenu.message.sender_user_id ?? "") === String(currentUserId)
          ? "#065f46"
          : "#475569",
      textTransform: "uppercase",
    }}
  >
    {String(actionMenu.message.sender_user_id ?? "") === String(currentUserId)
      ? "Your message"
      : "Vendor message"}
  </div>
</div>
          <button
            type="button"
            onClick={() => {
              startReply(actionMenu.message);
              closeActionMenu();
            }}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Reply
          </button>

          {String(actionMenu.message.sender_user_id ?? "") === String(currentUserId) &&
          !(actionMenu.message.meta?.deleted) ? (
            <React.Fragment>
              <button
                type="button"
                onClick={() => startEditMessage(actionMenu.message)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => openDeleteConfirm(actionMenu.message)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "#b91c1c",
                }}
              >
                Delete
              </button>
            </React.Fragment>
          ) : null}
          {deleteConfirmMessage ? (
  <div
    onClick={closeDeleteConfirm}
    style={{
      position: "relative",
      inset: 0,
      background: "rgba(0,0,0,0.28)",
      zIndex: 1100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 360,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
        border: "1px solid #e5e7eb",
        padding: 12,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900 }}>
        Delete message?
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          lineHeight: 1.5,
          color: "#4b5563",
        }}
      >
        This will delete the message for everyone.
      </div>

      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          fontSize: 13,
          maxHeight: 100,
          overflow: "auto",
        }}
      >
        {String(deleteConfirmMessage.body ?? "").trim() || "Attachment / message"}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={closeDeleteConfirm}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => deleteMessageForEveryone(deleteConfirmMessage.id)}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#b91c1c",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Delete for everyone
        </button>
      </div>
    </div>
  </div>
) : null}

          <button
            type="button"
            onClick={() => copyMessageText(actionMenu.message)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Copy
          </button>

          <button
            type="button"
            onClick={() => setShowReactionPicker((v) => !v)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: "transparent",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            React
          </button>

          {showReactionPicker ? (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                padding: "8px 12px 4px 12px",
              }}
            >
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={async () => {
                    await toggleReaction(actionMenu.message, emoji);
                    closeActionMenu();
                  }}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 12,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {isCounterpartTyping ? (
        <div
          style={{
            padding: "8px 12px 0 12px",
            fontSize: 13,
            color: "#2563eb",
            fontStyle: "italic",
            background: "#fff",
          }}
        >
          Vendor is typing...
        </div>
      ) : null}

      <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", background: "#fff" }}>
        <div
          style={{
            marginBottom: 12,
            border: "1px solid #bfdbfe",
            background: "#ffffff",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 950, color: "#1e3a8a" }}>
            🤖 AI Buyer Workflow Assistant
          </div>

          {dealReady ? (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 10,
                background:
                  dealReady.riskLevel === "high"
                    ? "#fff1f2"
                    : dealReady.riskLevel === "medium"
                    ? "#fff7ed"
                    : "#ecfdf5",
                border:
                  dealReady.riskLevel === "high"
                    ? "1px solid #fecaca"
                    : dealReady.riskLevel === "medium"
                    ? "1px solid #fed7aa"
                    : "1px solid #bbf7d0",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <b>{dealReady.stage}</b> • {dealReady.label}

              {dealReady.missing?.length ? (
                <div style={{ marginTop: 4 }}>
                  Missing: {dealReady.missing.slice(0, 3).join(", ")}
                </div>
              ) : null}

              <div style={{ marginTop: 4 }}>
                {dealReady.insight}
              </div>

              <button
                type="button"
                onClick={() => setText(dealReady.actionMessage)}
                style={{
                  marginTop: 6,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {dealReady.actionLabel}
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: 6, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
            <b>{buyerAi.score}%</b> • {buyerAi.stage}
            {buyerAi.missing.length ? (
              <span> — Missing: {buyerAi.missing.slice(0, 4).join(", ")}</span>
            ) : (
              <span> — Major deal details look ready.</span>
            )}
          </div>

          {buyerAi.missing.length > 0 ? (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 10,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                fontSize: 12,
                color: "#9a3412",
                lineHeight: 1.5,
              }}
            >
              ⚠️ Missing critical details:
              <div style={{ marginTop: 4 }}>
                {buyerAi.missing.slice(0, 4).map((m) => (
                  <div key={m}>• {m}</div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 10,
                background: "#ecfdf5",
                border: "1px solid #bbf7d0",
                fontSize: 12,
                color: "#065f46",
                lineHeight: 1.5,
              }}
            >
              ✅ Deal looks safe. Major details are discussed.
            </div>
          )}

                    {buyerAi.negotiationTips.length > 0 ? (
            <div
              style={{
                marginTop: 10,
                padding: "9px 10px",
                borderRadius: 12,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 950, marginBottom: 4 }}>
                🧠 AI Negotiation Tips
              </div>
              {buyerAi.negotiationTips.slice(0, 3).map((tip) => (
                <div key={tip}>• {tip}</div>
              ))}
            </div>
          ) : null}

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 6,
              color: "#1d4ed8",
            }}
          >
            ⚡ AI Suggestions
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {aiLoading ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Thinking...
              </div>
            ) : aiSuggestions.length > 0 ? (
              aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyBuyerSuggestionToTextarea(s)}
                  style={{
                    padding: "7px 11px",
                    borderRadius: 12,
                    border: "1px solid #93c5fd",
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => applyBuyerSuggestionToTextarea(aiSuggestions[0] || buyerAi.suggestedReply)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 12,
                  border: "1px solid #93c5fd",
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ⚡ Smart Suggestion
              </button>
            )}
          </div>
        </div>
            {BUYER_AI_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => applyBuyerAiAction(action)}
                style={{
                  padding: "7px 11px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {buyerAi.isReadyToClose ? (
          <div
            style={{
              marginBottom: 12,
              border: "1px solid #facc15",
              background: "#fefce8",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 950, color: "#92400e" }}>
                🔥 This deal looks ready to close
              </div>

              <div style={{ fontSize: 12, color: "#78350f", marginTop: 4 }}>
                {buyerAi.missing.length > 0
                  ? `Before proceeding, confirm: ${buyerAi.missing.join(", ")}`
                  : "All major deal details are discussed. You can proceed confidently."}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setText(
                  "I am ready to proceed. Please confirm final price, invoice and payment details."
                )
              }
              style={{
                padding: "9px 13px",
                borderRadius: 12,
                border: "1px solid #fde68a",
                background: "#f59e0b",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              ✅ Confirm & Lock Deal
            </button>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => applyQuickReply(q)}
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {replyingTo ? (
          <div
            style={{
              marginBottom: 10,
              border: "1px solid #dbeafe",
              background: "#ffffff",
              borderRadius: 12,
              padding: 10,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#1d4ed8", marginBottom: 4 }}>
                Replying to {getReplyPreviewSender(replyingTo)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#1f2937",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 520,
                }}
              >
                {getReplyPreviewText(replyingTo)}
              </div>
            </div>

            <button
              type="button"
              onClick={cancelReply}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1,
                color: "#334155",
              }}
              title="Cancel reply"
            >
              ×
            </button>
          </div>
        ) : null}

        <div style={{ marginBottom: 10, position: "relative" }}>
          <button
            type="button"
            onClick={(e) => {
  e.stopPropagation();
  setShowEmojiBox((v) => !v);
}}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            😊 Emoji
          </button>

          {showEmojiBox ? (
            <div
            onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "44px",
                left: 0,
                zIndex: 1,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                padding: 10,
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 8,
                minWidth: 220,
              }}
            >
              {COMPOSER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  style={{
                    border: "none",
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1.2,
                    padding: 6,
                    borderRadius: 8,
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);

            void touchMyPresence();
            sendTypingPulse();

            if (typingStopTimeoutRef.current) {
              clearTimeout(typingStopTimeoutRef.current);
            }

            typingStopTimeoutRef.current = setTimeout(() => {
              // passive timeout only
            }, 1500);
          }}
          onFocus={() => {
            setShowEmojiBox(false);
            void markConversationRead();
            void touchMyPresence();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (e.shiftKey) return;

            e.preventDefault();
            void sendMessage();
          }}
          placeholder="Type your message..."
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #d1d5db",
            resize: "vertical",
            outline: "none",
          }}
        />

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => onPickFiles(e.target.files)}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || isRecording}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              fontWeight: 800,
              cursor: loading || isRecording ? "default" : "pointer",
            }}
          >
            📎 Attach File / Image
          </button>

          <button
            type="button"
            onClick={handleMicClick}
            onMouseDown={handleMicPressStart}
            onMouseUp={handleMicPressEnd}
            onMouseLeave={handleMicPressEnd}
            onTouchStart={handleMicPressStart}
            onTouchEnd={handleMicPressEnd}
            disabled={loading}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: isRecording ? "1px solid #fecaca" : "1px solid #d1d5db",
              background: isRecording ? "#fff1f2" : "#fff",
              color: isRecording ? "#b91c1c" : "#111827",
              fontWeight: 800,
              cursor: loading ? "default" : "pointer",
            }}
            title="Tap to start/stop. Hold to record and release to stop."
          >
            {isRecording ? "⏺ Recording..." : "🎤 Voice"}
          </button>

          {selectedFiles.length > 0 ? (
            <button
              type="button"
              onClick={clearSelectedFiles}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#9f1239",
                fontWeight: 800,
                cursor: loading ? "default" : "pointer",
              }}
            >
              Clear Attachments
            </button>
          ) : null}

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Max {MAX_FILES} files, 10 MB each
          </div>
        </div>

        {recordedAudioPreviewUrl ? (
          <div
            style={{
              marginTop: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 10,
              background: "#f9fafb",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
              Voice Message Preview
            </div>

            <audio controls src={recordedAudioPreviewUrl} style={{ width: "100%" }} />

            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={clearRecordedAudio}
                disabled={loading}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#fff1f2",
                  color: "#9f1239",
                  fontWeight: 800,
                  cursor: loading ? "default" : "pointer",
                }}
              >
                Remove Voice
              </button>
            </div>
          </div>
        ) : null}

        {selectedFiles.length > 0 ? (
          <div
            style={{
              marginTop: 10,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 10,
              background: "#f9fafb",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
              Selected Attachments ({selectedFiles.length})
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {selectedFiles.map((file, index) => {
                const previewKey = `${file.name}-${file.size}-${file.lastModified}`;
                const previewUrl = selectedFilePreviewUrls[previewKey] || "";

                return (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 8,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          style={{
                            width: 52,
                            height: 52,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#f3f4f6",
                            flexShrink: 0,
                            fontSize: 18,
                          }}
                        >
                          📄
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                          }}
                        >
                          {file.name}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.72 }}>
                          {file.type || "Unknown type"} • {formatBytes(file.size)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      disabled={loading}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#9f1239",
                        fontWeight: 800,
                        cursor: loading ? "default" : "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>

            {failedTextRetry ? (
              <button
                type="button"
                onClick={retryFailedTextSend}
                disabled={loading}
                style={{
                  padding: "6px 10px",
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                  background: "#fff1f2",
                  color: "#b91c1c",
                  fontWeight: 800,
                  cursor: loading ? "default" : "pointer",
                  fontSize: 12,
                }}
              >
                Retry failed text
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => applyBuyerSuggestionToTextarea(buyerAi.suggestedReply)}
              disabled={loading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #fed7aa",
                background: "#fff7ed",
                color: "#c2410c",
                fontWeight: 900,
                cursor: loading ? "default" : "pointer",
              }}
            >
              ⚡ Use AI Suggestion
            </button>

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: "#ecfdf5",
                color: "#065f46",
                fontWeight: 900,
                cursor: loading ? "default" : "pointer",
              }}
            >
            {loading
              ? "Sending..."
              : selectedFiles.length > 0 || recordedAudioFile
              ? "Send Message + Media"
              : "Send Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}