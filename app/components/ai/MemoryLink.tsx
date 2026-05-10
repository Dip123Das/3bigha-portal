"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type MemoryLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;

  module?: string;
  entityId?: string;
  entityTitle?: string;
  category?: string;
  type?: string;
  city?: string;
  district?: string;
  locality?: string;
  source?: string;
  score?: number | null;
};

function getSessionId() {
  try {
    const key = "3bigha_ai_memory_session_id";
    const existing = localStorage.getItem(key);

    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(key, id);
    return id;
  } catch {
    return null;
  }
}

export default function MemoryLink({
  href,
  children,
  className,
  style,

  module,
  entityId,
  entityTitle,
  category,
  type,
  city,
  district,
  locality,
  source,
  score,
}: MemoryLinkProps) {
  async function trackClick() {
    try {
      await fetch("/api/ai/memory-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          eventType: "recommendation_click",
          module,
          entityId,
          entityTitle,
          category,
          type,
          city,
          district,
          locality,
          score:
            typeof score === "number"
              ? score
              : null,
          metadata: {
            source: source || "memory_link",
            href,
          },
        }),
      });
    } catch {
      // silent tracking failure
    }
  }

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => {
        void trackClick();
      }}
    >
      {children}
    </Link>
  );
}