"use client";

type Props = {
  priority: "high" | "medium" | "low";
};

export default function ProcurementPriorityBadge({
  priority,
}: Props) {
  const cls =
    priority === "high"
      ? "bg-red-100 text-red-800"
      : priority === "medium"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${cls}`}>
      {priority}
    </span>
  );
}
