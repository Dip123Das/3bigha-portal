"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/dashboard/procurement-control-tower",
    label: "Control Tower",
    emoji: "🧠",
    description: "Executive procurement intelligence",
  },
    {
    href: "/dashboard/procurement-mission-control",
    label: "Mission Control",
    emoji: "🛰️",
    description: "Unified executive procurement command center",
  },
    {
    href: "/dashboard/procurement-actions",
    label: "AI Actions",
    emoji: "🧩",
    description: "Autonomous procurement action intelligence",
  },
    {
    href: "/dashboard/procurement-execution",
    label: "Execution AI",
    emoji: "⚙️",
    description: "Autonomous procurement execution intelligence",
  },
    {
    href: "/dashboard/procurement-health",
    label: "Health Score",
    emoji: "💚",
    description: "Overall procurement health intelligence",
  },
  {
    href: "/dashboard/procurement-analytics",
    label: "Forecast Analytics",
    emoji: "📈",
    description: "Predictive procurement forecasting",
  },
  {
    href: "/dashboard/procurement-copilot",
    label: "AI Copilot",
    emoji: "🤖",
    description: "Ask procurement intelligence questions",
  },
  {
    href: "/dashboard/procurement-live",
    label: "Live Stream",
    emoji: "⚡",
    description: "Real-time procurement event signals",
  },
  {
    href: "/dashboard/procurement-anomaly",
    label: "Anomaly Engine",
    emoji: "🚨",
    description: "Operational procurement anomaly detection",
  },
  {
    href: "/dashboard/inbox-v2",
    label: "Inbox Command Center",
    emoji: "📬",
    description: "Unified procurement execution inbox",
  },
  {
    label: "Follow-up AI",
    href: "/dashboard/procurement-followup-agent",
    icon: "🤖",
  },
  {
    label: "Inbox AI",
    href: "/dashboard/procurement-inbox-actions",
    icon: "📥",
  },
  {
    label: "Negotiation AI",
    href: "/dashboard/procurement-negotiation-agent",
    icon: "🤝",
  },
  {
    label: "Supplier AI",
    href: "/dashboard/procurement-supplier-reliability",
    icon: "🏭",
  },
  {
    label: "Memory AI",
    href: "/dashboard/procurement-memory-intelligence",
    icon: "🧠",
  },
  {
    label: "Closure AI",
    href: "/dashboard/procurement-closure-agent",
    icon: "✅",
  },
    {
    label: "Auto Tasks",
    href: "/dashboard/procurement-autonomous-tasks",
    icon: "🛠️",
  },
    {
    label: "Task Log",
    href: "/dashboard/procurement-task-execution-log",
    icon: "📜",
  },
];

export default function ProcurementCommandCenterNav() {
  const pathname = usePathname();

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {ITEMS.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group min-w-[220px] flex-1 rounded-3xl border p-4 transition ${
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
                      : "bg-white border border-slate-200"
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
  );
}