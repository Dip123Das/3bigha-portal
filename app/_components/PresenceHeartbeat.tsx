"use client";

import { useEffect, useMemo, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  currentPage?: string;
  heartbeatMs?: number;
};

export default function PresenceHeartbeat({
  currentPage,
  heartbeatMs = 20000,
}: Props) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const userIdRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function getUserId() {
    if (userIdRef.current) return userIdRef.current;

    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      userIdRef.current = uid;
      return uid;
    } catch {
      return null;
    }
  }

  async function upsertPresence(payload?: {
    is_online?: boolean;
    bumpActive?: boolean;
    current_page?: string | null;
  }) {
    const uid = await getUserId();
    if (!uid) return;

    const now = new Date().toISOString();

    const row: Record<string, any> = {
      user_id: uid,
      updated_at: now,
      last_heartbeat_at: now,
    };

    if (typeof payload?.is_online === "boolean") {
      row.is_online = payload.is_online;
    }

    if (payload?.bumpActive) {
      row.last_active_at = now;
    }

    if (payload && "current_page" in payload) {
      row.current_page = payload.current_page ?? null;
    } else if (currentPage) {
      row.current_page = currentPage;
    }

    try {
      await supabase.from("user_presence").upsert(row, {
        onConflict: "user_id",
      });
    } catch {}
  }

  async function markOffline() {
    const uid = await getUserId();
    if (!uid) return;

    try {
      await supabase
        .from("user_presence")
        .update({
          is_online: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", uid);
    } catch {}
  }

  useEffect(() => {
    let alive = true;

    const clearActiveTimer = () => {
      if (activeTimerRef.current) {
        clearTimeout(activeTimerRef.current);
        activeTimerRef.current = null;
      }
    };

    const clearHeartbeatTimer = () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    const bumpActivity = () => {
      if (!alive) return;

      void upsertPresence({
        is_online: true,
        bumpActive: true,
        current_page: currentPage ?? null,
      });

      clearActiveTimer();

      activeTimerRef.current = setTimeout(() => {
        if (!alive) return;
        void upsertPresence({
          is_online: true,
          current_page: currentPage ?? null,
        });
      }, 1000);
    };

    const startHeartbeat = () => {
      clearHeartbeatTimer();

      heartbeatTimerRef.current = setInterval(() => {
        if (!alive) return;
        void upsertPresence({
          is_online: true,
          current_page: currentPage ?? null,
        });
      }, heartbeatMs);
    };

    void upsertPresence({
      is_online: true,
      bumpActive: true,
      current_page: currentPage ?? null,
    });

    startHeartbeat();

    const onFocus = () => {
      void upsertPresence({
        is_online: true,
        bumpActive: true,
        current_page: currentPage ?? null,
      });
    };

    const onBlur = () => {
      void upsertPresence({
        is_online: false,
        current_page: currentPage ?? null,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void upsertPresence({
          is_online: true,
          bumpActive: true,
          current_page: currentPage ?? null,
        });
      } else {
        void markOffline();
      }
    };

    const onBeforeUnload = () => {
      void markOffline();
    };

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user?.id ?? null;

      if (session?.user?.id) {
        void upsertPresence({
          is_online: true,
          bumpActive: true,
          current_page: currentPage ?? null,
        });
      }
    });

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("click", bumpActivity);
    window.addEventListener("keydown", bumpActivity);
    window.addEventListener("scroll", bumpActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      alive = false;

      clearHeartbeatTimer();
      clearActiveTimer();

      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("click", bumpActivity);
      window.removeEventListener("keydown", bumpActivity);
      window.removeEventListener("scroll", bumpActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);

      authSub.subscription.unsubscribe();

      void markOffline();
    };
  }, [heartbeatMs, currentPage, supabase]);

  return null;
}