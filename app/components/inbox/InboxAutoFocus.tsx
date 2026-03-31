"use client";

import { useEffect } from "react";

export default function InboxAutoFocus({
  targetId,
}: {
  targetId: string | null;
}) {
  useEffect(() => {
    if (!targetId) return;

    const el = document.getElementById(targetId);
    if (!el) return;

    setTimeout(() => {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 200);
  }, [targetId]);

  return null;
}