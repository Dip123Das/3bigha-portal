"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    title: "Overview",
    items: [
      {
        href: "/dashboard/procurement-os",
        label: "Operations Desk",
        emoji: "🧭",
        description: "Main procurement workflow workspace",
      },
      {
        href: "/dashboard/procurement-briefing",
        label: "Work Summary",
        emoji: "📋",
        description: "Daily procurement summary",
      },
      {
        href: "/dashboard/procurement-health",
        label: "Health",
        emoji: "💚",
        description: "Workflow and procurement health",
      },
    ],
  },

  {
    title: "Live Operations",
    items: [
      {
        href: "/dashboard/procurement-live",
        label: "Live Activity",
        emoji: "⚡",
        description: "Real-time procurement activity",
      },
      {
        href: "/dashboard/procurement-situation-room",
        label: "Work Updates",
        emoji: "🚨",
        description: "Operational procurement updates",
      },
      {
        href: "/dashboard/procurement-timeline",
        label: "Timeline",
        emoji: "🕒",
        description: "Workflow execution timeline",
      },
    ],
  },

  {
    title: "Suppliers & Negotiation",
    items: [
      {
        href: "/dashboard/procurement-supplier-reliability",
        label: "Supplier Reliability",
        emoji: "🏭",
        description: "Supplier trust and response overview",
      },
      {
        href: "/dashboard/procurement-negotiation-agent",
        label: "Negotiation",
        emoji: "🤝",
        description: "Negotiation workflow support",
      },
    ],
  },

  {
    title: "Workflow Actions",
    items: [
      {
        href: "/dashboard/procurement-actions",
        label: "Pending Actions",
        emoji: "🧩",
        description: "Operational next-step actions",
      },
      {
        href: "/dashboard/procurement-inbox-actions",
        label: "Inbox Actions",
        emoji: "📥",
        description: "Inbox workflow coordination",
      },
      {
        href: "/dashboard/procurement-followup-agent",
        label: "Follow-up",
        emoji: "📬",
        description: "Follow-up and reminder support",
      },
    ],
  },

  {
    title: "Recovery & Issues",
    items: [
      {
        href: "/dashboard/procurement-crisis-center",
        label: "Issue Center",
        emoji: "🛡️",
        description: "Escalation and recovery workspace",
      },
      {
        href: "/dashboard/procurement-anomaly",
        label: "Issue Detection",
        emoji: "🚨",
        description: "Operational issue detection",
      },
      {
        href: "/dashboard/procurement-autonomous-tasks",
        label: "Task Queue",
        emoji: "🛠️",
        description: "Pending operational tasks",
      },
    ],
  },

  {
    title: "Intelligence",
    items: [
      {
        href: "/dashboard/procurement-analytics",
        label: "Forecast",
        emoji: "📈",
        description: "Shortage and pressure forecast",
      },
      {
        href: "/dashboard/procurement-heatmap",
        label: "Heatmap",
        emoji: "🔥",
        description: "Zone and category analysis",
      },
      {
        href: "/dashboard/procurement-copilot",
        label: "Workflow Help",
        emoji: "🧠",
        description: "Procurement workflow assistance",
      },
    ],
  },
];

export default function ProcurementCommandCenterNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div
          key={group.title}
          className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {group.title}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-3xl border p-4 transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${
                        active
                          ? "bg-white/10"
                          : "border border-slate-200 bg-white"
                      }`}
                    >
                      {item.emoji}
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`text-sm font-black ${
                          active ? "text-white" : "text-slate-950"
                        }`}
                      >
                        {item.label}
                      </div>

                      <div
                        className={`mt-1 text-xs leading-5 ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
