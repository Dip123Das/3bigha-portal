import type { SupabaseClient } from "@supabase/supabase-js";

export type ConversationAttachmentMeta = {
  kind?: "image" | "file" | "audio";
  name?: string;
  original_file_name?: string;
  path?: string;
  url?: string;
  file_url?: string;
  mime?: string;
  mime_type?: string;
  size?: number;
  file_size?: number;
  bucket?: string;
};

export type ConversationReplyMeta = {
  id?: string;
  body?: string;
  sender_role?: string;
  sender_user_id?: string;
};

export type ConversationReactionsMeta = {
  [emoji: string]: string[];
};

export type ConversationMessageMeta = Record<string, any> & {
  attachments?: ConversationAttachmentMeta[];
  reply_to?: ConversationReplyMeta;
  reactions?: ConversationReactionsMeta;
  edited?: boolean;
  edited_at?: string;
  deleted?: boolean;
  deleted_at?: string;
  file_url?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  bucket?: string;
  path?: string;
  url?: string;
  name?: string;
  mime?: string;
  size?: number;
};

export type MsgRow = {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message_type: string;
  body: string;
  meta?: ConversationMessageMeta | null;
  created_at: string | null;
};

export type ParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string | null;
  last_read_at: string | null;
};

function isObjectLike(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeMeta(meta: unknown): ConversationMessageMeta {
  return isObjectLike(meta) ? (meta as ConversationMessageMeta) : {};
}

function normalizeAttachment(att: unknown): ConversationAttachmentMeta | null {
  if (!isObjectLike(att)) return null;

  const mimeType = String(att.mime_type ?? att.mime ?? "").trim();
  const mimeTypeLower = mimeType.toLowerCase();
  const rawKind = String(att.kind ?? "").trim().toLowerCase();

  let kind: "image" | "file" | "audio" = "file";
  if (rawKind === "audio" || mimeTypeLower.startsWith("audio/")) {
    kind = "audio";
  } else if (rawKind === "image" || mimeTypeLower.startsWith("image/")) {
    kind = "image";
  }

  const rawSize = att.file_size ?? att.size ?? null;
  const numSize = Number(rawSize);
  const safeSize = Number.isFinite(numSize) && numSize >= 0 ? numSize : undefined;

  const url = String(att.url ?? att.file_url ?? "").trim();
  const fileUrl = String(att.file_url ?? att.url ?? "").trim();

  return {
    kind,
    name: String(att.name ?? att.original_file_name ?? "Attachment").trim() || "Attachment",
    original_file_name: String(att.original_file_name ?? att.name ?? "").trim(),
    path: String(att.path ?? "").trim(),
    url,
    file_url: fileUrl,
    mime: String(att.mime ?? att.mime_type ?? "").trim(),
    mime_type: String(att.mime_type ?? att.mime ?? "").trim(),
    size: safeSize,
    file_size: safeSize,
    bucket: String(att.bucket ?? "").trim(),
  };
}

function mergeMeta(
  currentMeta: ConversationMessageMeta | null | undefined,
  nextMeta: ConversationMessageMeta | null | undefined
): ConversationMessageMeta {
  const current = normalizeMeta(currentMeta);
  const next = normalizeMeta(nextMeta);

  const merged: ConversationMessageMeta = {
    ...current,
    ...next,
  };

  if (Array.isArray(next.attachments)) {
    merged.attachments = next.attachments;
  } else if (Array.isArray(current.attachments)) {
    merged.attachments = current.attachments;
  }

  if (typeof next.reply_to !== "undefined") {
    merged.reply_to = next.reply_to;
  } else if (typeof current.reply_to !== "undefined") {
    merged.reply_to = current.reply_to;
  }

  if (typeof next.reactions !== "undefined") {
    merged.reactions = next.reactions;
  } else if (typeof current.reactions !== "undefined") {
    merged.reactions = current.reactions;
  }

  return merged;
}

export function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(v));
  } catch {
    return v;
  }
}

export function fmtShortSeen(v?: string | null) {
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

export function fmtBubbleTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(v))
      .toLowerCase();
  } catch {
    return v;
  }
}

export function sortMessagesByCreatedAt(messages: MsgRow[]) {
  return [...messages].sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;

    if (at !== bt) return at - bt;

    const aid = String(a.id ?? "").trim();
    const bid = String(b.id ?? "").trim();

    return aid.localeCompare(bid);
  });
}

export function upsertUniqueMessage(prev: MsgRow[], next: MsgRow) {
  const nextId = String(next.id ?? "").trim();
  if (!nextId) return prev;

  const index = prev.findIndex((m) => String(m.id ?? "").trim() === nextId);

  if (index === -1) {
    return [...prev, { ...next, meta: mergeMeta(undefined, next.meta) }];
  }

  const current = prev[index];
  const copy = [...prev];

  copy[index] = {
    ...current,
    ...next,
    meta: mergeMeta(current?.meta, next?.meta),
  };

  return copy;
}

