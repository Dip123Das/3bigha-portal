"use client";

import type { ConstructionRiskForecast } from "@/lib/construction-cost/risk-forecast-engine";

type Props = {
  forecast: ConstructionRiskForecast | null;
  loading?: boolean;
};

function RiskBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function ConstructionRiskRadar({ forecast, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Risk Radar</div>
        <p className="mt-2 text-sm text-slate-500">Forecasting construction risks...</p>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">AI Risk Radar</div>
        <p className="mt-2 text-sm text-slate-500">No forecast data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Predictive Construction AI
          </div>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Risk Forecast Radar
          </h3>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">
          {forecast.overallForecastRisk} risk
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <RiskBar label="Delay probability" value={forecast.delayProbability} />
        <RiskBar label="Budget overrun probability" value={forecast.budgetOverrunProbability} />
        <RiskBar label="Material shortage probability" value={forecast.materialShortageProbability} />
        <RiskBar label="Labour risk probability" value={forecast.labourRiskProbability} />
        <RiskBar label="Contractor performance risk" value={forecast.contractorPerformanceRisk} />
      </div>

      <div className="mt-5">
        <div className="text-sm font-black text-slate-900">Next best actions</div>
        <div className="mt-3 space-y-2">
          {forecast.nextBestActions.length ? (
            forecast.nextBestActions.map((action) => (
              <div key={action} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {action}
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              No urgent predictive risk detected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
