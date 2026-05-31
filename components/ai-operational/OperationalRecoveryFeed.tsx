"use client";

type RecoveryItem = {
  id: string;
  title: string;
  description: string;
  severity:
    | "low"
    | "medium"
    | "high"
    | "critical";

  actionLabel: string;

  href: string;
};

const mockItems: RecoveryItem[] = [
  {
    id: "1",
    title: "Vendor response delayed",
    description:
      "One RFQ has not received a vendor reply for 18 hours.",

    severity: "medium",

    actionLabel: "Follow Up",

    href: "/dashboard/vendor/rfqs",
  },

  {
    id: "2",
    title: "Procurement negotiation risk",
    description:
      "A negotiation workflow may become inactive soon.",

    severity: "high",

    actionLabel: "Resume Negotiation",

    href: "/dashboard/procurement-war-room",
  },

  {
    id: "3",
    title: "Supply-chain pressure warning",
    description:
      "Delivery delay probability increasing for one supplier.",

    severity: "critical",

    actionLabel: "Review Supplier",

    href: "/dashboard/procurement-live",
  },
];

function getSeverityClasses(
  severity: RecoveryItem["severity"]
) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50";

    case "high":
      return "border-orange-200 bg-orange-50";

    case "medium":
      return "border-yellow-200 bg-yellow-50";

    default:
      return "border-slate-200 bg-slate-50";
  }
}

export default function OperationalRecoveryFeed() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            AI Recovery Feed
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Live operational recovery recommendations
          </div>
        </div>

        <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          Live AI
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {mockItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`block rounded-xl border p-3 transition hover:shadow-sm ${getSeverityClasses(
              item.severity
            )}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {item.title}
                </div>

                <div className="mt-1 text-xs text-slate-600">
                  {item.description}
                </div>
              </div>

              <div className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 border border-slate-200 whitespace-nowrap">
                {item.severity}
              </div>
            </div>

            <div className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
              {item.actionLabel}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}