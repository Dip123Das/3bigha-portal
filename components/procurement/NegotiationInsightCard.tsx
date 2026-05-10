// components/procurement/NegotiationInsightCard.tsx

"use client";

type Props = {
  item: {
    title: string;
    leverage: string;
    pressure: string;
    closureProbability: number;
    aiStrategy: string;
    supplierRisk: string;
  };
};

export default function NegotiationInsightCard({
  item,
}: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.title}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            Negotiation leverage: {item.leverage}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.pressure}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-violet-50 p-5">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
            AI Strategy
          </div>

          <div className="mt-3 text-lg font-black text-violet-950">
            {item.aiStrategy}
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50 p-5">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">
            Supplier Risk
          </div>

          <div className="mt-3 text-lg font-black text-rose-950">
            {item.supplierRisk}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
          <span>Closure Probability</span>
          <span>{item.closureProbability}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-950"
            style={{
              width: `${item.closureProbability}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}