export function replaceMessageById(prev: MsgRow[], next: MsgRow) {
  const nextId = String(next.id ?? "").trim();
  if (!nextId) return prev;

  return prev.map((m) =>
    String(m.id ?? "").trim() === nextId
      ? {
          ...m,
          ...next,
          meta: mergeMeta(m?.meta, next?.meta),
        }
      : m
  );
}

export function isDeletedMessage(message?: MsgRow | null) {
  return !!normalizeMeta(message?.meta).deleted;
}

export function isEditedMessage(message?: MsgRow | null) {
  return !!normalizeMeta(message?.meta).edited;
}

export function getMessageAttachments(message?: MsgRow | null): ConversationAttachmentMeta[] {
  const meta = normalizeMeta(message?.meta);

  if (Array.isArray(meta.attachments) && meta.attachments.length > 0) {
    return meta.attachments
      .map((att) => normalizeAttachment(att))
      .filter(Boolean) as ConversationAttachmentMeta[];
  }

  const singleUrl = String(meta.file_url ?? meta.url ?? "").trim();
  if (!singleUrl) return [];

  const mimeType = String(meta.mime_type ?? meta.mime ?? "").trim();
  const mimeTypeLower = mimeType.toLowerCase();
  const messageType = String(message?.message_type ?? "").trim().toLowerCase();

  let fallbackKind: "image" | "file" | "audio" = "file";
  if (mimeTypeLower.startsWith("audio/")) {
    fallbackKind = "audio";
  } else if (messageType === "image" || mimeTypeLower.startsWith("image/")) {
    fallbackKind = "image";
  }

  const rawSize = meta.file_size ?? meta.size ?? null;
  const numSize = Number(rawSize);
  const safeSize = Number.isFinite(numSize) && numSize >= 0 ? numSize : undefined;

  return [
    {
      kind: fallbackKind,
      url: singleUrl,
      file_url: singleUrl,
      name: String(meta.file_name ?? meta.name ?? meta.original_file_name ?? "Attachment").trim() || "Attachment",
      original_file_name: String(meta.original_file_name ?? meta.file_name ?? meta.name ?? "").trim(),
      mime: String(meta.mime ?? meta.mime_type ?? "").trim(),
      mime_type: String(meta.mime_type ?? meta.mime ?? "").trim(),
      size: safeSize,
      file_size: safeSize,
      bucket: String(meta.bucket ?? "").trim(),
      path: String(meta.path ?? "").trim(),
    },
  ];
}

export function getReplyMeta(message?: MsgRow | null): ConversationReplyMeta | null {
  const replyTo = normalizeMeta(message?.meta).reply_to;
  if (!isObjectLike(replyTo)) return null;

  return {
    id: String(replyTo.id ?? "").trim() || undefined,
    body: String(replyTo.body ?? ""),
    sender_role: String(replyTo.sender_role ?? ""),
    sender_user_id: String(replyTo.sender_user_id ?? ""),
  };
}

export function getReactionMap(message?: MsgRow | null): ConversationReactionsMeta {
  const reactions = normalizeMeta(message?.meta).reactions;
  if (!isObjectLike(reactions)) return {};

  const out: ConversationReactionsMeta = {};

  for (const [emoji, users] of Object.entries(reactions)) {
    if (!Array.isArray(users)) continue;

    const cleaned = Array.from(
      new Set(
        users
          .map((u) => String(u ?? "").trim())
          .filter(Boolean)
      )
    );

    if (cleaned.length > 0) {
      out[emoji] = cleaned;
    }
  }

  return out;
}

export function getMetaString(
  meta: Record<string, any> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const value = String(meta?.[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function getMetaNumber(
  meta: Record<string, any> | null | undefined,
  keys: string[]
) {
  for (const key of keys) {
    const raw = meta?.[key];
    if (raw == null || raw === "") continue;
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0) return num;
  }
  return null;
}

export function formatFileSize(bytes?: number | null) {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export async function markConversationSeen(
  conversationId: string,
  currentUserId: string,
  lastSeenMessageId?: string | null
) {
  const safeConversationId = String(conversationId ?? "").trim();
  const safeCurrentUserId = String(currentUserId ?? "").trim();

  if (!safeConversationId || !safeCurrentUserId) return;

  try {
    await fetch(`/api/conversations/${encodeURIComponent(safeConversationId)}/seen`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        userId: safeCurrentUserId,
        lastSeenMessageId: lastSeenMessageId ?? null,
      }),
      cache: "no-store",
    });
  } catch {}
}

export async function loadConversationCounterpartReadState(
  supabase: SupabaseClient,
  conversationId: string,
  currentUserId: string
) {
  try {
    const { data } = await supabase
      .from("conversation_participants")
      .select("conversation_id,user_id,role,last_read_at")
      .eq("conversation_id", conversationId);

    const rows = (data ?? []) as ParticipantRow[];
    const counterpart = rows.find((r) => String(r.user_id ?? "") !== String(currentUserId ?? ""));
    return counterpart?.last_read_at ?? null;
  } catch {
    return null;
  }
}