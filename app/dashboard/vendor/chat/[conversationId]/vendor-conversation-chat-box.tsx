"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { clearInboxReminder } from "@/lib/inbox/clearInboxReminder";
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
  return true;
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

export default function VendorConversationChatBox(props: {
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
  const canSend = text.trim().length > 0 && !loading && !uploading;

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
    const lastReadAt = await loadConversationCounterpartReadState(
      supabase,
      conversationId,
      currentUserId
    );
    setCounterpartLastReadAt(lastReadAt);
  }

  function upsertMessage(next: MsgRow) {
    setMessages((prev) => upsertUniqueMessage(prev, next));
  }

  function replaceMessage(next: MsgRow) {
    setMessages((prev) => replaceMessageById(prev, next));
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
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

      if (json?.message) {
        replaceMessage(json.message as MsgRow);
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

      if (json?.message) {
        replaceMessage(json.message as MsgRow);
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

      if (json?.message) {
        replaceMessage(json.message as MsgRow);
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
        uploadMessageType === "image"
          ? "image"
          : uploadMessageType === "audio"
          ? "audio"
          : "file";

      const attachmentKind =
        String(uploadJson?.kind ?? "").toLowerCase() === "audio"
          ? "audio"
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

      upsertMessage(sendJson as MsgRow);
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

  async function sendMessage(messageOverride?: string) {
    const body = (messageOverride ?? text).trim();
    if (!body || loading || uploading || isRecording) return;

    setLoading(true);
    setErr("");

    try {
      const replyMeta = replyingTo
        ? {
            id: replyingTo.id,
            body: replyingTo.body,
            sender_role: replyingTo.sender_role,
            sender_user_id: replyingTo.sender_user_id,
          }
        : undefined;

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
        setLoading(false);
        return;
      }

      upsertMessage(json as MsgRow);

      setText("");
      setReplyingTo(null);
      setErr("");

      wasNearBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollToBottom("smooth");

      void markSeen().catch(() => {});
      void loadReadState().catch(() => {});
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send message.");
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
            upsertMessage(row);
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
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (String(payload?.payload?.user ?? "") === String(currentUserId)) return;

        setIsCounterpartTyping(true);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          stopTypingIndicator();
        }, 2500);
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

      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
    };
  }, [conversationId, currentUserId, supabase]);

  useEffect(() => {
    return () => {
      stopTitleFlash();
      setShowEmojiBox(false);
      setActionMenu(null);
      setShowReactionPicker(false);
      setHoverReactionMessageId(null);
      setDeleteConfirmMessage(null);
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
              color: isCounterpartTyping ? "#2563eb" : "#6b7280",
              fontWeight: 700,
            }}
          >
            {isCounterpartTyping
              ? "Typing..."
              : counterpartLastReadAt
              ? `Last seen ${fmtShortSeen(counterpartLastReadAt)}`
              : "Offline"}
          </div>
        </div>

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
          {ordered.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No messages yet.</div>
          ) : (
            ordered.map((m, index) => {
              const prev = index > 0 ? ordered[index - 1] : undefined;
              const mine = String(m.sender_user_id ?? "") === String(currentUserId);
              const isSystem = m.sender_role === "system" || m.message_type === "system";
              const groupedWithPrevious = isGroupedWithPrevious(prev, m);
              const showDateSeparator = !prev || !isSameDay(prev.created_at, m.created_at);
              const showSenderName = !mine && !groupedWithPrevious && !isSystem;
              const showUnreadDivider = unreadDividerMessageId === m.id;
              const attachments = getMessageAttachments(m);
              const replyTo = getReplyMeta(m);
              const reactions = getReactionMap(m);
              const isLastOwnVisibleMessage = mine && m.id === lastOwnVisibleMessageId;
              const seenByCounterpart = isLastOwnVisibleMessage
                ? isMessageSeenByCounterpart(m, counterpartLastReadAt)
                : false;

              if (isSystem) {
                return (
                  <React.Fragment key={m.id}>
                    {showDateSeparator ? (
                      <div style={{ textAlign: "center", margin: "8px 0 4px 0" }}>
                        <div
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "#e5e7eb",
                            color: "#374151",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {formatDayLabel(m.created_at)}
                        </div>
                      </div>
                    ) : null}

                    {showUnreadDivider ? (
                      <div style={{ textAlign: "center", margin: "10px 0 6px 0" }}>
                        <div
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: "#dbeafe",
                            color: "#1d4ed8",
                            fontSize: 11,
                            fontWeight: 900,
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          Unread messages
                        </div>
                      </div>
                    ) : null}

                    <div style={{ textAlign: "center", marginTop: groupedWithPrevious ? 2 : 8 }}>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "8px 12px",
                          borderRadius: 999,
                          background: "#eef2f7",
                          fontSize: 12,
                          color: "#374151",
                          maxWidth: "85%",
                        }}
                      >
                        {m.body}
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={m.id}>
                  {showDateSeparator ? (
                    <div style={{ textAlign: "center", margin: "8px 0 4px 0" }}>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: "#e5e7eb",
                          color: "#374151",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {formatDayLabel(m.created_at)}
                      </div>
                    </div>
                  ) : null}

                  {showUnreadDivider ? (
                    <div style={{ textAlign: "center", margin: "10px 0 6px 0" }}>
                      <div
                        style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          borderRadius: 999,
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          fontSize: 11,
                          fontWeight: 900,
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        Unread messages
                      </div>
                    </div>
                  ) : null}

                  <div
                    ref={(el) => {
                      messageRefs.current[m.id] = el;
                    }}
                    style={{
                      display: "flex",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      marginTop: groupedWithPrevious ? 2 : 8,
                    }}
                  >
                    <div
                      onDoubleClick={(e) => {
                        if (!m.meta?.deleted) openActionMenu(m, e.clientX, e.clientY);
                      }}
                      onContextMenu={(e) => {
                        if (m.meta?.deleted) return;
                        e.preventDefault();
                        openActionMenu(m, e.clientX, e.clientY);
                      }}
                      onMouseEnter={() => {
                        if (!m.meta?.deleted) setHoverReactionMessageId(m.id);
                      }}
                      onMouseLeave={() => {
                        setHoverReactionMessageId((prevId) => (prevId === m.id ? null : prevId));
                      }}
                      style={{
                        maxWidth: "76%",
                        padding: "10px 12px",
                        borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: mine ? "#dbeafe" : "#ffffff",
                        border: "1px solid #e5e7eb",
                        position: "relative",
                        outline: highlightedMessageId === m.id ? "2px solid #f59e0b" : "none",
                        boxShadow:
                          highlightedMessageId === m.id
                            ? "0 0 0 4px rgba(245,158,11,0.18)"
                            : "0 1px 2px rgba(0,0,0,0.03)",
                      }}
                    >
                      {showSenderName ? (
                        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4, opacity: 0.8 }}>
                          {counterpartName}
                        </div>
                      ) : null}

                      {replyTo ? (
                        <div
                          onClick={() => jumpToMessage(replyTo.id)}
                          style={{
                            marginBottom: m.body || attachments.length > 0 ? 8 : 6,
                            padding: "8px 10px",
                            borderLeft: "3px solid #94a3b8",
                            background: "#f8fafc",
                            borderRadius: 8,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                          title="Jump to original message"
                        >
                          <div style={{ fontWeight: 800, marginBottom: 2 }}>
                            {getReplyPreviewSender(
                              {
                                id: String(replyTo.id ?? ""),
                                body: String(replyTo.body ?? ""),
                                sender_role: String(replyTo.sender_role ?? ""),
                                sender_user_id: String(replyTo.sender_user_id ?? ""),
                                message_type: "text",
                                meta: {},
                                created_at: null,
                              },
                              currentUserId,
                              counterpartName
                            )}
                          </div>
                          <div
                            style={{
                              opacity: 0.8,
                              whiteSpace: "pre-wrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {String(replyTo.body ?? "").trim() || "Message"}
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

                            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={sendRecordedAudio}
                                disabled={loading || uploading || isRecording}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid #bbf7d0",
                                  background: "#f0fdf4",
                                  color: "#166534",
                                  fontWeight: 800,
                                  cursor: loading || uploading || isRecording ? "default" : "pointer",
                                }}
                              >
                                Send Voice
                              </button>

                              <button
                                type="button"
                                onClick={clearRecordedAudio}
                                disabled={loading || uploading}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  border: "1px solid #fecaca",
                                  background: "#fff1f2",
                                  color: "#9f1239",
                                  fontWeight: 800,
                                  cursor: loading || uploading ? "default" : "pointer",
                                }}
                              >
                                Remove Voice
                              </button>
                            </div>
                          </div>
                        ) : null}

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
                      ) : (
                        <>
                          {String(m.body ?? "").trim() ? (
                            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{m.body}</div>
                          ) : null}

                          {attachments.length > 0 ? (
                            <div style={{ marginTop: String(m.body ?? "").trim() ? 6 : 0 }}>
                              {attachments.map((att, i) => renderAttachment(att, i))}
                            </div>
                          ) : null}
                        </>
                      )}

                      {Object.keys(reactions).length > 0 ? (
                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {Object.entries(reactions).map(([emoji, users]) => {
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
                                  borderRadius: 999,
                                  border: "1px solid #e5e7eb",
                                  background: reacted ? "#dbeafe" : "#fff",
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
                            borderRadius: 999,
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
                          {mine && !groupedWithPrevious ? "You • " : ""}
                          {fmtBubbleTime(m.created_at)}
                          {mine && isLastOwnVisibleMessage
                            ? seenByCounterpart
                              ? " • Seen"
                              : " • Delivered"
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
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

      {actionMenu ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: actionMenu.y,
            left: actionMenu.x,
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
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
                    ? "#1d4ed8"
                    : "#475569",
                textTransform: "uppercase",
              }}
            >
              {String(actionMenu.message.sender_user_id ?? "") === String(currentUserId)
                ? "Your message"
                : `${counterpartName} message`}
            </div>
          </div>

          <button
            type="button"
            onClick={() => startReply(actionMenu.message)}
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
          !actionMenu.message.meta?.deleted ? (
            <>
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
            </>
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
                    borderRadius: 999,
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

      {deleteConfirmMessage ? (
        <div
          onClick={closeDeleteConfirm}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.28)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
              border: "1px solid #e5e7eb",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>Delete message?</div>

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

      <div style={{ padding: 12, borderTop: "1px solid #e5e7eb", background: "#fff" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
              setText(q);
              textareaRef.current?.focus();
            }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
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
              background: "#eff6ff",
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
                Replying to {getReplyPreviewSender(replyingTo, currentUserId, counterpartName)}
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
                zIndex: 20,
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
                    fontSize: 22,
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp3,.wav,.m4a,.webm"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void sendAttachmentMessage(file);
          }}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            sendTypingPulse();
          }}
          onFocus={() => {
            stopTitleFlash();
            if (checkIfNearBottom()) {
              wasNearBottomRef.current = true;
              void markSeen();
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if ((e.nativeEvent as any)?.isComposing) return;

            if (e.ctrlKey || e.metaKey) {
              if (!text.trim() || loading || uploading) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              void sendMessage();
              return;
            }

            if (e.shiftKey || e.altKey) return;

            if (!text.trim() || loading || uploading) {
              e.preventDefault();
              return;
            }

            e.preventDefault();
            void sendMessage();
          }}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line, Ctrl/Cmd+Enter also sends)"
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 14,
            border: "1px solid #d1d5db",
            resize: "none",
            outline: "none",
            minHeight: 104,
            maxHeight: 180,
            overflowY: "auto",
          }}
        />

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
          <div style={{ color: "crimson", fontSize: 13 }}>
            {uploading ? "Uploading attachment..." : err}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploading || isRecording}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                fontWeight: 900,
                cursor: loading || uploading ? "default" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Attach File"}
            </button>

            <button
              type="button"
              onClick={() => {
                setText("Hello");
                void sendMessage("Hello");
              }}
              disabled={loading || uploading}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                fontWeight: 900,
                cursor: loading || uploading ? "default" : "pointer",
              }}
            >
              Quick Hello
            </button>

            <button
              type="button"
              onClick={() => {
                stopTitleFlash();
                void sendMessage();
              }}
              disabled={!canSend}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #bfdbfe",
                background: canSend ? "#eff6ff" : "#f3f4f6",
                color: canSend ? "#1d4ed8" : "#9ca3af",
                fontWeight: 900,
                cursor: canSend ? "pointer" : "default",
              }}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
                      <button
            type="button"
            onClick={handleMicClick}
            onMouseDown={handleMicPressStart}
            onMouseUp={handleMicPressEnd}
            onMouseLeave={handleMicPressEnd}
            onTouchStart={handleMicPressStart}
            onTouchEnd={handleMicPressEnd}
            disabled={loading || uploading}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: isRecording ? "1px solid #fecaca" : "1px solid #d1d5db",
              background: isRecording ? "#fff1f2" : "#fff",
              color: isRecording ? "#b91c1c" : "#111827",
              fontWeight: 800,
              cursor: loading || uploading ? "default" : "pointer",
            }}
            title="Tap to start/stop. Hold to record and release to stop."
          >
            {isRecording ? "⏺ Recording..." : "🎤 Voice"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}