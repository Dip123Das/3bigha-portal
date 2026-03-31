"use client";

import React from "react";
import ReminderActions from "@/app/components/inbox/ReminderActions";
import RefreshAiButton from "@/app/components/inbox/RefreshAiButton";
import InboxAiAction from "@/app/components/inbox/InboxAiAction";
import InboxAiSummary from "@/app/components/inbox/InboxAiSummary";
import InboxAutoReminderSuggestion from "@/app/components/inbox/InboxAutoReminderSuggestion";
import ThreadDueReminderState, {
  ThreadDueReminderBadge,
} from "@/app/components/inbox/ThreadDueReminderState";

export type UnifiedInboxItem = {
  id: string;
  module: "investment" | "rfq" | "direct";
  side: "investor" | "builder" | "vendor" | "buyer";
  title: string;
  subtitle: string;
  counterpart: string;
  statusLabel: string;
  stageLabel?: string;
  unreadCount: number;
  lastActivityAt: string | null;
  href: string;
  badgeTone: "blue" | "emerald" | "amber" | "violet" | "slate";
  metaLine?: string;
  priorityScore?: number;
  aiTag?: string;
  suggestedAction?: string;
  automationLabel?: string;
  automationTone?: "rose" | "amber" | "blue" | "emerald" | "slate" | "violet";
  automationPriority?: number;
  priorityLabel?: "Critical" | "High" | "Medium" | "Low";
  priorityTone?: "rose" | "amber" | "blue" | "slate";
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

function titleCase(v?: string | null) {
  const s = String(v ?? "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!s) return "—";
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}

function toneClass(tone: UnifiedInboxItem["badgeTone"]) {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "violet") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (tone === "slate") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function suggestedActionClass(action?: string) {
  if (action === "Reply now") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (action === "Review quote") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (action === "Check investment stage" || action === "Review deal room") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (action === "Follow up" || action === "Monitor") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function automationToneClass(
  tone?: UnifiedInboxItem["automationTone"]
) {
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "violet") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function priorityToneClass(
  tone?: UnifiedInboxItem["priorityTone"]
) {
  if (tone === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function InboxThreadCard({
  item,
  showAiSummary = false,
}: {
  item: UnifiedInboxItem;
  showAiSummary?: boolean;
}) {
  return (
    <ThreadDueReminderState
      threadId={item.id}
      href={item.href}
      module={item.module}
      priorityLabel={item.priorityLabel}
      unreadCount={item.unreadCount}
    >
      <a
        href={item.href}
        className="block transition hover:opacity-95"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">
              {item.title}
            </h3>

            {item.aiTag ? (
              <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                {item.aiTag}
              </span>
            ) : null}

            {item.priorityLabel ? (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityToneClass(
                  item.priorityTone
                )}`}
              >
                Priority: {item.priorityLabel}
              </span>
            ) : null}

            {typeof item.priorityScore === "number" ? (
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Score: {item.priorityScore}
              </span>
            ) : null}

            {item.unreadCount > 0 ? (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(
                  item.badgeTone
                )}`}
              >
                {item.unreadCount === 1
                  ? "1 unread"
                  : `${item.unreadCount} unread`}
              </span>
            ) : null}

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass(
                item.badgeTone
              )}`}
            >
              {titleCase(item.module)}
            </span>

            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {titleCase(item.side)}
            </span>

            {item.suggestedAction ? (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${suggestedActionClass(
                  item.suggestedAction
                )}`}
              >
                {item.suggestedAction}
              </span>
            ) : null}

            {item.automationLabel ? (
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${automationToneClass(
                  item.automationTone
                )}`}
              >
                {item.automationLabel}
              </span>
            ) : null}

            <ThreadDueReminderBadge threadId={item.id} />

            {item.stageLabel ? (
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {item.stageLabel}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-slate-600">{item.subtitle}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RefreshAiButton
              threadId={item.id}
              unreadCount={item.unreadCount}
              stageLabel={item.stageLabel}
              statusLabel={item.statusLabel}
              metaLine={item.metaLine}
            />
          </div>

          {showAiSummary || item.unreadCount > 0 ? (
            <InboxAiSummary
              threadId={item.id}
              title={item.title}
              subtitle={item.subtitle}
              counterpart={item.counterpart}
              statusLabel={item.statusLabel}
              stageLabel={item.stageLabel}
              module={item.module}
              side={item.side}
              unreadCount={item.unreadCount}
              metaLine={item.metaLine}
            />
          ) : null}

          {showAiSummary || item.unreadCount > 0 ? (
            <InboxAiAction
              threadId={item.id}
              title={item.title}
              subtitle={item.subtitle}
              counterpart={item.counterpart}
              statusLabel={item.statusLabel}
              stageLabel={item.stageLabel}
              module={item.module}
              side={item.side}
              unreadCount={item.unreadCount}
              metaLine={item.metaLine}
            />
          ) : null}

          <div className="mt-3">
            <InboxAutoReminderSuggestion
              threadId={item.id}
              module={item.module}
              unreadCount={item.unreadCount}
              lastActivityAt={item.lastActivityAt}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Counterpart
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {item.counterpart}
              </div>
              <div className="mt-1 text-xs text-slate-500">Connected user</div>
            </div>

            <ReminderActions threadId={item.id} />

            <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Last Activity
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {fmtDateTime(item.lastActivityAt)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Latest known activity
              </div>
            </div>

            <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Details
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {item.metaLine || "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Source metadata
              </div>
            </div>

            <div className="min-h-[84px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Open
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                Continue thread
              </div>
              <div className="mt-1 text-xs text-slate-500">Open →</div>
            </div>
          </div>
        </div>
        </div>
      </a>
    </ThreadDueReminderState>
  );
}