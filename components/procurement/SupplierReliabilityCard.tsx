// components/procurement/SupplierReliabilityCard.tsx

"use client";

type Props = {
  item: {
    supplier: string;
    reliability: number;
    deliveryConsistency: number;
    negotiationStability: number;
    operationalRisk: string;
    aiDirective: string;
  };
};

export default function SupplierReliabilityCard({
  item,
}: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.supplier}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            Operational Risk: {item.operationalRisk}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.reliability}%
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric
          title="Reliability"
          value={item.reliability}
        />

        <Metric
          title="Delivery"
          value={item.deliveryConsistency}
        />

        <Metric
          title="Negotiation"
          value={item.negotiationStability}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-violet-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
          AI Directive
        </div>

        <div className="mt-3 text-lg font-black text-violet-950">
          {item.aiDirective}
        </div>
      </div>
    </div>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {title}
      </div>

      <div className="mt-3 text-4xl font-black text-slate-950">
        {value}%
      </div>
    </div>
  );
}