"use client";

import { useState } from "react";

type Props = {
  item: {
    title: string;
    workflow: string;
    type: string;
    priority: string;
    target: string;
    suggestedMessage: string;
    reason: string;
    confidence: number;
    status: string;
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

  async function executeAiAction() {
    try {
      setExecuting(true);
      setResult("");
      setExecutionMode("");
      setExecutedAt("");
      setLogStatus("");

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

      if (json?.ok) {
        setResult(json.generatedMessage || "AI action generated.");
        setExecutionMode(json.executionMode || "approval-required");
        setExecutedAt(json.createdAt || new Date().toISOString());

        const logRes = await fetch("/api/ai/procurement-task-execution-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task: item.title,
            action: json.generatedMessage || "AI action generated.",
            status: "generated",
            priority: item.priority,
            mode: json.executionMode || "approval-required",
            confidence: item.confidence,
          }),
        });

        const logJson = await logRes.json();

        setLogStatus(
          logJson?.ok
            ? "Execution logged successfully."
            : "Execution generated but log was not saved."
        );
      } else {
        setResult(json?.error || "AI execution failed.");
      }
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
          <div className="text-xl font-black text-slate-950">
            {item.title}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            {item.workflow} • {item.type} • target: {item.target}
          </div>
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

        {logStatus ? (
          <div className="md:col-span-3">
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
              Execution Log
            </div>

            <div className="mt-1 text-sm font-black text-emerald-950">
              {logStatus}
            </div>
          </div>
        ) : null}

            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                Status
              </div>
              <div className="mt-1 text-sm font-black text-emerald-950">
                Generated
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
          </div>
        </div>
      ) : null}

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