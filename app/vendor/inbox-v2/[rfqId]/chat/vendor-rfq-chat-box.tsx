"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ConversationMessageList from "@/app/components/chat/ConversationMessageList";
import ConversationComposer from "@/app/components/chat/ConversationComposer";
import ConversationActionMenu from "@/app/components/chat/ConversationActionMenu";
import ConversationDeleteConfirm from "@/app/components/chat/ConversationDeleteConfirm";

type AttachmentRow = {
  kind?: "image" | "file" | "audio";
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

function toDisplayRole(role?: string | null) {
  const value = String(role ?? "").trim();
  if (!value) return "User";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeConversationMessageRow(row: any): MsgRow | null {
  if (!row?.id) return null;

  return {
    id: String(row.id),
    sender_user_id: String(row.sender_user_id ?? ""),
    sender_role: String(row.sender_role ?? ""),
    message_type: String(row.message_type ?? "text"),
    body: String(row.body ?? ""),
    meta: row.meta && typeof row.meta === "object" ? row.meta : {},
    created_at: row.created_at ?? null,
  };
}

function sortMessages(messages: MsgRow[]) {
  return [...messages].sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return at - bt;
  });
}

function mergeMessageLists(existing: MsgRow[], incoming: MsgRow[]) {
  const map = new Map<string, MsgRow>();

  for (const msg of existing) {
    map.set(String(msg.id), msg);
  }

  for (const msg of incoming) {
    const id = String(msg.id);
    const prev = map.get(id);

    map.set(id, {
      ...(prev ?? {}),
      ...msg,
      meta: msg.meta ?? prev?.meta ?? {},
    });
  }

  return sortMessages(Array.from(map.values()));
}

function upsertMessageInList(existing: MsgRow[], incoming: MsgRow) {
  return mergeMessageLists(existing, [incoming]);
}

function updateMessageInList(
  existing: MsgRow[],
  messageId: string,
  updater: (msg: MsgRow) => MsgRow
) {
  return existing.map((m) =>
    String(m.id) === String(messageId) ? updater(m) : m
  );
}

function removeMessageFromList(existing: MsgRow[], messageId: string) {
  return existing.filter((m) => String(m.id) !== String(messageId));
}

function buildMessagesSignature(messages: MsgRow[]) {
  return messages
    .map(
      (m) =>
        `${String(m.id)}:${String(m.body ?? "")}:${String(
          m.message_type ?? ""
        )}:${JSON.stringify(m.meta ?? {})}:${String(m.created_at ?? "")}`
    )
    .join("|");
}

type ConversationParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string | null;
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

const REACTION_EMOJIS = ["👍","❤️","😂","😮","😢","👎"];
const COMPOSER_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "❤️", "😮", "😢", "🎉", "🔥"];
const QUICK_REPLIES = [
  "Hello",
  "I am checking and will update shortly.",
  "Material is ready.",
  "Dispatching tomorrow.",
  "Please share delivery location.",
  "Please call me.",
];

const CHAT_BUCKET = "rfq_chat_attachments";
const MAX_FILES = 5;
const ONLINE_WINDOW_MS = 45_000;
const POLL_INTERVAL_MS = 2500;
const HEARTBEAT_INTERVAL_MS = 15000;

