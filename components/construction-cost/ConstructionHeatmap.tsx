"use client";

type HeatmapItem = {
  label: string;
  value: number;
};

type Props = {
  items: HeatmapItem[];
  loading?: boolean;
};

export default function ConstructionHeatmap({ items, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">Construction Heatmap</div>
        <p className="mt-2 text-sm text-slate-500">Loading heatmap...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        Execution Heatmap
      </div>
      <h3 className="mt-1 text-xl font-black text-slate-950">
        Construction Risk Heatmap
      </h3>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-800">{item.label}</div>
              <div className="text-sm font-black text-slate-950">{item.value}%</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{ width: `${Math.max(4, Math.min(100, item.value))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
