"use client";

import { useState } from "react";

type Props = {
  item: {
    id?: string;
    title: string;
    workflow: string;
    type: string;
    priority: string;
    target: string;
    suggestedMessage: string;
    reason: string;
    confidence: number;
    status: string;
    conversationId?: string;
    conversation_id?: string;
    rfqId?: string;
    rfq_id?: string;
  };
};

function mapAction(type: string) {
  if (type === "buyer_recovery") return "buyer_recovery";
  if (type === "supplier_replacement") return "alternate_supplier";
  if (type === "follow_up") return "follow_up";
  if (type === "vendor_escalation") return "vendor_escalation";
  if (type === "closure_nudge") return "closure_nudge";
  if (type === "negotiation_push") return "negotiation_push";
  return "follow_up";
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AutonomousTaskCard({ item }: Props) {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string>("");
  const [executionMode, setExecutionMode] = useState<string>("");
  const [executedAt, setExecutedAt] = useState<string>("");
  const [logStatus, setLogStatus] = useState<string>("");
    
  const [safetyMode, setSafetyMode] =
    useState<"preview" | "approved" | "executed">(
      "preview"
    );

  const conversationId = item.conversationId || item.conversation_id || "";
  const rfqId = item.rfqId || item.rfq_id || "";

  async function executeAiAction() {
    try {
      setExecuting(true);
      setResult("");
      setExecutionMode("");
      setExecutedAt("");
      setLogStatus("");

      const generatedMessage = result || item.suggestedMessage || "";

      const res = await fetch("/api/ai/autonomous-execution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: mapAction(item.type),
          threadTitle: item.workflow || item.title,
          target: item.target,
          severity: item.priority,
          confidence: item.confidence,
        }),
      });

      const json = await res.json();

      const finalMessage =
        json?.generatedMessage || generatedMessage || "AI action generated.";

      if (!json?.ok) {
        setResult(json?.error || "AI execution failed.");
        return;
      }

      setResult(finalMessage);
      setExecutionMode(json.executionMode || "approval-required");
      setExecutedAt(json.createdAt || new Date().toISOString());

      const executeRes = await fetch("/api/ai/execute-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          rfqId,
          taskId: item.id || item.title,
          message: finalMessage,
          actionType: mapAction(item.type),
          target: item.target,
          priority: item.priority,
          confidence: item.confidence,
          senderSide: "ai",
        }),
      });

      const executeJson = await executeRes.json();

      const logRes = await fetch("/api/ai/procurement-task-execution-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: item.title,
          action: finalMessage,
          status: executeJson?.mode === "executed" ? "executed" : "generated",
          priority: item.priority,
          mode: executeJson?.mode || json.executionMode || "preview",
          confidence: item.confidence,
          conversationId: conversationId || null,
          rfqId: rfqId || null,
        }),
      });

      const logJson = await logRes.json();

      setExecutionMode(executeJson?.mode || json.executionMode || "preview");
           
      setSafetyMode(
        executeJson?.mode === "executed"
          ? "executed"
          : "approved"
      );

      setLogStatus(
        executeJson?.mode === "executed"
          ? "Execution injected into live conversation and logged."
          : logJson?.ok
            ? "Execution generated and logged. Chat injection pending real conversationId."
            : executeJson?.error || "Execution generated but log was not saved."
      );
    } catch {
      setResult("AI execution failed.");
    } finally {
      setExecuting(false);
    }
  }

  async function copyMessage() {
    const message = result || item.suggestedMessage;

    try {
      await navigator.clipboard?.writeText(message);
      setResult(message);
      setSafetyMode("preview");
      if (!executedAt) {
        setExecutedAt(new Date().toISOString());
      }
    } catch {
      setResult(message);
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">{item.title}</div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            {item.workflow} • {item.type} • target: {item.target}
          </div>

          {conversationId ? (
            <div className="mt-2 text-xs font-black text-emerald-700">
              Live conversation linked
            </div>
          ) : (
            <div className="mt-2 text-xs font-black text-amber-700">
              No conversationId yet — preview/log mode only
            </div>
          )}
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.priority}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-blue-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Why AI recommends this
        </div>

        <div className="mt-3 text-sm font-bold text-blue-950">
          {item.reason}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-violet-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
          Suggested execution message
        </div>

        <div className="mt-3 text-sm font-bold leading-6 text-violet-950">
          {result || item.suggestedMessage}
        </div>
      </div>

      {result ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            AI Execution Result
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Mode
              </div>
              <div className="mt-1 text-sm font-black text-emerald-950">
                {executionMode || "manual-copy"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Status
              </div>
              <div className="mt-1 text-sm font-black text-emerald-950">
                {executionMode === "executed" ? "Injected" : "Generated"}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Time
              </div>
              <div className="mt-1 text-sm font-black text-emerald-950">
                {executedAt ? formatTime(executedAt) : "Just now"}
              </div>
            </div>

            {logStatus ? (
              <div className="md:col-span-3">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  Execution Log
                </div>

                <div className="mt-1 text-sm font-black text-emerald-950">
                  {logStatus}
                </div>

                {logStatus.includes("pending real conversationId") ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-800">
                    Real chat injection is ready. Next step: make
                    /api/ai/procurement-autonomous-tasks return conversationId
                    from unified inbox / RFQ conversation.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Execution Governance
            </div>

            <div className="mt-2 text-lg font-black text-slate-950">
              Autonomous Procurement Safety Layer
            </div>
          </div>

          <div
            className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${
              safetyMode === "executed"
                ? "bg-emerald-500 text-white"
                : safetyMode === "approved"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-900 text-white"
            }`}
          >
            {safetyMode}
          </div>
        </div>

        <div className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          AI procurement execution is running under controlled governance mode.
          Autonomous actions are visible, reviewable and execution-tracked.
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Confidence
          </div>

          <div className="mt-1 text-2xl font-black text-slate-950">
            {item.confidence}%
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={executeAiAction}
            disabled={executing}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {executing ? "Executing..." : "Execute AI Action"}
          </button>

          <button
            type="button"
            onClick={copyMessage}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Copy AI Message
          </button>

          <button
            type="button"
            onClick={() => {
              setResult(result || item.suggestedMessage);
              setExecutionMode("approved");
              setSafetyMode("approved");
              setExecutedAt(new Date().toISOString());
            }}
            className="rounded-full border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-black text-slate-800"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}