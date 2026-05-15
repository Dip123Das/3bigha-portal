"use client";

type Props = {
  feed: string[];
  loading?: boolean;
};

export default function ConstructionExecutionTimeline({ feed, loading = false }: Props) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="font-black text-slate-950">Execution Feed</div>
        <p className="mt-2 text-sm text-slate-500">Preparing daily execution feed...</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        Daily AI Feed
      </div>
      <h3 className="mt-1 text-xl font-black text-slate-950">
        Construction Execution Timeline
      </h3>

      <div className="mt-5 space-y-3">
        {feed.length ? (
          feed.map((item, index) => (
            <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                {index + 1}
              </div>
              <div className="text-sm font-semibold leading-6 text-slate-700">{item}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
            No execution feed available.
          </div>
        )}
      </div>
    </div>
  );
}
