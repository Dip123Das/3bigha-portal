export type AttachmentRow = {
  kind?: "image" | "file" | "audio";
  name?: string;
  path?: string;
  mime?: string;
  size?: number;
};

export type MsgRow = {
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

export function toDisplayRole(role?: string | null) {
  const value = String(role ?? "").trim();
  if (!value) return "User";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalizeConversationMessageRow(row: any): MsgRow | null {
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

export function sortMessages(messages: MsgRow[]) {
  return [...messages].sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return at - bt;
  });
}

export function mergeMessageLists(existing: MsgRow[], incoming: MsgRow[]) {
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

export function upsertMessageInList(existing: MsgRow[], incoming: MsgRow) {
  return mergeMessageLists(existing, [incoming]);
}

export function updateMessageInList(
  existing: MsgRow[],
  messageId: string,
  updater: (msg: MsgRow) => MsgRow
) {
  return existing.map((m) =>
    String(m.id) === String(messageId) ? updater(m) : m
  );
}

export function removeMessageFromList(existing: MsgRow[], messageId: string) {
  return existing.filter((m) => String(m.id) !== String(messageId));
}

export function buildMessagesSignature(messages: MsgRow[]) {
  return messages
    .map(
      (m) =>
        `${String(m.id)}:${String(m.body ?? "")}:${String(
          m.message_type ?? ""
        )}:${JSON.stringify(m.meta ?? {})}:${String(m.created_at ?? "")}`
    )
    .join("|");
}