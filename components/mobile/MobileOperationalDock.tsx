"use client";

import { useRouter } from "next/navigation";
import { useMobileNotificationStore } from "./mobileNotificationStore";

export type MobileDockAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  count?: number;
  primary?: boolean;
};

export default function MobileOperationalDock({
  title = "Mobile Workflow Updates",
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: string;
  actions?: MobileDockAction[];
}) {
  const router = useRouter();

  const unreadCount = useMobileNotificationStore((s) => s.unreadCount);
  const categoryUnread = useMobileNotificationStore((s) => s.categoryUnread);
  const lastSilentSyncAt = useMobileNotificationStore((s) => s.lastSilentSyncAt);
  const markAllRead = useMobileNotificationStore((s) => s.markAllRead);

  const hasCustomActions = Array.isArray(actions) && actions.length > 0;

  if (!hasCustomActions && !unreadCount && !lastSilentSyncAt) {
    return null;
  }

  const rfqCount =
    (categoryUnread.rfq_response || 0) +
    (categoryUnread.vendor_lead || 0);

  const chatCount = categoryUnread.chat_message || 0;

  const procurementCount =
    (categoryUnread.procurement_alert || 0) +
    (categoryUnread.operational_alert || 0);

  const defaultActions: MobileDockAction[] = [
    { label: "Chat", href: "/dashboard/inbox-v2", count: chatCount },
    { label: "RFQ", href: "/dashboard/buyer/rfqs", count: rfqCount },
    { label: "Ops", href: "/dashboard/procurement-os", count: procurementCount },
    { label: "Clear", onClick: markAllRead, primary: true },
  ];

  const finalActions = hasCustomActions ? actions!.slice(0, 4) : defaultActions;

  function runAction(action: MobileDockAction) {
    if (action.onClick) {
      action.onClick();
      return;
    }

    if (action.href) {
      router.push(action.href);
    }
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[9998] md:hidden">
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xl p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-neutral-900">
              {title}
            </div>

            <div className="mt-0.5 text-[11px] text-neutral-500">
              {subtitle
                ? subtitle
                : unreadCount > 0
                  ? `${unreadCount} unread operational update${unreadCount > 1 ? "s" : ""}`
                  : "Background sync active"}
            </div>
          </div>

          {unreadCount > 0 && !hasCustomActions ? (
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
          {finalActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => runAction(action)}
              className={
                action.primary
                  ? "rounded-xl bg-blue-600 px-2 py-2 text-[11px] font-semibold text-white"
                  : "rounded-xl bg-neutral-100 px-2 py-2 text-[11px] font-semibold text-neutral-700"
              }
            >
              {action.label}
              {action.count && action.count > 0 ? ` • ${action.count}` : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
