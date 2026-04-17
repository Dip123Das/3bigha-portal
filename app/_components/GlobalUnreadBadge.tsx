"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type ConversationRow = {
  id: string;
};

type RfqConversationReadRow = {
  conversation_id: string;
  user_id: string;
  last_seen_at: string | null;
};

type RfqMessageLiteRow = {
  conversation_id: string;
  sender_user_id: string | null;
  created_at: string | null;
};

type ListingParticipantRow = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
};

type ListingMessageLiteRow = {
  conversation_id: string;
  sender_user_id: string | null;
  sender_role: string | null;
  message_type: string | null;
  created_at: string | null;
};

type Props = {
  href: string;
  label: string;
  className?: string;
  variant?: "topBtn" | "subLink";
  title?: string;
};

function uniqIds(rows: ConversationRow[]) {
  return Array.from(
    new Set(
      rows
        .map((c) => String(c.id ?? "").trim())
        .filter(Boolean)
    )
  );
}

export default function GlobalUnreadBadge({
  href,
  label,
  className,
  variant = "topBtn",
  title,
}: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const userIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;

        const uid = data?.user?.id ?? null;
        setUserId(uid);
        userIdRef.current = uid;
      } catch {
        if (!alive) return;
        setUserId(null);
        userIdRef.current = null;
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      userIdRef.current = uid;
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadUnread(uid: string | null) {
    if (!uid) {
      setCount(0);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const [
        buyerRfqConvRes,
        vendorRfqConvRes,
        buyerListingConvRes,
        vendorListingConvRes,
      ] = await Promise.all([
        supabase
          .from("conversations")
          .select("id")
          .eq("context_type", "rfq")
          .eq("buyer_user_id", uid)
          .eq("is_closed", false),
        supabase
          .from("conversations")
          .select("id")
          .eq("context_type", "rfq")
          .eq("vendor_user_id", uid)
          .eq("is_closed", false),
        supabase
          .from("conversations")
          .select("id")
          .neq("context_type", "rfq")
          .eq("buyer_user_id", uid)
          .eq("is_closed", false),
        supabase
          .from("conversations")
          .select("id")
          .neq("context_type", "rfq")
          .eq("vendor_user_id", uid)
          .eq("is_closed", false),
      ]);

      const rfqConvIds = uniqIds([
        ...((buyerRfqConvRes.data ?? []) as ConversationRow[]),
        ...((vendorRfqConvRes.data ?? []) as ConversationRow[]),
      ]);

      const listingConvIds = uniqIds([
        ...((buyerListingConvRes.data ?? []) as ConversationRow[]),
        ...((vendorListingConvRes.data ?? []) as ConversationRow[]),
      ]).filter((id) => !rfqConvIds.includes(id));

      let unread = 0;

      if (rfqConvIds.length > 0) {
        const [{ data: readData }, { data: msgData }] = await Promise.all([
          supabase
            .from("conversation_participants")
            .select("conversation_id,user_id,last_read_at")
            .eq("user_id", uid)
            .in("conversation_id", rfqConvIds),
          supabase
            .from("conversation_messages")
            .select("conversation_id,sender_user_id,sender_role,message_type,created_at")
            .in("conversation_id", rfqConvIds),
        ]);

        const reads = (readData ?? []) as Array<{
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
        }>;
        const msgs = (msgData ?? []) as Array<{
          conversation_id: string;
          sender_user_id: string;
          sender_role?: string | null;
          message_type?: string | null;
          created_at: string | null;
        }>;

        const lastSeenByConv: Record<string, number> = {};
        for (const rd of reads) {
          lastSeenByConv[String(rd.conversation_id)] = rd.last_read_at
            ? new Date(rd.last_read_at).getTime()
            : 0;
        }

        for (const m of msgs) {
          const convId = String(m.conversation_id ?? "");
          if (!convId) continue;
          if (String(m.sender_user_id ?? "") === String(uid)) continue;

          const isSystem =
            String(m.sender_role ?? "").trim().toLowerCase() === "system" ||
            String(m.message_type ?? "").trim().toLowerCase() === "system";

          if (isSystem) continue;

          const createdAt = m.created_at ? new Date(m.created_at).getTime() : 0;
          const lastSeen = lastSeenByConv[convId] ?? 0;

          if (createdAt > lastSeen) unread += 1;
        }
      }

      if (listingConvIds.length > 0) {
        const [{ data: participantData }, { data: msgData }] = await Promise.all([
          supabase
            .from("conversation_participants")
            .select("conversation_id,user_id,last_read_at")
            .eq("user_id", uid)
            .in("conversation_id", listingConvIds),
          supabase
            .from("conversation_messages")
            .select("conversation_id,sender_user_id,sender_role,message_type,created_at")
            .in("conversation_id", listingConvIds),
        ]);

        const participants = (participantData ?? []) as ListingParticipantRow[];
        const msgs = (msgData ?? []) as ListingMessageLiteRow[];

        const lastReadByConv: Record<string, number> = {};
        for (const p of participants) {
          lastReadByConv[String(p.conversation_id)] = p.last_read_at
            ? new Date(p.last_read_at).getTime()
            : 0;
        }

        for (const m of msgs) {
          const convId = String(m.conversation_id ?? "");
          if (!convId) continue;
          if (String(m.sender_user_id ?? "") === String(uid)) continue;

          const isSystem =
            String(m.sender_role ?? "").trim().toLowerCase() === "system" ||
            String(m.message_type ?? "").trim().toLowerCase() === "system";

          if (isSystem) continue;

          const createdAt = m.created_at ? new Date(m.created_at).getTime() : 0;
          const lastRead = lastReadByConv[convId] ?? 0;

          if (createdAt > lastRead) unread += 1;
        }
      }

      setCount(unread);
    } catch {
      setCount(0);
    } finally {
      loadingRef.current = false;
    }
  }

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    void loadUnread(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const refresh = async () => {
      const uid = userIdRef.current;
      if (!uid) return;
      await loadUnread(uid);
    };

    const channel = supabase
      .channel(`global-unread-badge-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_messages" },
        async () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_messages" },
        async () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        async () => {
          void refresh();
        }
      )
      .subscribe();

    const onFocus = () => {
      void refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const badge =
    count > 0 ? (
      <span
        style={{
          display: "inline-flex",
          minWidth: 18,
          height: 18,
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
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  if (variant === "subLink") {
    return (
      <Link
        className={className}
        href={href}
        title={title}
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <span>{label}</span>
        {badge}
      </Link>
    );
  }

  return (
    <Link
      className={className}
      href={href}
      title={title}
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <span>{label}</span>
      {badge}
    </Link>
  );
}