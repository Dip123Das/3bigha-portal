type Item = {
  label: string;
  value: string | number;
  tone?: "danger" | "warning" | "safe" | "info";
};

type Props = {
  title?: string;
  items: Item[];
};

function toneClass(tone?: string) {
  if (tone === "danger") return "proc-sticky-danger";
  if (tone === "warning") return "proc-sticky-warning";
  if (tone === "safe") return "proc-sticky-safe";
  return "proc-sticky-info";
}

export default function StickyExecutiveActions({
  title = "Executive Operational State",
  items,
}: Props) {
  return (
    <div className="proc-shell proc-sticky-actions">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {title}
          </div>

          <div className="mt-1 text-sm font-semibold text-slate-700">
            Persistent procurement command continuity layer
          </div>
        </div>
      </div>

      <div className="proc-sticky-grid mt-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
          >
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              {item.label}
            </span>

            <span className={`proc-sticky-pill ${toneClass(item.tone)}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
