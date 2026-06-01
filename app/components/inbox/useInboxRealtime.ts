"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { createRealtimeThrottle } from "@/lib/realtime/throttle-event";
import {
  getSharedChannel,
  releaseSharedChannel,
} from "@/lib/realtime/channel-manager";

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

    const schedule = createRealtimeThrottle(
      () => {
        onChange();
      },
      debounceMs
    );

    const channel = getSharedChannel(
      "inbox-realtime-hook",
      () =>
        supabase
          .channel("inbox-realtime-hook")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
        },
        () => schedule(undefined)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
        },
        () => schedule(undefined)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_messages",
        },
        () => schedule(undefined)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "investment_deal_rooms",
        },
        () => schedule(undefined)
      )
      .subscribe()
    );

    return () => {
      releaseSharedChannel("inbox-realtime-hook", (ch) => {
        supabase.removeChannel(ch);
      });
    };
  }, [onChange, debounceMs]);
}