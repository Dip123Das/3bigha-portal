type Props = {
  title: string;
  priority: number;
  level: "stable" | "attention" | "priority" | "critical";
  children: React.ReactNode;
};

function levelClasses(level: Props["level"]) {
  if (level === "critical") {
    return "border-rose-300 bg-rose-50";
  }

  if (level === "priority") {
    return "border-amber-300 bg-amber-50";
  }

  if (level === "attention") {
    return "border-sky-300 bg-sky-50";
  }

  return "border-slate-200 bg-white";
}

export default function ExecutivePrioritySurface({
  title,
  priority,
  level,
  children,
}: Props) {
  return (
    <section
      className={`proc-shell proc-shell-section transition-all ${levelClasses(level)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Executive Priority
          </div>

          <h2 className="mt-1 text-lg font-black text-slate-900">
            {title}
          </h2>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
          {level.toUpperCase()} · {Math.round(priority)}
        </div>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}
