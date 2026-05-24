"use client";

type Props = {
  label: string;
  value: number;
  color?: string;
};

export default function DrawingRoomBadge({
  label,
  value,
  color = "bg-violet-100 text-violet-800",
}: Props) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${color}`}
    >
      <div className="text-xs font-black uppercase tracking-[0.14em]">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black">
        {value}
      </div>
    </div>
  );
}
