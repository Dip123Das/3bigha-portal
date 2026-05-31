"use client";

import { useRouter } from "next/navigation";
import { useMobileNotificationStore } from "./mobileNotificationStore";

export default function MobileOperationalDock() {
  const router = useRouter();

  const unreadCount = useMobileNotificationStore((s) => s.unreadCount);
  const categoryUnread = useMobileNotificationStore((s) => s.categoryUnread);
  const lastSilentSyncAt = useMobileNotificationStore((s) => s.lastSilentSyncAt);
  const markAllRead = useMobileNotificationStore((s) => s.markAllRead);

  if (!unreadCount && !lastSilentSyncAt) {
    return null;
  }

  const rfqCount =
    (categoryUnread.rfq_response || 0) +
    (categoryUnread.vendor_lead || 0);

  const chatCount = categoryUnread.chat_message || 0;

  const procurementCount =
    (categoryUnread.procurement_alert || 0) +
    (categoryUnread.operational_alert || 0);

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[9998] md:hidden">
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xl p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-neutral-900">
              Mobile Workflow Updates
            </div>

            <div className="mt-0.5 text-[11px] text-neutral-500">
              {unreadCount > 0
                ? `${unreadCount} unread operational update${unreadCount > 1 ? "s" : ""}`
                : "Background sync active"}
            </div>
          </div>

          {unreadCount > 0 ? (
            <span className="rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
              Live
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/inbox-v2")}
            className="rounded-xl bg-neutral-100 px-2 py-2 text-[11px] font-semibold text-neutral-700"
          >
            Chat
            {chatCount > 0 ? ` • ${chatCount}` : ""}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/buyer/rfqs")}
            className="rounded-xl bg-neutral-100 px-2 py-2 text-[11px] font-semibold text-neutral-700"
          >
            RFQ
            {rfqCount > 0 ? ` • ${rfqCount}` : ""}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/procurement-os")}
            className="rounded-xl bg-neutral-100 px-2 py-2 text-[11px] font-semibold text-neutral-700"
          >
            Ops
            {procurementCount > 0 ? ` • ${procurementCount}` : ""}
          </button>

          <button
            type="button"
            onClick={markAllRead}
            className="rounded-xl bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}