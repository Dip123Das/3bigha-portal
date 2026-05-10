"use client";

import { useEffect, useState } from "react";

export default function LiveProcurementRefreshBadge({
  label = "AI OS live",
}: {
  label?: string;
}) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      setTime(
        new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    };

    update();

    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-800">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      {label} • Updated {time || "now"}
    </div>
  );
}