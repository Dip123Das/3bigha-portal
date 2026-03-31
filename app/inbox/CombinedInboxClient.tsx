"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type CombinedInboxRow = {
  conversation_id: string;
  rfq_id: string;
  rfq_no: string | null;

  role: "buyer" | "vendor";
  counterpart_user_id: string | null;
  counterpart_name: string | null;
  counterpart_phone: string | null;

  rfq_status: string | null;
  conversation_status: string | null;

  last_message_id: string | null;
  last_message_body: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  last_message_sender_user_id: string | null;
  last_message_sender_role: string | null;

  unread_count: number;
  last_seen_at: string | null;

  created_at: string | null;
  updated_at: string | null;

  open_href: string;
};

type MessageLiteRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  body: string | null;
  message_type: string | null;
  created_at: string | null;
};

type ReadRow = {
  conversation_id: string;
  user_id: string;
  last_seen_at: string | null;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function buildMessagePreview(
  body: string | null | undefined,
  messageType: string | null | undefined,
  senderIsSelf: boolean,
  role: "buyer" | "vendor",
  senderRole?: string | null
) {
  const raw = String(body ?? "").replace(/\s+/g, " ").trim();
  const counterpartLabel = role === "buyer" ? "Vendor" : "Buyer";
  const normalizedSenderRole = String(senderRole ?? "").trim().toLowerCase();
  const normalizedType = String(messageType ?? "").trim().toLowerCase();

  const who =
    normalizedSenderRole === "system" || normalizedType === "system"
      ? "System"
      : senderIsSelf
      ? "You"
      : counterpartLabel;

  if (raw) {
    const short = raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
    return `${who}: ${short}`;
  }

  if (normalizedType && normalizedType !== "text") return `${who}: [${normalizedType}]`;

  return `${who}: Message`;
}

function pill(text: string, tone: "neutral" | "ok" | "warn" = "neutral") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#111827",
    whiteSpace: "nowrap",
  };

  if (tone === "ok") {
    base.border = "1px solid #bbf7d0";
    base.background = "#ecfdf5";
    base.color = "#065f46";
  }
  if (tone === "warn") {
    base.border = "1px solid #fde68a";
    base.background = "#fffbeb";
    base.color = "#92400e";
  }

  return <span style={base}>{text}</span>;
}

