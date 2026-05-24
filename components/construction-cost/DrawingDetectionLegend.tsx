"use client";

const ITEMS = [
  {
    label: "Bedroom",
    color: "bg-blue-500",
  },
  {
    label: "Bathroom",
    color: "bg-emerald-500",
  },
  {
    label: "Kitchen",
    color: "bg-orange-500",
  },
  {
    label: "Staircase",
    color: "bg-violet-500",
  },
  {
    label: "Lift Core",
    color: "bg-rose-500",
  },
  {
    label: "Parking",
    color: "bg-slate-700",
  },
];

export default function DrawingDetectionLegend() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        AI Detection Legend
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div
              className={`h-3 w-3 rounded-full ${item.color}`}
            />

            <div className="text-xs font-black text-slate-700">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
