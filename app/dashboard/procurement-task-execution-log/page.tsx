"use client";

import { useEffect, useState } from "react";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import TaskExecutionLogCard from "@/components/procurement/TaskExecutionLogCard";

export default function ProcurementTaskExecutionLogPage() {
  const [data, setData] = useState<any>(null);

    const [readiness, setReadiness] =
    useState<any>(null);

    useEffect(() => {
      Promise.all([
        fetch("/api/ai/procurement-task-execution-log")
          .then((r) => r.json()),

        fetch("/api/ai/procurement-execution-readiness")
          .then((r) => r.json()),
      ]).then(([logData, readinessData]) => {
        setData(logData);
        setReadiness(readinessData);
      });
    }, []);

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Procurement Execution Accountability
          </div>

          <h1 className="mt-6 text-5xl font-black">
            AI Task Execution Log
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Autonomous procurement task history, recovery action tracking,
            AI accountability and workflow execution audit intelligence.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveDirective}
          </div>
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>

                <div className="mt-8 grid gap-4 md:grid-cols-4">
          <ExecutionMetric
            label="AI Executions"
            value={
              readiness?.readiness
                ?.autonomousExecutions || 0
            }
          />

          <ExecutionMetric
            label="Execution Pressure"
            value={
              readiness?.readiness
                ?.executionPressure || 0
            }
          />

          <ExecutionMetric
            label="Readiness"
            value={
              readiness?.readiness
                ?.readinessScore || 0
            }
          />

          <ExecutionMetric
            label="Stabilization"
            value={
              readiness?.readiness
                ?.stabilizationReadiness || 0
            }
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/dashboard/procurement-autonomous-tasks"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Open Pending Tasks
          </a>

          <a
            href="/dashboard/procurement-mission-control"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Open Work Desk
          </a>
        </div>

        <div className="mt-8 space-y-6">
          {(data?.logs || []).map((item: any) => (
            <TaskExecutionLogCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </main>
  );
}

function ExecutionMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}