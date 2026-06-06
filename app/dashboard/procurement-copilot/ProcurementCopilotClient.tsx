"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CopilotResponse = {
  ok?: boolean;
  question?: string;
  intent?: string;
  answer?: string;
  recommendations?: {
    nextBestAction?: string;
    forecast?: string;
  };
  topRiskItems?: any[];
  topClosureItems?: any[];
  error?: string;
};

const EXAMPLES = [
  "What needs urgent attention today?",
  "Which RFQs are likely to close?",
  "Which vendors or suppliers look reliable?",
  "Show me procurement risks.",
  "Forecast next week procurement pipeline.",
];

export default function ProcurementCopilotClient() {
  const [question, setQuestion] = useState(EXAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CopilotResponse | null>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [operator, setOperator] = useState<any>(null);

  useEffect(() => {
    fetch("/api/ai/procurement-copilot-briefing", {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setBriefing)
      .catch(() => setBriefing(null));

    fetch("/api/ai/procurement-operator-intelligence", {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then(setOperator)
      .catch(() => setOperator(null));
  }, []);

  async function askCopilot(q?: string) {
    const finalQuestion = String(q || question || "").trim();
    if (!finalQuestion) return;

    setQuestion(finalQuestion);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/procurement-copilot-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ question: finalQuestion }),
      });

      const json = await res.json();
      setData(json);
    } catch {
      setData({
        ok: false,
        error: "Copilot failed to respond.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Executive Focus
            </div>
            <div className="mt-1 text-sm font-black">
              Critical workflows • Recovery pressure • Governance load • AI supervision active
            </div>
          </div>
          <div className="text-[11px] font-bold text-slate-300">
            Calm supervised procurement intelligence
          </div>
        </div>
      </div>
      <div className={`rounded-2xl border p-4 shadow-sm ${
        briefing?.briefing?.operationalState === "critical"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : briefing?.briefing?.operationalState === "watch"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Proactive Procurement Copilot
            </div>

            <div className="mt-1 text-xl font-black">
              {briefing?.briefing?.operationalState || "stable"} · {briefing?.briefing?.predictiveRisk || "low"}
            </div>

            <div className="mt-2 text-sm font-semibold leading-5">
              {briefing?.briefing?.summary ||
                "Procurement copilot is monitoring operations under supervised governance."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-[11px] font-black">
              Approvals {briefing?.briefing?.approvalRequired || 0}
            </span>

            <span className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-[11px] font-black">
              Fatigue {briefing?.briefing?.fatigue || 0}
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(briefing?.briefing?.priorities || [
            "Continue supervised procurement monitoring.",
          ])
            .slice(0, 4)
            .map((priority: string) => (
              <div
                key={priority}
                className="rounded-xl border border-white/40 bg-white/45 px-3 py-2 text-xs font-bold"
              >
                {priority}
              </div>
            ))}
        </div>

        <div className="mt-3 rounded-xl border border-white/40 bg-white/45 px-3 py-2 text-xs font-black">
          {briefing?.executiveDirective ||
            "Continue supervised procurement monitoring."}
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-700">
              Operator Intelligence
            </div>

            <div className="mt-1 text-xl font-black text-indigo-950">
              {operator?.operatorIntelligence?.profile || "monitoring-focused"}
            </div>

            <div className="mt-2 text-sm font-semibold leading-5 text-indigo-900">
              {operator?.operatorIntelligence?.operationalStyle ||
                "Copilot is adapting to supervised procurement operations."}
            </div>
          </div>

          <div className="rounded-xl border border-white bg-white px-4 py-2 text-xs font-black text-indigo-700">
            {operator?.operatorIntelligence?.copilotMode || "supervised-assist"}
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-white bg-white/80 px-3 py-2 text-xs font-black text-slate-700">
            Approvals {operator?.operatorIntelligence?.approvalRequired || 0}
          </div>

          <div className="rounded-xl border border-white bg-white/80 px-3 py-2 text-xs font-black text-slate-700">
            Fatigue {operator?.operatorIntelligence?.fatigue || 0}
          </div>

          <div className="rounded-xl border border-white bg-white/80 px-3 py-2 text-xs font-black text-slate-700">
            Risk {operator?.operatorIntelligence?.predictiveRisk || "low"}
          </div>

          <div className="rounded-xl border border-white bg-white/80 px-3 py-2 text-xs font-black text-slate-700">
            Recovery {operator?.operatorIntelligence?.recoveryPressure || 0}
          </div>
        </div>

        {Array.isArray(operator?.operatorIntelligence?.explainability) &&
        operator.operatorIntelligence.explainability.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {operator.operatorIntelligence.explainability
              .slice(0, 4)
              .map((reason: string) => (
                <div
                  key={reason}
                  className="rounded-xl border border-white bg-white/80 px-3 py-2 text-xs font-bold text-indigo-900"
                >
                  {reason}
                </div>
              ))}
          </div>
        ) : null}
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-black text-slate-900">
          Ask procurement question
        </label>

        <div className="mt-2 flex flex-col gap-2 md:flex-row">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[42px] flex-1 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500"
            placeholder="Ask: What needs attention today?"
          />

          <button
            type="button"
            onClick={() => askCopilot()}
            disabled={loading}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? "Thinking..." : "Ask Copilot"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => askCopilot(item)}
              className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 transition hover:opacity-90"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {data.ok ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-black text-white">
                  Intent: {data.intent || "summary"}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-sm font-black text-emerald-800">
                  Copilot Answer
                </div>
                <div className="mt-1.5 text-sm font-semibold leading-5 text-emerald-950">
                  {data.answer}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="text-sm font-black text-blue-800">
                    Next Best Action
                  </div>
                  <div className="mt-1.5 text-sm font-semibold leading-5 text-blue-950">
                    {data.recommendations?.nextBestAction || "Open inbox and review active procurement threads."}
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="text-sm font-black text-violet-800">
                    Forecast
                  </div>
                  <div className="mt-1.5 text-sm font-semibold leading-5 text-violet-950">
                    {data.recommendations?.forecast || "Forecast unavailable."}
                  </div>
                </div>
              </div>

              <ResultList title="Top Risk Items" items={data.topRiskItems || []} />
              <ResultList title="Top Closure Items" items={data.topClosureItems || []} />
            </>
          ) : (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">
              {data.error || "Copilot failed."}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: any[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-black text-slate-900">{title}</div>

      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href || "/dashboard/inbox-v2"}
            className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
          >
            <div className="text-sm font-black text-slate-950">
              {item.title || "Procurement thread"}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">
              {item.module || item.risk || item.projectedStatus || "Procurement intelligence"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}