export default function VendorRfqChatBox(props: {
  rfqId: string;
  conversationId: string;
  currentUserId: string;
  buyerName?: string;
  buyerPhone?: string | null;
  participantName?: string;
  participantPhone?: string | null;
  initialMessages: MsgRow[];
}) {
  const {
    rfqId,
    conversationId,
    currentUserId,
    initialMessages,
    buyerPhone,
    participantPhone,
  } = props;

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
  const [err, setErr] = useState("");
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
  const lastAutoScrollMessageIdRef = useRef<string>("");

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
    setMessages(initialMessages ?? []);
    setDidAutoScrollToUnread(false);
    setFirstUnreadMessageId(null);
    setStickyDate("");
    lastAutoScrollMessageIdRef.current = "";
    isNearBottomRef.current = true;
  }, [conversationId]);
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
    if (!initialMessages?.length) return;

    setMessages((prev) => mergeMessageLists(prev, initialMessages));
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
    if (!ordered.length) return;

    const lastMessage = ordered[ordered.length - 1];
    const lastMessageId = String(lastMessage?.id ?? "");

    if (!lastMessageId) return;

    const alreadyHandled =
      String(lastAutoScrollMessageIdRef.current) === lastMessageId;

    if (alreadyHandled) return;

    const mine =
      String(lastMessage?.sender_user_id ?? "") === String(currentUserId);

    const shouldScroll = mine || isNearBottomRef.current;

    if (!shouldScroll) {
      lastAutoScrollMessageIdRef.current = lastMessageId;
      return;
    }

    window.setTimeout(() => {
      endRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 40);

    lastAutoScrollMessageIdRef.current = lastMessageId;
  }, [ordered, currentUserId]);
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
    setMessages((prev) => upsertMessageInList(prev, next));
  }

  function updateMessageById(messageId: string, updater: (msg: MsgRow) => MsgRow) {
    setMessages((prev) => updateMessageInList(prev, messageId, updater));
  }

  function removeMessageById(messageId: string) {
    setMessages((prev) => removeMessageFromList(prev, messageId));
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
      const merged = mergeMessageLists(prev, next);

      const prevSignature = buildMessagesSignature(prev);
      const nextSignature = buildMessagesSignature(merged);

      if (prevSignature === nextSignature) return prev;
      return merged;
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
      const { data } = await supabase
        .from("conversation_participants")
        .select("conversation_id,user_id,role,last_read_at")
        .eq("conversation_id", conversationId);

      const rows = (data ?? []) as ConversationParticipantRow[];

      const counterpart = rows.find(
        (row) => String(row.user_id ?? "") !== String(currentUserId)
      );

      setCounterpartLastSeenAt(counterpart?.last_read_at ?? null);
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

      if (!effectivelyOnline) {
        setCounterpartLastSeenAt((prev) => presence?.last_active_at ?? prev ?? null);
      }
    } catch {
      setCounterpartOnline(false);
    }
  }

  async function loadLatestConversationMessages() {
    if (!conversationId) return;

    try {
      const { data } = await supabase
        .from("conversation_messages")
        .select("id,sender_user_id,sender_role,message_type,body,meta,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      const rows = ((data ?? [])
        .map((row) => normalizeConversationMessageRow(row))
        .filter(Boolean)) as MsgRow[];

      if (!rows.length) return;

      const prevOrdered = orderedRef.current;
      const prevLastId = prevOrdered.length
        ? String(prevOrdered[prevOrdered.length - 1]?.id ?? "")
        : "";
      const nextLastId = String(rows[rows.length - 1]?.id ?? "");

      replaceAllMessages(rows);

      const newest = rows[rows.length - 1];
      const isIncoming =
        String(newest?.sender_user_id ?? "") !== String(currentUserId);

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

  function sendTypingStart() {
    if (!typingChannelRef.current) return;

    try {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing:start",
        payload: {
          user: currentUserId,
          at: new Date().toISOString(),
          conversation_id: conversationId,
        },
      });
    } catch {}
  }

  function sendTypingStop() {
    if (!typingChannelRef.current) return;

    try {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing:stop",
        payload: {
          user: currentUserId,
          at: new Date().toISOString(),
          conversation_id: conversationId,
        },
      });
    } catch {}
  }

  useEffect(() => {
  void markConversationRead();
  void loadMyReadStatus();
  void loadCounterpartReadStatus();
  void loadCounterpartPresence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;

    const messageChannel = supabase
      .channel(`conversation-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const row = normalizeConversationMessageRow(payload?.new);
          if (!row?.id) return;

          upsertMessage(row);

          const isIncoming =
            String(row.sender_user_id ?? "") !== String(currentUserId);

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
          event: "UPDATE",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const row = normalizeConversationMessageRow(payload?.new);
          if (!row?.id) return;

          updateMessageById(row.id, (prev) => ({
            ...prev,
            body: row.body,
            message_type: row.message_type,
            meta: row.meta ?? prev.meta ?? {},
            created_at: row.created_at ?? prev.created_at,
            sender_role: row.sender_role || prev.sender_role,
            sender_user_id: row.sender_user_id || prev.sender_user_id,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const row = payload?.old;
          const messageId = String(row?.id ?? "");
          if (!messageId) return;

          removeMessageById(messageId);
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
          if (String(row.user_id ?? "") === String(currentUserId)) return;

          setCounterpartLastSeenAt(row.last_read_at ?? null);
          await loadCounterpartPresence();
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`conversation-typing-${conversationId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "typing:start" }, () => {
        setIsCounterpartTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setIsCounterpartTyping(false);
        }, 3000);
      })
      .on("broadcast", { event: "typing:stop" }, () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        setIsCounterpartTyping(false);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    pollTimerRef.current = setInterval(() => {
      void loadCounterpartReadStatus();
      void loadCounterpartPresence();
    }, POLL_INTERVAL_MS);

    heartbeatTimerRef.current = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        (typeof document.hasFocus !== "function" || document.hasFocus())
      ) {
        void markConversationRead();
      }
    }, HEARTBEAT_INTERVAL_MS);

    void loadLatestConversationMessages();

    return () => {
      stopTitleFlash();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (typingStopTimeoutRef.current) {
        clearTimeout(typingStopTimeoutRef.current);
      }

      sendTypingStop();

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }

      if (presenceTimerRef.current) {
        clearInterval(presenceTimerRef.current);
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
  void loadMyReadStatus();
  void loadCounterpartReadStatus();
  void loadCounterpartPresence();
  stopTitleFlash();
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    void markConversationRead();
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
        .channel(`conversation-presence-${conversationId}-${counterpartUserId}`)
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

    if (String(message.sender_user_id ?? "") === String(currentUserId)) {
      return "You";
    }

    const role = String(message.sender_role ?? "").trim();
    if (!role) return "Other user";

    return role.charAt(0).toUpperCase() + role.slice(1);
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
      .eq("id", message.id)
      .eq("conversation_id", conversationId);

    if (error) return;

    updateMessageById(message.id, (m) => ({
      ...m,
      meta: {
        ...(m.meta || {}),
        reactions: nextReactions,
      },
    }));
  } catch {}
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
        return;
      }

      upsertMessage({
        id: json.id,
        sender_user_id: currentUserId,
        sender_role: "vendor",
        message_type: json?.message_type ?? (hasFiles ? "file" : "text"),
        body: json?.body ?? body,
        created_at: json.created_at ?? new Date().toISOString(),
        meta: json?.meta ?? {},
      });

      isNearBottomRef.current = true;

      window.setTimeout(() => {
        endRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 30);

      sendTypingStop();
      setText("");
      clearSelectedFiles();
      clearRecordedAudio();
      setReplyingTo(null);
      setShowEmojiBox(false);
      setIsCounterpartTyping(false);
      await markConversationRead();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send message.");
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

  const counterpartRoleLabel = toDisplayRole(
    ordered.find(
      (m) => String(m.sender_user_id ?? "") !== String(currentUserId)
    )?.sender_role || "buyer"
  );

  const headerParticipantName =
    String(props.participantName ?? "").trim() ||
    String(props.buyerName ?? "").trim() ||
    counterpartRoleLabel;

  const headerParticipantPhone =
    String(participantPhone ?? "").trim() || String(buyerPhone ?? "").trim();

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
          <div style={{ fontWeight: 900, fontSize: 16 }}>{headerParticipantName}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{counterpartRoleLabel}</div>
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
                borderRadius: 999,
                background: presenceColor,
                display: "inline-block",
              }}
            />
            {presenceLabel}
          </div>
        </div>

        {headerParticipantPhone ? (
          <a
            href={`tel:${headerParticipantPhone}`}
            style={{
              textDecoration: "none",
              fontWeight: 900,
              border: "1px solid #d1d5db",
              borderRadius: 999,
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
      position: "sticky",
      top: 0,
      zIndex: 20,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        marginTop: 6,
        padding: "6px 12px",
        borderRadius: 999,
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
        <ConversationMessageList
          ordered={ordered}
          currentUserId={currentUserId}
          firstUnreadMessageId={firstUnreadMessageId}
          unreadDividerRef={unreadDividerRef}
          messageRefs={messageRefs}
          highlightedMessageId={highlightedMessageId}
          hoverReactionMessageId={hoverReactionMessageId}
          setHoverReactionMessageId={setHoverReactionMessageId}
          latestOwnMessageId={latestOwnMessageId}
          counterpartLastSeenAt={counterpartLastSeenAt}
          counterpartOnline={counterpartOnline}
          myLastSeenAt={myLastSeenAt}
          openActionMenu={openActionMenu}
          jumpToMessage={jumpToMessage}
          toggleReaction={toggleReaction}
          setActionMenu={setActionMenu}
          setShowReactionPicker={setShowReactionPicker}
          editingMessageId={editingMessageId}
          editingText={editingText}
          setEditingText={setEditingText}
          cancelEditMessage={cancelEditMessage}
          saveEditMessage={saveEditMessage}
          renderAttachment={renderAttachment}
          fmtDateTime={fmtDateTime}
          getDateDividerLabel={getDateDividerLabel}
          toDisplayRole={toDisplayRole}
          REACTION_EMOJIS={REACTION_EMOJIS}
        />
        <div ref={endRef} />
        {showJumpToLatest ? (
  <button
    onClick={scrollToLatest}
    style={{
      position: "sticky",
      bottom: 10,
      marginLeft: "auto",
      marginRight: 10,
      padding: "8px 12px",
      borderRadius: 999,
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

      <ConversationActionMenu
        actionMenu={actionMenu}
        currentUserId={currentUserId}
        showReactionPicker={showReactionPicker}
        setShowReactionPicker={setShowReactionPicker}
        startReply={startReply}
        closeActionMenu={closeActionMenu}
        startEditMessage={startEditMessage}
        openDeleteConfirm={openDeleteConfirm}
        copyMessageText={copyMessageText}
        toggleReaction={toggleReaction}
        toDisplayRole={toDisplayRole}
        REACTION_EMOJIS={REACTION_EMOJIS}
      />

      <ConversationDeleteConfirm
        deleteConfirmMessage={
          deleteConfirmMessage
            ? {
                id: deleteConfirmMessage.id,
                body: String(deleteConfirmMessage.body ?? ""),
              }
            : null
        }
        closeDeleteConfirm={closeDeleteConfirm}
        deleteMessageForEveryone={deleteMessageForEveryone}
      />

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
          {counterpartRoleLabel} is typing...
        </div>
      ) : null}

      <ConversationComposer
        QUICK_REPLIES={QUICK_REPLIES}
        COMPOSER_EMOJIS={COMPOSER_EMOJIS}
        MAX_FILES={MAX_FILES}
        text={text}
        setText={setText}
        showEmojiBox={showEmojiBox}
        setShowEmojiBox={setShowEmojiBox}
        replyingTo={replyingTo}
        getReplyPreviewSender={getReplyPreviewSender}
        getReplyPreviewText={getReplyPreviewText}
        cancelReply={cancelReply}
        insertEmoji={insertEmoji}
        sendTypingStart={sendTypingStart}
        sendTypingStop={sendTypingStop}
        typingStopTimeoutRef={typingStopTimeoutRef}
        markConversationRead={markConversationRead}
        sendMessage={sendMessage}
        loading={loading}
        fileInputRef={fileInputRef}
        onPickFiles={onPickFiles}
        isRecording={isRecording}
        handleMicClick={handleMicClick}
        handleMicPressStart={handleMicPressStart}
        handleMicPressEnd={handleMicPressEnd}
        clearSelectedFiles={clearSelectedFiles}
        selectedFiles={selectedFiles}
        recordedAudioFile={recordedAudioFile}
        recordedAudioPreviewUrl={recordedAudioPreviewUrl}
        clearRecordedAudio={clearRecordedAudio}
        selectedFilePreviewUrls={selectedFilePreviewUrls}
        removeSelectedFile={removeSelectedFile}
        formatBytes={formatBytes}
        err={err}
        applyQuickReply={applyQuickReply}
      />
    </div>
  );
}