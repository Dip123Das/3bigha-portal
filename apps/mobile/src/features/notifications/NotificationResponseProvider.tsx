import * as Notifications from "expo-notifications";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";

export type PendingNotificationAction = { title: string; body: string; category: string; webPath: string | null };
type NotificationResponseState = { action: PendingNotificationAction | null; clear(): void };
const NotificationResponseContext = createContext<NotificationResponseState | null>(null);

export function safeNotificationWebPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.length > 512 || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  try {
    const parsed = new URL(path, "https://3bigha.invalid");
    return parsed.origin === "https://3bigha.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
  } catch { return null; }
}

function actionFromResponse(response: Notifications.NotificationResponse): PendingNotificationAction | null {
  const content = response.notification.request.content;
  const data = content.data || {};
  if (data.silent === "true" || data.category === "silent_sync") return null;
  return {
    title: typeof content.title === "string" && content.title.trim() ? content.title.trim() : "Important work update",
    body: typeof content.body === "string" ? content.body.trim() : "Review this update from your 3Bigha workspace.",
    category: typeof data.category === "string" ? data.category : "operational_alert",
    webPath: safeNotificationWebPath(data.url),
  };
}

export function NotificationResponseProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [action, setAction] = useState<PendingNotificationAction | null>(null);
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    const accept = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return;
      const next = actionFromResponse(response);
      if (next) setAction(next);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(accept);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      accept(response);
      if (response) return Notifications.clearLastNotificationResponseAsync();
    }).catch(() => undefined);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const nextUserId = session?.user.id ?? null;
    if (previousUserId.current && previousUserId.current !== nextUserId) setAction(null);
    previousUserId.current = nextUserId;
  }, [session?.user.id]);
  const value = useMemo(() => ({ action, clear: () => setAction(null) }), [action]);
  return <NotificationResponseContext.Provider value={value}>{children}</NotificationResponseContext.Provider>;
}

export function useNotificationResponse() {
  const value = useContext(NotificationResponseContext);
  if (!value) throw new Error("useNotificationResponse must be used inside NotificationResponseProvider");
  return value;
}
