"use client";

import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import { useEffect, useState } from "react";

export default function ProcurementRealExecutionPage() {
  const [readiness, setReadiness] =
    useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-execution-readiness")
      .then((r) => r.json())
      .then(setReadiness);
  }, []);
  return (
    <main className="min-h-screen bg-[#f6f7fb] p-4 md:p-5">
      <div className="w-full">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-emerald-950 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Real Autonomous Procurement Execution
          </div>

          <h1 className="mt-5 text-3xl md:text-5xl font-black">
            Real AI Execution Bridge
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Bridge layer prepared for injecting autonomous AI procurement
            messages into real unified conversations, RFQ chats and workflow
            execution streams.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-bold text-slate-100">
            Current mode: safe preview. Real injection activates when
            conversationId is connected from Unified Inbox / RFQ threads.
          </div>
        </div>

        <div className="mt-6">
          <ProcurementCommandCenterNav />
        </div>

                <div className="mt-6 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">
            AI Recovery Execution Readiness
          </div>

          <div className="mt-2 text-xl font-black text-emerald-950">
            Procurement recovery execution bridge is ready for autonomous stabilization workflows.
          </div>

          <div className="mt-3 text-xs font-semibold leading-5 text-emerald-900">
            Crisis escalation, supplier recovery, emergency rerouting and AI operational stabilization
            are now connected into real execution readiness orchestration.
          </div>
        </div>

                <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-5">
          <Metric
            label="Readiness"
            value={
              readiness?.readiness?.readinessScore || 0
            }
          />

          <Metric
            label="Execution Pressure"
            value={
              readiness?.readiness
                ?.executionPressure || 0
            }
          />

          <Metric
            label="Stabilization"
            value={
              readiness?.readiness
                ?.stabilizationReadiness || 0
            }
          />

          <Metric
            label="AI Executions"
            value={
              readiness?.readiness
                ?.autonomousExecutions || 0
            }
          />

          <Metric
            label="Active Threads"
            value={
              readiness?.readiness
                ?.activeConversations || 0
            }
          />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Card
            title="Execution API"
            value="/api/ai/execute-task"
            text="Ready to inject generated AI messages into conversation_messages."
          />

          <Card
            title="Current Safety Mode"
            value="Preview"
            text="No real message is sent unless a valid conversationId is provided."
          />

          <Card
            title="Next Connection"
            value="Unified Inbox"
            text="Connect real thread conversationId to execute AI action buttons."
          />
        </div>

                <div className="mt-6 rounded-[1.75rem] border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <div className="text-sm font-black uppercase tracking-[0.14em] text-indigo-700">
            Autonomous Procurement Decision Execution
          </div>

          <div className="mt-2 text-xl font-black text-indigo-950">
            AI operational decisions are now connected to execution readiness orchestration.
          </div>

          <div className="mt-3 text-xs font-semibold leading-5 text-indigo-900">
            Follow-up, rerouting, negotiation, escalation and recovery decisions
            are now synchronized with autonomous execution infrastructure.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="/dashboard/procurement-autonomous-tasks"
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
          >
            Open Pending Tasks
          </a>

          <a
            href="/dashboard/procurement-task-execution-log"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-800"
          >
            Open Activity Log
          </a>

          <a
            href="/dashboard/inbox-v2"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-800"
          >
            Open Unified Inbox
          </a>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-black text-slate-950">
        {value}
      </div>

      <div className="mt-3 text-sm font-semibold leading-6 text-slate-500">
        {text}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}