// components/procurement/MemoryInsightCard.tsx

"use client";

type Props = {
  item: {
    entity: string;
    type: string;
    memory: string;
    continuityScore: number;
    aiDirective: string;
  };
};

export default function MemoryInsightCard({
  item,
}: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.entity}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            Memory Type: {item.type}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.continuityScore}%
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-blue-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Procurement Memory
        </div>

        <div className="mt-3 text-lg font-black text-blue-950">
          {item.memory}
        </div>
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