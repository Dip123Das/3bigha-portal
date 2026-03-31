"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type InboxRow = {
  rfq_id: string;
  rfq_no?: string | null;

  buyer_name?: string | null;

  rfq_status?: string | null;
  target_status?: string | null;

  latest_quote_version?: number | null;
  latest_quote_grand_total?: number | null;

  is_revised?: boolean | null;
  is_unread?: boolean | null;
  is_new?: boolean | null;
};

type ConversationRow = {
  id: string;
  rfq_id: string;
};

type ConversationReadRow = {
  conversation_id: string;
  user_id: string;
  last_seen_at: string | null;
};

type MessageLiteRow = {
  conversation_id: string;
  sender_user_id: string | null;
  sender_role?: string | null;
  created_at: string | null;
  body?: string | null;
  message_type?: string | null;
};

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

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
function fmtRelativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;

    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

const VENDOR_CHAT_CLEAR_KEY = "vendor_chat_recently_opened_rfq";

function buildMessagePreview(
  body: string | null | undefined,
  messageType: string | null | undefined,
  senderIsSelf: boolean,
  senderRole?: string | null
) {
  const raw = String(body ?? "").replace(/\s+/g, " ").trim();
  const normalizedSenderRole = String(senderRole ?? "").trim().toLowerCase();
  const normalizedType = String(messageType ?? "").trim().toLowerCase();

  const who =
    normalizedSenderRole === "system" || normalizedType === "system"
      ? "System"
      : senderIsSelf
      ? "You"
      : "Buyer";

  if (raw) {
    const short = raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
    return `${who}: ${short}`;
  }

  if (normalizedType && normalizedType !== "text") return `${who}: [${normalizedType}]`;

  return `${who}: Message`;
}

