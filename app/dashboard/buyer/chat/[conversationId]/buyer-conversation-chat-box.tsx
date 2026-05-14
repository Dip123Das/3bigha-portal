"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { clearInboxReminder } from "@/lib/inbox/clearInboxReminder";
import ConversationMessageList from "@/app/components/chat/ConversationMessageList";
import ConversationComposer from "@/app/components/chat/ConversationComposer";
import ConversationActionMenu from "@/app/components/chat/ConversationActionMenu";
import DealScoreClient from "@/app/components/ai/DealScoreClient";
import DealReadyClient from "@/app/components/ai/DealReadyClient";
import ConversationDeleteConfirm from "@/app/components/chat/ConversationDeleteConfirm";
import {
  fmtBubbleTime,
  fmtShortSeen,
  sortMessagesByCreatedAt,
  upsertUniqueMessage,
  replaceMessageById,
  markConversationSeen,
  loadConversationCounterpartReadState,
  getMessageAttachments,
  getReplyMeta,
  getReactionMap,
  formatFileSize,
  type MsgRow,
  type ConversationAttachmentMeta,
} from "@/lib/conversations/chat-client-shared";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👎"];
const COMPOSER_EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "❤️", "😮", "😢", "🎉", "🔥"];
const QUICK_REPLIES = [
  "Hello",
  "Please share more details.",
  "This is available.",
  "Please call me.",
  "Thank you.",
];

const CHAT_MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

function validateChatAttachment(file: File) {
  const type = String(file.type || "").toLowerCase();

  const allowed =
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf";

  if (!allowed) return "Only images, videos, audio and PDF files are allowed.";
  if (file.size > CHAT_MAX_ATTACHMENT_SIZE) return "Attachment is too large. Please keep it under 25 MB.";

  return "";
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

function isDuplicateMessage(existing: MsgRow[], incoming: MsgRow) {
  if (!incoming?.created_at) return false;

  const incomingTime = new Date(incoming.created_at).getTime();

  return existing.some((m) => {
    if (!m?.created_at) return false;

    const t = new Date(m.created_at).getTime();

    return (
      String(m.sender_user_id) === String(incoming.sender_user_id) &&
      String(m.body ?? "") === String(incoming.body ?? "") &&
      String(m.message_type ?? "") === String(incoming.message_type ?? "") &&
      Math.abs(t - incomingTime) < 3000
    );
  });
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

function isGroupedWithPrevious(prev?: MsgRow, curr?: MsgRow) {
  if (!prev || !curr) return false;
  if (!isSameDay(prev.created_at, curr.created_at)) return false;
  if (prev.sender_role === "system" || curr.sender_role === "system") return false;
  if (prev.message_type === "system" || curr.message_type === "system") return false;
  return String(prev.sender_user_id ?? "") === String(curr.sender_user_id ?? "");
}

function isMessageAfterCutoff(messageAt?: string | null, cutoffAt?: string | null) {
  if (!messageAt || !cutoffAt) return false;
  try {
    return new Date(messageAt).getTime() > new Date(cutoffAt).getTime();
  } catch {
    return false;
  }
}

function isMessageSeenByCounterpart(message?: MsgRow | null, counterpartLastReadAt?: string | null) {
  if (!message?.created_at || !counterpartLastReadAt) return false;
  try {
    return new Date(message.created_at).getTime() <= new Date(counterpartLastReadAt).getTime();
  } catch {
    return false;
  }
}

function canAttemptNotificationSound() {
  if (typeof window === "undefined") return false;
  return typeof window.Audio !== "undefined" || typeof window.AudioContext !== "undefined";
}

function isImageAttachment(att?: ConversationAttachmentMeta) {
  const mime = String(att?.mime_type ?? att?.mime ?? "").toLowerCase();
  const kind = String(att?.kind ?? "").toLowerCase();
  return kind === "image" || mime.startsWith("image/");
}

function isAudioAttachment(att?: ConversationAttachmentMeta) {
  const mime = String(att?.mime_type ?? att?.mime ?? "").toLowerCase();
  const kind = String(att?.kind ?? "").toLowerCase();
  return kind === "audio" || mime.startsWith("audio/");
}

function getAttachmentUrl(att?: ConversationAttachmentMeta) {
  return String(att?.file_url ?? att?.url ?? "").trim();
}

function getAttachmentName(att?: ConversationAttachmentMeta) {
  return String(att?.name ?? "Attachment").trim() || "Attachment";
}

function getAttachmentMime(att?: ConversationAttachmentMeta) {
  return String(att?.mime_type ?? att?.mime ?? "").trim();
}

function getAttachmentSize(att?: ConversationAttachmentMeta) {
  const raw = att?.file_size ?? att?.size ?? null;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function renderAttachment(att: ConversationAttachmentMeta, i: number) {
  const url = getAttachmentUrl(att);
  const name = getAttachmentName(att);
  const mime = getAttachmentMime(att);
  const size = getAttachmentSize(att);

  if (isAudioAttachment(att)) {
    return (
      <div
        key={`${url || name}-${i}`}
        style={{
          marginTop: 8,
          border: "1px solid #d1d5db",
          borderRadius: 12,
          padding: 10,
          background: "#f9fafb",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🎤 Voice message</div>

        {url ? (
          <audio controls src={url} style={{ width: "100%" }} />
        ) : (
          <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>Audio unavailable</div>
        )}

        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78 }}>
          {name}
          {mime ? ` • ${mime}` : ""}
          {size != null ? ` • ${formatFileSize(size)}` : ""}
        </div>
      </div>
    );
  }

  if (isImageAttachment(att)) {
    return (
      <div key={`${url || name}-${i}`} style={{ marginTop: 8 }}>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <img
              src={url}
              alt={name}
              style={{
                maxWidth: "100%",
                maxHeight: 260,
                borderRadius: 12,
                display: "block",
                border: "1px solid #d1d5db",
                background: "#fff",
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
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            Image unavailable
          </div>
        )}

        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.78 }}>
          {name}
          {mime ? ` • ${mime}` : ""}
          {size != null ? ` • ${formatFileSize(size)}` : ""}
        </div>
      </div>
    );
  }

  return (
    <div
      key={`${url || name}-${i}`}
      style={{
        marginTop: 8,
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: 10,
        background: "#f9fafb",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 13 }}>📎 {name}</div>
      <div style={{ marginTop: 4, fontSize: 12, opacity: 0.78 }}>
        {mime || "Unknown type"}
        {size != null ? ` • ${formatFileSize(size)}` : ""}
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 13,
            fontWeight: 800,
            textDecoration: "none",
            color: "#1d4ed8",
          }}
        >
          Open file
        </a>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
          Attachment unavailable
        </div>
      )}
    </div>
  );
}

