"use client";

import React, { useEffect, useState } from "react";

export default function LeadScore({ message }: { message: string }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const text = String(message || "").toLowerCase();

    let s = 40;

    if (text.includes("urgent") || text.includes("today") || text.includes("immediately")) s += 20;
    if (text.includes("price") || text.includes("rate") || text.includes("quotation")) s += 15;
    if (text.includes("call") || text.includes("phone") || text.includes("contact")) s += 10;
    if (text.includes("buy") || text.includes("order") || text.includes("confirm")) s += 15;

    setScore(Math.min(100, s));
  }, [message]);

  if (score === null) return null;

  const label = score >= 75 ? "Hot Lead" : score >= 55 ? "Warm Lead" : "Normal Lead";

  return (
    <div
      style={{
        marginTop: 8,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1e40af",
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 900,
      }}
    >
      🔥 {label}: {score}%
    </div>
  );
}