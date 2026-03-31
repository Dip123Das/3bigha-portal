"use client";

type Props = {
  threadId: string;
  unreadCount: number;
  stageLabel?: string;
  statusLabel: string;
  metaLine?: string;
};

export default function RefreshAiButton({
  threadId,
  unreadCount,
  stageLabel,
  statusLabel,
  metaLine,
}: Props) {
  function handleRefresh() {
    const summaryKey = `ai_summary_${threadId}_${unreadCount}_${stageLabel ?? ""}_${statusLabel}_${metaLine ?? ""}`;
    const actionKey = `ai_action_${threadId}_${unreadCount}_${stageLabel ?? ""}_${statusLabel}_${metaLine ?? ""}`;

    localStorage.removeItem(summaryKey);
    localStorage.removeItem(actionKey);

    window.dispatchEvent(
      new CustomEvent("inbox-ai-refresh", {
        detail: { threadId },
      })
    );
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
    >
      Refresh AI
    </button>
  );
}