export default function VendorInboxV2Client({ rows, focusId }: { rows: InboxRow[]; focusId?: string }) {
  const [localRows, setLocalRows] = useState<InboxRow[]>(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadChatCountByRfq, setUnreadChatCountByRfq] = useState<Record<string, number>>({});
  const [lastMessagePreviewByRfq, setLastMessagePreviewByRfq] = useState<Record<string, string>>({});
  const [lastMessageAtByRfq, setLastMessageAtByRfq] = useState<Record<string, string | null>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const currentUserIdRef = useRef<string | null>(null);
  const localRowsRef = useRef<InboxRow[]>(rows);
  const displayRows = useMemo(() => {
    return [...localRows].sort((a, b) => {
      const aUnreadChat = unreadChatCountByRfq[a.rfq_id] ?? 0;
      const bUnreadChat = unreadChatCountByRfq[b.rfq_id] ?? 0;

      if (bUnreadChat !== aUnreadChat) return bUnreadChat - aUnreadChat;

      const aUnread = a.is_unread ? 1 : 0;
      const bUnread = b.is_unread ? 1 : 0;
      if (bUnread !== aUnread) return bUnread - aUnread;

      const aNew = a.is_new ? 1 : 0;
      const bNew = b.is_new ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;

      const aLast = lastMessageAtByRfq[a.rfq_id]
        ? new Date(lastMessageAtByRfq[a.rfq_id] as string).getTime()
        : 0;
      const bLast = lastMessageAtByRfq[b.rfq_id]
        ? new Date(lastMessageAtByRfq[b.rfq_id] as string).getTime()
        : 0;

      if (bLast !== aLast) return bLast - aLast;

      return String(a.rfq_no ?? a.rfq_id).localeCompare(String(b.rfq_no ?? b.rfq_id));
    });
  }, [localRows, unreadChatCountByRfq, lastMessageAtByRfq]);

  const supabase = useMemo(() => {
    return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }, []);

  useEffect(() => {
    setLocalRows(rows);
    localRowsRef.current = rows;
    setSelected([]);
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

  useEffect(() => {
  const uid = currentUserId;
  if (!uid) return;

  try {
    const pendingRfqId = sessionStorage.getItem(VENDOR_CHAT_CLEAR_KEY);
    if (!pendingRfqId) return;

    sessionStorage.removeItem(VENDOR_CHAT_CLEAR_KEY);

    setUnreadChatCountByRfq((prev) => {
      if (!(pendingRfqId in prev)) return prev;
      return { ...prev, [pendingRfqId]: 0 };
    });

    const rfqIds = localRowsRef.current.map((r) => r.rfq_id);

    if (rfqIds.length > 0) {
      window.setTimeout(() => {
        void loadUnreadChats(uid, rfqIds);
      }, 250);
    }
  } catch {}
}, [currentUserId]);

  async function loadUnreadChats(uid: string | null, rfqIds: string[]) {
    if (!uid || rfqIds.length === 0) {
      setUnreadChatCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
      return;
    }

    try {
      const { data: convData } = await supabase
        .from("rfq_conversations")
        .select("id,rfq_id")
        .eq("vendor_user_id", uid)
        .in("rfq_id", rfqIds);

      const conversations = (convData ?? []) as ConversationRow[];
      if (conversations.length === 0) {
        setUnreadChatCountByRfq({});
        setLastMessagePreviewByRfq({});
        setLastMessageAtByRfq({});
        return;
      }

      const convIds = conversations.map((c) => c.id);

      const [{ data: readData }, { data: msgData }] = await Promise.all([
        supabase
          .from("rfq_conversation_reads")
          .select("conversation_id,user_id,last_seen_at")
          .eq("user_id", uid)
          .in("conversation_id", convIds),
        supabase
          .from("rfq_messages")
          .select("conversation_id,sender_user_id,sender_role,created_at,body,message_type")
          .in("conversation_id", convIds),
      ]);

      const reads = (readData ?? []) as ConversationReadRow[];
      const messages = (msgData ?? []) as MessageLiteRow[];

      const lastSeenByConv: Record<string, number> = {};
      for (const rd of reads) {
        lastSeenByConv[String(rd.conversation_id)] = rd.last_seen_at
          ? new Date(rd.last_seen_at).getTime()
          : 0;
      }

      const rfqIdByConv: Record<string, string> = {};
      for (const c of conversations) {
        rfqIdByConv[String(c.id)] = String(c.rfq_id);
      }

      const unreadByRfq: Record<string, number> = {};
      const latestMessageAtMsByRfq: Record<string, number> = {};
      const latestMessagePreviewByRfqLocal: Record<string, string> = {};
      const latestMessageAtByRfqLocal: Record<string, string | null> = {};

      for (const m of messages) {
        const convId = String(m.conversation_id ?? "");
        const rfqId = rfqIdByConv[convId];
        if (!rfqId) continue;

        const senderIsSelf = String(m.sender_user_id ?? "") === String(uid);
        const isSystemMessage =
          String(m.sender_role ?? "").trim().toLowerCase() === "system" ||
          String(m.message_type ?? "").trim().toLowerCase() === "system";
        const createdAtMs = m.created_at ? new Date(m.created_at).getTime() : 0;
        const lastSeen = lastSeenByConv[convId] ?? 0;

        if (!senderIsSelf && !isSystemMessage && createdAtMs > lastSeen) {
          unreadByRfq[rfqId] = (unreadByRfq[rfqId] ?? 0) + 1;
        }

        const prevMs = latestMessageAtMsByRfq[rfqId] ?? 0;
        if (createdAtMs >= prevMs) {
          latestMessageAtMsByRfq[rfqId] = createdAtMs;
          latestMessageAtByRfqLocal[rfqId] = m.created_at ?? null;
          latestMessagePreviewByRfqLocal[rfqId] = buildMessagePreview(
            m.body,
            m.message_type,
            senderIsSelf,
            m.sender_role
          );
        }
      }

      setUnreadChatCountByRfq(unreadByRfq);
      setLastMessagePreviewByRfq(latestMessagePreviewByRfqLocal);
      setLastMessageAtByRfq(latestMessageAtByRfqLocal);
    } catch {
      setUnreadChatCountByRfq({});
      setLastMessagePreviewByRfq({});
      setLastMessageAtByRfq({});
    }
  }

  useEffect(() => {
    if (!currentUserId) return;
    const rfqIds = localRows.map((r) => r.rfq_id);
    void loadUnreadChats(currentUserId, rfqIds);
  }, [currentUserId, localRows]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleOpenChat(rfqId: string) {
    setUnreadChatCountByRfq((prev) => {
      if (!(rfqId in prev)) return prev;
      return { ...prev, [rfqId]: 0 };
    });

    try {
      sessionStorage.setItem(VENDOR_CHAT_CLEAR_KEY, rfqId);
    } catch {}
  }

  async function markSelectedAsRead() {
    if (selected.length === 0) return;

    setLocalRows((prev) => prev.map((r) => (selected.includes(r.rfq_id) ? { ...r, is_unread: false } : r)));

    await fetch("/api/vendor/rfq/mark-viewed-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfq_ids: selected }),
      keepalive: true,
    });

    setSelected([]);
  }

  useEffect(() => {
    if (!focusId) return;
    const el = rowRefs.current[focusId];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, localRows]);

  useEffect(() => {
    const refreshSignals = async () => {
      const uid = currentUserIdRef.current;
      const rfqIds = localRowsRef.current.map((r) => r.rfq_id);
      if (!uid || rfqIds.length === 0) return;
      await loadUnreadChats(uid, rfqIds);
    };

    const channel = supabase
      .channel("vendor-inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rfq_targets" },
        async (payload: any) => {
          const newRow = payload.new as { rfq_id?: string } | null;
          const oldRow = payload.old as { rfq_id?: string } | null;

          const rfqId = newRow?.rfq_id ?? oldRow?.rfq_id;
          if (!rfqId) return;

          const { data } = await supabase.from("vendor_inbox_v2").select("*").eq("rfq_id", rfqId).maybeSingle();
          if (!data) return;

          setLocalRows((prev) => {
            const exists = prev.find((r) => r.rfq_id === rfqId);
            if (exists) return prev.map((r) => (r.rfq_id === rfqId ? (data as InboxRow) : r));
            return [data as InboxRow, ...prev];
          });

          await refreshSignals();
        }
      )
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
  }, [supabase]);

  return (
    <div style={{ marginTop: 20 }}>
      {selected.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={markSelectedAsRead}
            style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: 8, background: "#f3f4f6" }}
          >
            Mark selected as read ({selected.length})
          </button>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 8 }}></th>
            <th style={{ padding: 8, textAlign: "left" }}>RFQ</th>
            <th style={{ padding: 8 }}>Buyer</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Quote</th>
            <th style={{ padding: 8 }}>Total</th>
          </tr>
        </thead>

        <tbody>
          {displayRows.map((row) => {
            const isFocused = focusId && row.rfq_id === focusId;
            const ts = String(row.target_status ?? "").toLowerCase();
            const rs = String(row.rfq_status ?? "").toLowerCase();

            const isAccepted = ts === "accepted" || ts === "won";
            const isLost = rs === "closed" && !isAccepted;
            const unreadChatCount = unreadChatCountByRfq[row.rfq_id] ?? 0;
            const lastMessagePreview = lastMessagePreviewByRfq[row.rfq_id] ?? "";
            const lastMessageAt = lastMessageAtByRfq[row.rfq_id] ?? null;
            const hasChatVisibility = unreadChatCount > 0 || !!lastMessagePreview;
            const chatHref = `/vendor/inbox-v2/${row.rfq_id}/chat`;
            const isFreshChat = !!lastMessageAt && Date.now() - new Date(lastMessageAt).getTime() <= 1000 * 60 * 60 * 12;

            return (
              <tr
                key={row.rfq_id}
                ref={(el) => {
                  rowRefs.current[row.rfq_id] = el;
                }}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: isFocused
                    ? "#fff7ed"
                    : unreadChatCount > 0
                    ? "#fffaf0"
                    : row.is_unread
                    ? "#f0f9ff"
                    : "white",
                  boxShadow: unreadChatCount > 0 ? "inset 4px 0 0 #dc2626" : "none",
                }}
              >
                <td style={{ padding: 8 }}>
                  <input type="checkbox" checked={selected.includes(row.rfq_id)} onChange={() => toggle(row.rfq_id)} />
                </td>

                <td style={{ padding: 8, minWidth: 260 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
  <Link href={`/vendor/inbox-v2/${row.rfq_id}`} style={{ textDecoration: "none" }}>
    <strong>{row.rfq_no ?? row.rfq_id.slice(0, 8)}</strong>
  </Link>

  {unreadChatCount > 0 ? (
    <span
      style={{
        display: "inline-flex",
        minWidth: 22,
        height: 22,
        padding: "0 7px",
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        background: "#dc2626",
        color: "#fff",
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
      }}
      title={`${unreadChatCount} unread chat message${unreadChatCount > 1 ? "s" : ""}`}
    >
      {unreadChatCount}
    </span>
  ) : null}
</div>

                  <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isAccepted ? pill("Won", "ok") : null}
                    {isLost ? pill("Not Selected", "warn") : null}

                    {!isAccepted && !isLost && row.is_unread ? pill("Unread", "warn") : null}
                    {!isAccepted && !isLost && row.is_new ? pill("New RFQ", "ok") : null}
                    {!isAccepted && !isLost && row.is_revised ? pill("Revised", "warn") : null}
                    {unreadChatCount > 0 ? pill(`New chat ${unreadChatCount}`, "warn") : null}
                    {isFreshChat
                      ? pill("Fresh chat", "ok")
                      : !!lastMessagePreview && unreadChatCount === 0
                      ? pill("Chat", "neutral")
                      : null}
                  </div>

                  {lastMessagePreview ? (
                      <Link
                        href={chatHref}
                        onClick={() => handleOpenChat(row.rfq_id)}
                        style={{
                        display: "block",
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: unreadChatCount > 0 ? "#fffbeb" : isFreshChat ? "#f0fdf4" : "#f8fafc",
                        border: unreadChatCount > 0 ? "1px solid #fde68a" : isFreshChat ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                      title="Open chat"
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: unreadChatCount > 0 ? 800 : 600,
                          color: "#111827",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {lastMessagePreview}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                        {lastMessageAt ? `${fmtDate(lastMessageAt)} • ${fmtRelativeTime(lastMessageAt)}` : "—"}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          fontWeight: 900,
                          color: unreadChatCount > 0 ? "#b45309" : "#475569",
                        }}
                      >
                        Open chat now →
                      </div>
                    </Link>
                  ) : null}

                  {isAccepted || hasChatVisibility ? (
                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <Link
                        href={chatHref}
                        onClick={() => handleOpenChat(row.rfq_id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 36,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: unreadChatCount > 0 ? "1px solid #fecaca" : "1px solid #d1d5db",
                          background: unreadChatCount > 0 ? "#fff1f2" : "#fff",
                          color: unreadChatCount > 0 ? "#b91c1c" : "#111827",
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 900,
                          gap: 8,
                        }}
                      >
                        💬 {unreadChatCount > 0 ? "Open chat" : "Chat"}
                        {unreadChatCount > 0 ? (
                          <span
                            style={{
                              display: "inline-flex",
                              minWidth: 20,
                              height: 20,
                              padding: "0 6px",
                              borderRadius: 999,
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#dc2626",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {unreadChatCount}
                          </span>
                        ) : null}
                      </Link>

                      <Link
                        href={`/vendor/inbox-v2/${row.rfq_id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 36,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                          background: "#fff",
                          color: "#111827",
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        Open RFQ
                      </Link>
                    </div>
                  ) : null}
                </td>

                <td style={{ padding: 8 }}>{row.buyer_name ?? "—"}</td>

                <td style={{ padding: 8 }}>
                  {row.rfq_status ?? "—"}
                  {row.target_status ? <div style={{ fontSize: 12, opacity: 0.7 }}>({row.target_status})</div> : null}
                </td>

                <td style={{ padding: 8 }}>
                  {row.latest_quote_version ? `v${row.latest_quote_version}` : "Not quoted"}
                </td>

                <td style={{ padding: 8 }}>
                  {row.latest_quote_grand_total != null ? `₹${Number(row.latest_quote_grand_total).toLocaleString("en-IN")}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}