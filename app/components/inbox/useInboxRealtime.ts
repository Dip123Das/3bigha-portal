"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type UseInboxRealtimeArgs = {
  onChange: () => void;
  debounceMs?: number;
};

export default function useInboxRealtime({
  onChange,
  debounceMs = 250,
}: UseInboxRealtimeArgs) {
  useEffect(() => {
    const supabase = getSupabaseBrowser();

    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        onChange();
      }, debounceMs);
    };

    const channel = supabase
      .channel("inbox-realtime-hook")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
        },
        () => schedule()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
        },
        () => schedule()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_messages",
        },
        () => schedule()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_deal_rooms",
        },
        () => schedule()
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [onChange, debounceMs]);
}