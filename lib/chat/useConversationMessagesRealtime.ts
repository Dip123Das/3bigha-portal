"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type RealtimeHandlers = {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
};

export function useConversationMessagesRealtime(
  conversationId: string | null | undefined,
  handlers: RealtimeHandlers
) {
  const onInsertRef = useRef(handlers.onInsert);
  const onUpdateRef = useRef(handlers.onUpdate);
  const onDeleteRef = useRef(handlers.onDelete);
  const enabled = handlers.enabled ?? true;

  useEffect(() => {
    onInsertRef.current = handlers.onInsert;
  }, [handlers.onInsert]);

  useEffect(() => {
    onUpdateRef.current = handlers.onUpdate;
  }, [handlers.onUpdate]);

  useEffect(() => {
    onDeleteRef.current = handlers.onDelete;
  }, [handlers.onDelete]);

  useEffect(() => {
    if (!enabled) return;
    if (!conversationId) return;

    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`conversation-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onInsertRef.current?.(payload);
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
        (payload) => {
          onUpdateRef.current?.(payload);
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
        (payload) => {
          onDeleteRef.current?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, enabled]);
}