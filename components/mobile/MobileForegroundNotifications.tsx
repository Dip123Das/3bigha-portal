"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  useMobileNotificationStore,
} from "./mobileNotificationStore";

export default function MobileForegroundNotifications() {
  const router = useRouter();

  const notifications =
    useMobileNotificationStore(
      (s) => s.notifications
    );

  const remove =
    useMobileNotificationStore(
      (s) => s.remove
    );

  useEffect(() => {
    if (!notifications.length) return;

    const timers = notifications.map((n) =>
      setTimeout(() => {
        remove(n.id);
      }, 7000)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, remove]);

  if (!notifications.length) {
    return null;
  }

  return (
    <div
      className="fixed top-16 left-0 right-0 z-[9999] px-3 space-y-2"
      style={{
        pointerEvents: "none",
      }}
    >
      {notifications.map((n) => (
        <button
          key={n.id}
          onClick={() => {
            remove(n.id);

            if (n.url) {
              router.push(n.url);
            }
          }}
          className="w-full rounded-xl border border-neutral-200 bg-white shadow-xl p-3 text-left"
          style={{
            pointerEvents: "auto",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500"
            />

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-neutral-900">
                {n.title}
              </div>

              <div className="mt-1 text-xs text-neutral-600 line-clamp-2">
                {n.body}
              </div>

              <div className="mt-2 text-[10px] uppercase tracking-wide text-neutral-400">
                {n.category.replaceAll("_", " ")}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}