export default function CombinedInboxClient({ rows }: { rows: CombinedInboxRow[] }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [localRows, setLocalRows] = useState<CombinedInboxRow[]>(rows);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const currentUserIdRef = useRef<string | null>(null);
  const localRowsRef = useRef<CombinedInboxRow[]>(rows);

  useEffect(() => {
    setLocalRows(rows);
    localRowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    localRowsRef.current = localRows;
  }, [localRows]);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setCurrentUserId(uid);
      currentUserIdRef.current = uid;
    };
    run();
  }, [supabase]);

  async function refreshSignals() {
    const uid = currentUserIdRef.current;
    const currentRows = localRowsRef.current;
    if (!uid || currentRows.length === 0) return;

    const conversationIds = currentRows.map((r) => r.conversation_id);

    try {
      const [{ data: readData }, { data: msgData }] = await Promise.all([
        supabase
          .from("rfq_conversation_reads")
          .select("conversation_id,user_id,last_seen_at")
          .eq("user_id", uid)
          .in("conversation_id", conversationIds),
        supabase
          .from("rfq_messages")
          .select("id,conversation_id,sender_user_id,sender_role,body,message_type,created_at")
          .in("conversation_id", conversationIds),
      ]);

      const reads = (readData ?? []) as ReadRow[];
      const messages = (msgData ?? []) as MessageLiteRow[];

      const lastSeenByConv: Record<string, number> = {};
      for (const r of reads) {
        lastSeenByConv[String(r.conversation_id)] = r.last_seen_at
          ? new Date(r.last_seen_at).getTime()
          : 0;
      }

      const messagesByConv: Record<string, MessageLiteRow[]> = {};
      for (const m of messages) {
        const key = String(m.conversation_id ?? "");
        if (!key) continue;
        if (!messagesByConv[key]) messagesByConv[key] = [];
        messagesByConv[key].push(m);
      }

      setLocalRows((prev) =>
        prev.map((row) => {
          const convMessages = (messagesByConv[row.conversation_id] ?? []).sort((a, b) => {
            const at = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
            return at - bt;
          });

          const lastMessage = convMessages.length > 0 ? convMessages[convMessages.length - 1] : null;
          const lastSeen = lastSeenByConv[row.conversation_id] ?? 0;

          let unreadCount = 0;
          for (const m of convMessages) {
            const senderIsSelf = String(m.sender_user_id ?? "") === String(uid);
            const isSystemMessage =
              String(m.sender_role ?? "").trim().toLowerCase() === "system" ||
              String(m.message_type ?? "").trim().toLowerCase() === "system";
            const createdAt = m.created_at ? new Date(m.created_at).getTime() : 0;

            if (!senderIsSelf && !isSystemMessage && createdAt > lastSeen) {
              unreadCount += 1;
            }
          }

          return {
            ...row,
            unread_count: unreadCount,
            last_seen_at:
              reads.find((x) => String(x.conversation_id) === String(row.conversation_id))
                ?.last_seen_at ?? row.last_seen_at,
            last_message_id: lastMessage?.id ?? row.last_message_id,
            last_message_body: lastMessage?.body ?? row.last_message_body,
            last_message_type: lastMessage?.message_type ?? row.last_message_type,
            last_message_at: lastMessage?.created_at ?? row.last_message_at,
            last_message_sender_user_id:
            lastMessage?.sender_user_id ?? row.last_message_sender_user_id,
            last_message_sender_role:
              lastMessage?.sender_role ?? row.last_message_sender_role,
          };
        })
      );
    } catch {
      // preserve current UI
    }
  }

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`combined-inbox-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rfq_messages" },
        async () => {
          await refreshSignals();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rfq_conversation_reads",
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          await refreshSignals();
        }
      )
      .subscribe();

    const onFocus = () => {
      refreshSignals();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSignals();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId]);

  const sortedRows = useMemo(() => {
    return [...localRows].sort((a, b) => {
      if ((b.unread_count ?? 0) !== (a.unread_count ?? 0)) {
        return (b.unread_count ?? 0) - (a.unread_count ?? 0);
      }

      const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bt - at;
    });
  }, [localRows]);

  return (
    <div style={{ marginTop: 20 }}>
      {sortedRows.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff",
            color: "#6b7280",
          }}
        >
          No RFQ chat conversations found.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8, textAlign: "left" }}>Conversation</th>
              <th style={{ padding: 8, textAlign: "left" }}>Counterpart</th>
              <th style={{ padding: 8, textAlign: "left" }}>Status</th>
              <th style={{ padding: 8, textAlign: "left" }}>Latest</th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row) => {
              const senderIsSelf =
                String(row.last_message_sender_user_id ?? "") === String(currentUserId ?? "");

              const latestMessage = (() => {
                return null;
              })();

              const preview = buildMessagePreview(
                row.last_message_body,
                row.last_message_type,
                senderIsSelf,
                row.role,
                row.last_message_sender_role
              );

              return (
                <tr
                  key={row.conversation_id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: row.unread_count > 0 ? "#fffbeb" : "white",
                  }}
                >
                  <td style={{ padding: 8, minWidth: 260 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      {pill(row.role === "buyer" ? "Buyer Side" : "Vendor Side", row.role === "buyer" ? "ok" : "neutral")}
                      {row.unread_count > 0 ? pill(`${row.unread_count} unread`, "warn") : pill("Read", "neutral")}
                      {row.rfq_status ? pill(`RFQ: ${row.rfq_status}`, row.rfq_status === "open" ? "ok" : "neutral") : null}
                    </div>

                    <div style={{ fontWeight: 800 }}>
                      RFQ #{row.rfq_no ?? row.rfq_id.slice(0, 8)}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <Link
                        href={row.open_href}
                        style={{
                          fontWeight: 900,
                          textDecoration: "none",
                          color: row.unread_count > 0 ? "#b45309" : "#111827",
                        }}
                      >
                        Open chat →
                      </Link>
                    </div>
                  </td>

                  <td style={{ padding: 8, minWidth: 220 }}>
                    <div style={{ fontWeight: 700 }}>{row.counterpart_name ?? "—"}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                      {row.role === "buyer" ? "Vendor" : "Buyer"}
                    </div>
                    {row.counterpart_phone ? (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={`tel:${row.counterpart_phone}`}
                          style={{ fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                        >
                          📞 Call
                        </a>
                      </div>
                    ) : null}
                  </td>

                  <td style={{ padding: 8, minWidth: 160 }}>
                    <div>{row.conversation_status ?? "—"}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                      Updated: {fmtDate(row.updated_at)}
                    </div>
                  </td>

                  <td style={{ padding: 8, minWidth: 320 }}>
                    <Link
                      href={row.open_href}
                      style={{
                        display: "block",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: row.unread_count > 0 ? "#fffbeb" : "#f8fafc",
                        border: row.unread_count > 0 ? "1px solid #fde68a" : "1px solid #e5e7eb",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: row.unread_count > 0 ? 800 : 600,
                          color: "#111827",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {preview}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        {fmtDate(row.last_message_at)}
                      </div>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}