function getReplyPreviewText(message?: MsgRow | null) {
  if (!message) return "Message";

  const body = String(message.body ?? "").trim();
  if (body) return body.length > 120 ? `${body.slice(0, 120)}…` : body;

  const attachments = getMessageAttachments(message);
  if (attachments.length > 0) {
    const first = attachments[0];
    if (isAudioAttachment(first)) return "🎤 Voice message";
    if (isImageAttachment(first)) return "📷 Image";
    return "📎 Attachment";
  }

  return "Message";
}

function getReplyPreviewSender(message: MsgRow | null, currentUserId: string, counterpartName: string) {
  if (!message) return "";
  return String(message.sender_user_id ?? "") === String(currentUserId) ? "You" : counterpartName;
}

function createTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toDisplayRole(role?: string | null) {
  const value = String(role ?? "").trim();
  if (!value) return "User";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getBuyerAgentIntelligence(messages: MsgRow[]) {
  const visibleMessages = messages.filter((m) => {
    const isSystem = m.sender_role === "system" || m.message_type === "system";
    const isDeleted = Boolean(m.meta?.deleted);
    return !isSystem && !isDeleted;
  });

  const text = visibleMessages.map((m) => String(m.body || "")).join(" ").toLowerCase();
  const last = visibleMessages[visibleMessages.length - 1] || null;
  const lastAgeHours = last?.created_at
    ? (Date.now() - new Date(last.created_at).getTime()) / (1000 * 60 * 60)
    : 999;

  const hasPrice = /₹|rs\.?|price|rate|quote|total|amount|cost/.test(text);
  const hasTimeline = /delivery|deliver|timeline|date|today|tomorrow|days|schedule/.test(text);
  const hasPayment = /payment|advance|upi|cash|bank|gst|invoice|bill/.test(text);
  const hasCommitment = /confirm|final|ok|done|accept|agree|book|ready/.test(text);
  const hasRisk = /delay|later|problem|issue|not possible|unavailable|cancel/.test(text);

  let agentScore = 25;
  if (visibleMessages.length >= 2) agentScore += 15;
  if (hasPrice) agentScore += 18;
  if (hasTimeline) agentScore += 15;
  if (hasPayment) agentScore += 12;
  if (hasCommitment) agentScore += 18;
  if (hasRisk) agentScore -= 18;
  if (lastAgeHours > 48) agentScore -= 8;

  agentScore = Math.max(1, Math.min(100, Math.round(agentScore)));

  const lifecycleStage =
    hasCommitment
      ? "Final confirmation"
      : hasPrice && hasTimeline
      ? "Terms negotiation"
      : hasPrice
      ? "Timeline/payment collection"
      : visibleMessages.length > 0
      ? "Discovery"
      : "Not started";

  const workflowRisk =
    hasRisk || lastAgeHours > 72 ? "High" : lastAgeHours > 36 ? "Medium" : "Low";

  const supplierReliability =
    agentScore >= 75 ? "Strong" : agentScore >= 45 ? "Moderate" : "Weak";

  const autonomousAction =
    hasCommitment
      ? "Confirm final price, delivery/work timeline, GST/invoice and payment terms before marking the deal."
      : hasPrice && hasTimeline
      ? "Ask for payment/GST terms and final confirmation."
      : hasPrice
      ? "Ask vendor to confirm delivery/work timeline and availability."
      : lastAgeHours > 48
      ? "Send a follow-up to revive this negotiation."
      : "Ask vendor to confirm price, availability, timeline and hidden charges.";

  const escalationSignal =
    workflowRisk === "High"
      ? "Escalation recommended if vendor does not reply soon."
      : workflowRisk === "Medium"
      ? "Keep this thread warm with a short follow-up."
      : "No immediate escalation needed.";

  const suggestedReply =
    hasCommitment
      ? "Please confirm the final price, delivery/work date, GST/invoice and payment terms so we can close this."
      : hasPrice
      ? "Please confirm delivery timeline, availability, GST/invoice and payment terms."
      : "Please share final price, availability, delivery/work timeline and payment terms.";

  return {
    agentScore,
    lifecycleStage,
    workflowRisk,
    supplierReliability,
    autonomousAction,
    escalationSignal,
    suggestedReply,
  };
}

export default function BuyerConversationChatBox(props: {
  conversationId: string;
  currentUserId: string;
  counterpartName: string;
  counterpartPhone?: string | null;
  contextType?: string;
  contextTitle?: string;
  initialMessages: MsgRow[];
  initialUnreadCutoffAt?: string | null;
}) {
  const {
    conversationId,
    currentUserId,
    counterpartName,
    counterpartPhone,
    contextType,
    contextTitle,
    initialMessages,
    initialUnreadCutoffAt,
  } = props;

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [messages, setMessages] = useState<MsgRow[]>(initialMessages);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordedAudioFile, setRecordedAudioFile] = useState<File | null>(null);
  const [recordedAudioPreviewUrl, setRecordedAudioPreviewUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isHoldRecording, setIsHoldRecording] = useState(false);
  const [err, setErr] = useState("");
  const [counterpartLastReadAt, setCounterpartLastReadAt] = useState<string | null>(null);
  const [counterpartOnline, setCounterpartOnline] = useState(false);
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MsgRow | null>(null);
  const [showEmojiBox, setShowEmojiBox] = useState(false);
  const [actionMenu, setActionMenu] = useState<{ message: MsgRow; x: number; y: number } | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<MsgRow | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [hoverReactionMessageId, setHoverReactionMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [windowFocused, setWindowFocused] = useState(true);

  const listRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<any>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipClickAfterHoldRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const documentTitleRef = useRef<string>("");
  const titleFlashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInitialScrollRef = useRef(false);
  const wasNearBottomRef = useRef(true);
  const previousCountRef = useRef(initialMessages?.length ?? 0);

  const ordered = useMemo(() => sortMessagesByCreatedAt(messages), [messages]);

  const dealScoreMessages = useMemo(() => {
    return ordered
      .filter((m) => {
        const isSystem = m.sender_role === "system" || m.message_type === "system";
        const isDeleted = Boolean(m.meta?.deleted);
        return !isSystem && !isDeleted;
      })
      .map((m) => ({
        role: String(m.sender_role || "user"),
        body: String(m.body || ""),
      }));
  }, [ordered]);

  const buyerAgent = useMemo(() => {
    return getBuyerAgentIntelligence(ordered);
  }, [ordered]);

  const canSend = text.trim().length > 0 && !loading && !uploading;

    const presenceLabel = isCounterpartTyping
    ? "Typing..."
    : counterpartOnline
    ? "Online"
    : counterpartLastReadAt
    ? `Last seen ${fmtShortSeen(counterpartLastReadAt)}`
    : "Offline";

  const presenceColor = isCounterpartTyping
    ? "#2563eb"
    : counterpartOnline
    ? "#16a34a"
    : "#6b7280";

  const lastOwnVisibleMessageId = useMemo(() => {
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      const m = ordered[i];
      const mine = String(m.sender_user_id ?? "") === String(currentUserId);
      const isSystem = m.sender_role === "system" || m.message_type === "system";
      if (!mine || isSystem || m.meta?.deleted) continue;
      return m.id;
    }
    return null;
  }, [ordered, currentUserId]);

  const unreadDividerMessageId = useMemo(() => {
    if (!initialUnreadCutoffAt) return null;

    const firstUnreadIncoming = ordered.find((m) => {
      const mine = String(m.sender_user_id ?? "") === String(currentUserId);
      const isSystem = m.sender_role === "system" || m.message_type === "system";
      if (mine || isSystem) return false;
      return isMessageAfterCutoff(m.created_at, initialUnreadCutoffAt);
    });

    return firstUnreadIncoming?.id ?? null;
  }, [ordered, currentUserId, initialUnreadCutoffAt]);

  useEffect(() => {
    setMessages(initialMessages ?? []);
  }, [initialMessages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text, editingText]);

  function checkIfNearBottom() {
    const el = listRef.current;
    if (!el) return true;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceFromBottom < 80;
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    endRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  function canAutoMarkSeenNow() {
    if (typeof document === "undefined") return false;
    return windowFocused && document.visibilityState === "visible" && wasNearBottomRef.current;
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

  useEffect(() => {
    const newCount = ordered.length;
    const previousCount = previousCountRef.current;
    const hasNewMessage = newCount > previousCount;

    if (!didInitialScrollRef.current) {
      scrollToBottom("auto");
      didInitialScrollRef.current = true;
      setShowJumpToLatest(false);
      previousCountRef.current = newCount;
      return;
    }

    if (hasNewMessage) {
      if (wasNearBottomRef.current) {
        scrollToBottom("smooth");
        setShowJumpToLatest(false);
      } else {
        setShowJumpToLatest(true);
      }
    }

    previousCountRef.current = newCount;
  }, [ordered]);

  async function markSeen() {
    const latestVisibleMessageId =
      ordered.length > 0 ? String(ordered[ordered.length - 1]?.id ?? "").trim() || undefined : undefined;

    await markConversationSeen(conversationId, currentUserId, latestVisibleMessageId);
  }

    async function loadReadState() {
      if (!conversationId) return;

      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read-state`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) return;

        setCounterpartLastReadAt(json?.counterpartLastReadAt ?? null);

        const participants = Array.isArray(json?.participants) ? json.participants : [];
        const counterpart = participants.find(
          (p: any) => String(p.user_id ?? "") !== String(currentUserId)
        );

        setCounterpartOnline(Boolean(counterpart?.is_online));
      } catch {}
    }

  function upsertMessage(next: MsgRow) {
    setMessages((prev) => upsertUniqueMessage(prev, next));
  }

  function replaceMessage(next: MsgRow) {
    setMessages((prev) => replaceMessageById(prev, next));
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

  function closeActionMenu() {
    setActionMenu(null);
    setShowReactionPicker(false);
    setHoverReactionMessageId(null);
  }

    function stopTitleFlash() {
    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }

    if (typeof document !== "undefined" && documentTitleRef.current) {
      document.title = documentTitleRef.current;
    }
  }

  function flashWindowTitle() {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible" && windowFocused) return;

    if (!documentTitleRef.current) {
      documentTitleRef.current = document.title;
    }

    if (titleFlashIntervalRef.current) return;

    let toggle = false;
    titleFlashIntervalRef.current = setInterval(() => {
      toggle = !toggle;
      document.title = toggle
        ? `New message • ${counterpartName}`
        : documentTitleRef.current || "Chat";
    }, 1000);
  }

    async function playIncomingSound() {
    if (!canAttemptNotificationSound()) return;

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise) {
          await playPromise;
          return;
        }
      }
    } catch {}

    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 880;

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }

  function stopTypingIndicator() {
    setIsCounterpartTyping(false);
  }

  function openActionMenu(message: MsgRow, x: number, y: number) {
    setActionMenu({ message, x, y });
    setShowReactionPicker(false);
    setHoverReactionMessageId(null);
    setShowEmojiBox(false);
  }

  function openDeleteConfirm(message: MsgRow) {
    setDeleteConfirmMessage(message);
    closeActionMenu();
  }

  function closeDeleteConfirm() {
    setDeleteConfirmMessage(null);
  }

  function startReply(message: MsgRow) {
    setReplyingTo(message);
    closeActionMenu();
  }

  function cancelReply() {
    setReplyingTo(null);
  }

  function insertEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
    setShowEmojiBox(false);
  }

  async function copyMessageText(message: MsgRow) {
    const value = String(message.body ?? "").trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      closeActionMenu();
    } catch {}
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
        `/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
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

      cancelEditMessage();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to edit message.");
    }
  }

  async function deleteMessageForEveryone(messageId: string) {
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
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

      cancelEditMessage();
      closeActionMenu();
      closeDeleteConfirm();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to delete message.");
    }
  }

  async function toggleReaction(message: MsgRow, emoji: string) {
    try {
      const current = getReactionMap(message);
      const list = Array.isArray(current[emoji]) ? current[emoji] : [];

      const updated = list.includes(currentUserId)
        ? list.filter((u) => u !== currentUserId)
        : [...list, currentUserId];

      const nextReactions = {
        ...current,
        [emoji]: updated,
      };

      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(message.id)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            reactions: nextReactions,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error ?? "Failed to update reaction.");
        return;
      }

      closeActionMenu();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update reaction.");
    }
  }

    function clearRecordedAudio() {
    if (recordedAudioPreviewUrl) {
      URL.revokeObjectURL(recordedAudioPreviewUrl);
    }
    setRecordedAudioFile(null);
    setRecordedAudioPreviewUrl("");
  }

  async function startAudioRecording(mode: "tap" | "hold" = "tap") {
    if (isRecording || loading || uploading) return;

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
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });

        const previewUrl = URL.createObjectURL(blob);

        if (recordedAudioPreviewUrl) {
          URL.revokeObjectURL(recordedAudioPreviewUrl);
        }

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

  async function sendAttachmentMessage(file: File) {
    if (!file || uploading || loading) return;

    const validationError = validateChatAttachment(file);
    if (validationError) {
      setErr(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setErr("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadJson = await uploadRes.json().catch(() => null);

      if (!uploadRes.ok) {
        setErr(uploadJson?.error ?? "Failed to upload attachment.");
        setUploading(false);
        return;
      }

      const uploadMessageType = String(uploadJson?.message_type ?? "").toLowerCase();

      const messageType: "image" | "file" | "audio" =
        uploadMessageType === "image" || String(file.type || "").startsWith("video/")
          ? "image"
          : uploadMessageType === "audio"
          ? "audio"
          : "file";

      const uploadedKind = String(uploadJson?.kind ?? "").toLowerCase();

      const attachmentKind =
        uploadedKind === "audio"
          ? "audio"
          : uploadedKind === "video" || String(file.type || "").startsWith("video/")
          ? "video"
          : messageType === "image"
          ? "image"
          : messageType === "audio"
          ? "audio"
          : "file";

      const replyMeta = replyingTo
        ? {
            id: replyingTo.id,
            body: replyingTo.body,
            sender_role: replyingTo.sender_role,
            sender_user_id: replyingTo.sender_user_id,
          }
        : undefined;

      const sendRes = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          messageType,
          body: "",
          meta: {
            file_url: String(uploadJson?.url ?? ""),
            file_name: String(uploadJson?.file_name ?? file.name ?? "attachment"),
            mime_type: String(uploadJson?.mime_type ?? file.type ?? "application/octet-stream"),
            file_size: Number(uploadJson?.file_size ?? file.size ?? 0),
            bucket: String(uploadJson?.bucket ?? "conversation-attachments"),
            path: String(uploadJson?.path ?? ""),
            attachments: [
              {
                kind: attachmentKind,
                name: String(uploadJson?.file_name ?? file.name ?? "attachment"),
                original_file_name: String(uploadJson?.original_file_name ?? file.name ?? "attachment"),
                path: String(uploadJson?.path ?? ""),
                url: String(uploadJson?.url ?? ""),
                file_url: String(uploadJson?.url ?? ""),
                mime: String(uploadJson?.mime_type ?? file.type ?? "application/octet-stream"),
                mime_type: String(uploadJson?.mime_type ?? file.type ?? "application/octet-stream"),
                size: Number(uploadJson?.file_size ?? file.size ?? 0),
                file_size: Number(uploadJson?.file_size ?? file.size ?? 0),
                bucket: String(uploadJson?.bucket ?? "conversation-attachments"),
              },
            ],
            ...(replyMeta ? { reply_to: replyMeta } : {}),
          },
        }),
      });

      const sendJson = await sendRes.json().catch(() => null);

      if (!sendRes.ok) {
        setErr(sendJson?.error ?? "Failed to send attachment.");
        setUploading(false);
        return;
      }

      setReplyingTo(null);
      setErr("");
      clearRecordedAudio();

      wasNearBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollToBottom("smooth");

      markSeen().catch(() => {});
      loadReadState().catch(() => {});
    } catch (e: any) {
      setErr(e?.message ?? "Failed to upload attachment.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

    async function sendRecordedAudio() {
    if (!recordedAudioFile || loading || uploading) return;

    try {
      await sendAttachmentMessage(recordedAudioFile);
      clearRecordedAudio();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send voice message.");
    }
  }

  async function closeDeal() {
  if (!conversationId) return;

  try {
    const res = await fetch(`/api/conversations/${conversationId}/close`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Failed to close deal");
      return;
    }

    alert("✅ Deal marked as completed");
    window.location.reload();
  } catch {
    alert("Failed to close deal");
  }
}

  async function sendMessage(messageOverride?: string, replyOverride?: MsgRow | null) {
    const body = (messageOverride ?? text).trim();
    if (!body || loading || uploading || isRecording) return;

    setLoading(true);
    setErr("");

    const effectiveReplyingTo = replyOverride ?? replyingTo;

    const replyMeta = effectiveReplyingTo
      ? {
          id: effectiveReplyingTo.id,
          body: effectiveReplyingTo.body,
          sender_role: effectiveReplyingTo.sender_role,
          sender_user_id: effectiveReplyingTo.sender_user_id,
        }
      : undefined;

    const tempId = createTempId();

    upsertMessage({
      id: tempId,
      sender_user_id: currentUserId,
      sender_role: "buyer",
      message_type: "text",
      body,
      meta: replyMeta ? { reply_to: replyMeta } : {},
      created_at: new Date().toISOString(),
    });

    sendTypingStop();
    setText("");
    setReplyingTo(null);
    setErr("");

    wasNearBottomRef.current = true;
    setShowJumpToLatest(false);
    scrollToBottom("smooth");

    try {
      const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          messageType: "text",
          body,
          meta: replyMeta ? { reply_to: replyMeta } : {},
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error ?? "Failed to send message.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (json as MsgRow) : m))
      );

      void markSeen().catch(() => {});
      void loadReadState().catch(() => {});
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  }
    useEffect(() => {
    function unlockAudio() {
      audioUnlockedRef.current = true;

      if (audioRef.current) {
        audioRef.current.muted = true;
        const p = audioRef.current.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.muted = false;
            }
          }).catch(() => {
            if (audioRef.current) {
              audioRef.current.muted = false;
            }
          });
        } else if (audioRef.current) {
          audioRef.current.muted = false;
        }
      }

      try {
        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;

        if (AudioCtx && !audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }

        if (audioContextRef.current?.state === "suspended") {
          void audioContextRef.current.resume();
        }
      } catch {}

      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined" && !documentTitleRef.current) {
      documentTitleRef.current = document.title;
    }

    clearInboxReminder(String(conversationId));
    void loadReadState();

    if (canAutoMarkSeenNow()) {
      void markSeen();
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    const messageChannel = supabase
      .channel(`conversation-room-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const row = (payload?.new ?? payload?.old) as MsgRow | undefined;
          if (!row?.id) return;

          if (payload?.eventType === "INSERT") {
            setMessages((prev) => {
              if (isDuplicateMessage(prev, row)) return prev;
              return upsertUniqueMessage(prev, row);
            });
          } else {
            replaceMessage(row);
          }

          const isIncoming = String(row.sender_user_id ?? "") !== String(currentUserId);

          if (isIncoming) {
            const shouldAutoMarkSeen = canAutoMarkSeenNow();

            void playIncomingSound();

            if (!shouldAutoMarkSeen) {
              flashWindowTitle();
            }

            if (shouldAutoMarkSeen) {
              void markSeen().catch(() => {});
            }

            void loadReadState().catch(() => {});
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
        () => {
          void loadReadState().catch(() => {});
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
      .on("broadcast", { event: "typing:start" }, (payload: any) => {
        if (String(payload?.payload?.user ?? "") === String(currentUserId)) return;
        setIsCounterpartTyping(true);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    const onFocus = () => {
      setWindowFocused(true);
      stopTitleFlash();

      if (checkIfNearBottom()) {
        wasNearBottomRef.current = true;
        void markSeen();
      }

      void loadReadState();
    };

    const onBlur = () => {
      setWindowFocused(false);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        stopTitleFlash();

        if (checkIfNearBottom()) {
          wasNearBottomRef.current = true;
          void markSeen();
        }

        void loadReadState();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      stopTitleFlash();

      stopTypingIndicator();
      sendTypingStop();

      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, supabase]);

    useEffect(() => {
    return () => {
      stopTitleFlash();
    };
  }, []);

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

  // ✅ ADD THIS CLEANUP EFFECT
useEffect(() => {
  return () => {
    if (recordedAudioPreviewUrl) {
      URL.revokeObjectURL(recordedAudioPreviewUrl);
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };
}, [recordedAudioPreviewUrl]);

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
          <div style={{ fontWeight: 900, fontSize: 16 }}>{counterpartName}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {String(contextType ?? "").replace(/_/g, " ")} {contextTitle ? `• ${contextTitle}` : ""}
          </div>
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

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={closeDeal}
            style={{
              background: "#16a34a",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 999,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ✅ Mark Deal
          </button>

          {counterpartPhone ? (
            <a
              href={`tel:${counterpartPhone}`}
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
        </div>

      <div style={{ position: "relative", background: "#f3f4f6" }}>
        <div
          ref={listRef}
          onScroll={() => {
            const nearBottom = checkIfNearBottom();
            wasNearBottomRef.current = nearBottom;

            if (nearBottom) {
              stopTitleFlash();
              setShowJumpToLatest(false);

              if (canAutoMarkSeenNow()) {
                void markSeen();
              }
            }
          }}
          style={{
            padding: 14,
            minHeight: 340,
            maxHeight: 540,
            overflowY: "auto",
            display: "grid",
            gap: 6,
            background: "#f3f4f6",
          }}
        >

          <div style={{ marginBottom: 16 }}>
            <DealScoreClient
              conversationId={conversationId}
              initialMessages={dealScoreMessages}
            />

            <DealReadyClient
              conversationId={conversationId}
              initialMessages={dealScoreMessages}
            />

            <div
              style={{
                marginTop: 12,
                border: "1px solid #bbf7d0",
                background: "linear-gradient(135deg, #ecfdf5, #ffffff)",
                borderRadius: 16,
                padding: 12,
                boxShadow: "0 10px 24px rgba(16,185,129,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 950, color: "#065f46" }}>
                    🤖 Autonomous Buyer Procurement Agent
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#475569", fontWeight: 800 }}>
                    AI tracks supplier reliability, payment/timeline commitment, escalation risk and next action.
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 999,
                    border: "1px solid #bbf7d0",
                    background: "#fff",
                    color: "#047857",
                    padding: "7px 11px",
                    fontSize: 12,
                    fontWeight: 950,
                    alignSelf: "center",
                  }}
                >
                  Agent Score {buyerAgent.agentScore}/100
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
                {[
                  ["Lifecycle", buyerAgent.lifecycleStage, "📍"],
                  ["Risk", buyerAgent.workflowRisk, "🚦"],
                  ["Supplier", buyerAgent.supplierReliability, "🏆"],
                  ["Escalation", buyerAgent.workflowRisk === "High" ? "Needed" : "Monitor", "⚡"],
                ].map(([label, value, icon]) => (
                  <div key={label} style={{ border: "1px solid #d1fae5", background: "#fff", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900 }}>
                      {icon} {label}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#0f172a", fontWeight: 950 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 10 }}>
                  <div style={{ color: "#166534", fontWeight: 950, fontSize: 13 }}>
                    🎯 Agent Next Action
                  </div>
                  <div style={{ marginTop: 5, color: "#14532d", fontSize: 12, fontWeight: 800, lineHeight: 1.5 }}>
                    {buyerAgent.autonomousAction}
                  </div>
                </div>

                <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 10 }}>
                  <div style={{ color: "#1e3a8a", fontWeight: 950, fontSize: 13 }}>
                    ⚡ Escalation Signal
                  </div>
                  <div style={{ marginTop: 5, color: "#1e40af", fontSize: 12, fontWeight: 800, lineHeight: 1.5 }}>
                    {buyerAgent.escalationSignal}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setText(buyerAgent.suggestedReply)}
                style={{
                  marginTop: 10,
                  border: "none",
                  borderRadius: 12,
                  background: "#059669",
                  color: "#fff",
                  padding: "9px 12px",
                  fontSize: 12,
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                ✍️ Use Agent Suggested Reply
              </button>
            </div>
          </div>

          <ConversationMessageList
            ordered={ordered}
            currentUserId={currentUserId}
            firstUnreadMessageId={unreadDividerMessageId}
            unreadDividerRef={{ current: null }}
            messageRefs={messageRefs}
            highlightedMessageId={highlightedMessageId}
            hoverReactionMessageId={hoverReactionMessageId}
            setHoverReactionMessageId={setHoverReactionMessageId}
            latestOwnMessageId={lastOwnVisibleMessageId}
            counterpartLastSeenAt={counterpartLastReadAt}
            counterpartOnline={counterpartOnline}
            myLastSeenAt={initialUnreadCutoffAt ?? null}
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
            fmtDateTime={fmtBubbleTime}
            getDateDividerLabel={formatDayLabel}
            toDisplayRole={(role?: string | null) => {
              if (!role) return counterpartName || "User";
              return String(role).toLowerCase() === "buyer" ||
                String(role).toLowerCase() === "vendor"
                ? counterpartName || toDisplayRole(role)
                : toDisplayRole(role);
            }}
            REACTION_EMOJIS={REACTION_EMOJIS}
            onSendAiSuggestion={sendMessage}
          />
          <div ref={endRef} />
        </div>

        {showJumpToLatest ? (
          <button
            type="button"
            onClick={() => {
              wasNearBottomRef.current = true;
              stopTitleFlash();
              setShowJumpToLatest(false);
              scrollToBottom("smooth");
              void markSeen();
            }}
            style={{
              position: "absolute",
              right: 14,
              bottom: 14,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
            }}
          >
            New messages ↓
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
        toDisplayRole={() => counterpartName || "User"}
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
          {counterpartName} is typing...
        </div>
      ) : null}

      <audio
        ref={audioRef}
        preload="auto"
        style={{ display: "none" }}
        src="/sounds/message-pop.mp3"
      />

      <ConversationComposer
        QUICK_REPLIES={QUICK_REPLIES}
        COMPOSER_EMOJIS={COMPOSER_EMOJIS}
        MAX_FILES={1}
        text={text}
        setText={setText}
        showEmojiBox={showEmojiBox}
        setShowEmojiBox={setShowEmojiBox}
        replyingTo={replyingTo}
        getReplyPreviewSender={(message) =>
          getReplyPreviewSender(message ?? null, currentUserId, counterpartName)
        }
        getReplyPreviewText={getReplyPreviewText}
        cancelReply={cancelReply}
        insertEmoji={insertEmoji}
        sendTypingStart={sendTypingStart}
        sendTypingStop={sendTypingStop}
        typingStopTimeoutRef={typingTimeoutRef}
        markConversationRead={markSeen}
        sendMessage={sendMessage}
        loading={loading || uploading}
        fileInputRef={fileInputRef}
        onPickFiles={(files) => {
          const file = files?.[0];
          if (!file) return;
          void sendAttachmentMessage(file);
        }}
        isRecording={isRecording}
        handleMicClick={handleMicClick}
        handleMicPressStart={handleMicPressStart}
        handleMicPressEnd={handleMicPressEnd}
        clearSelectedFiles={() => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        selectedFiles={[]}
        recordedAudioFile={recordedAudioFile}
        recordedAudioPreviewUrl={recordedAudioPreviewUrl}
        clearRecordedAudio={clearRecordedAudio}
        selectedFilePreviewUrls={{}}
        removeSelectedFile={() => {}}
        formatBytes={formatFileSize}
        err={uploading ? "Uploading attachment..." : err}
        applyQuickReply={(value) => {
          setText(value);
          textareaRef.current?.focus();
        }}
      />
      </div>
  );
}