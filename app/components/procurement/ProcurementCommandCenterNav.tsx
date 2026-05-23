"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/dashboard/procurement-os",
    label: "Procurement Workspace",
    emoji: "🧭",
    description: "Master command index for all AI procurement modules",
  },
  {
    href: "/dashboard/procurement-situation-room",
    label: "Work Updates",
    emoji: "🚨",
    description: "Unified live procurement command center",
  },
  {
    href: "/dashboard/procurement-live",
    label: "Live Stream",
    emoji: "⚡",
    description: "Real-time procurement event signals",
  },
  {
    href: "/dashboard/procurement-timeline",
    label: "Timeline Replay",
    emoji: "🕒",
    description: "Chronological procurement event replay",
  },
  {
    href: "/dashboard/procurement-briefing",
    label: "Work Summary",
    emoji: "📋",
    description: "Procurement summary",
  },
  {
    href: "/dashboard/procurement-heatmap",
    label: "Heatmap AI",
    emoji: "🔥",
    description: "Procurement category, zone and risk heatmap",
  },
  {
    href: "/dashboard/procurement-control-tower",
    label: "Operations Desk",
    emoji: "🧠",
    description: "Executive procurement intelligence",
  },
  {
    href: "/dashboard/procurement-mission-control",
    label: "Operations",
    emoji: "🛰️",
    description: "Unified executive procurement command center",
  },
  {
    href: "/dashboard/procurement-actions",
    label: "Pending Actions",
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
    label: "Shortage Forecast",
    emoji: "📈",
    description: "Predictive shortage and supplier stress forecasting",
  },
  {
    href: "/dashboard/procurement-copilot",
    label: "Assistant",
    emoji: "🤖",
    description: "Ask procurement intelligence questions",
  },
  {
    href: "/dashboard/procurement-anomaly",
    label: "Anomaly Engine",
    emoji: "🚨",
    description: "Operational procurement anomaly detection",
  },
  {
    href: "/dashboard/inbox-v2",
    label: "Inbox Work Desk",
    emoji: "📬",
    description: "Unified procurement execution inbox",
  },
  {
    href: "/dashboard/procurement-followup-agent",
    label: "Follow-up AI",
    emoji: "🤖",
    description: "AI follow-up recommendations",
  },
  {
    href: "/dashboard/procurement-inbox-actions",
    label: "Inbox AI",
    emoji: "📥",
    description: "Inbox workflow guidance",
  },
  {
    href: "/dashboard/procurement-negotiation-agent",
    label: "Negotiation AI",
    emoji: "🤝",
    description: "Negotiation guidance",
  },
  {
    href: "/dashboard/procurement-supplier-reliability",
    label: "Supplier AI",
    emoji: "🏭",
    description: "Supplier reliability intelligence",
  },
  {
    href: "/dashboard/procurement-memory-intelligence",
    label: "Memory AI",
    emoji: "🧠",
    description: "Procurement memory intelligence",
  },
  {
    href: "/dashboard/procurement-closure-agent",
    label: "Closure AI",
    emoji: "✅",
    description: "AI closure readiness intelligence",
  },
  {
    href: "/dashboard/procurement-autonomous-tasks",
    label: "Auto Tasks",
    emoji: "🛠️",
    description: "Autonomous procurement task queue",
  },
  {
    href: "/dashboard/procurement-task-execution-log",
    label: "Task Log",
    emoji: "📜",
    description: "Workflow history log",
  },
  {
    href: "/dashboard/procurement-real-execution",
    label: "Real Execute",
    emoji: "🚀",
    description: "Real autonomous execution console",
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
                    active ? "bg-white/10" : "border border-slate-200 bg-white"
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