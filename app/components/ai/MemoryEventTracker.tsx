"use client";

import { useEffect } from "react";

type MemoryEventTrackerProps = {
  eventType:
    | "listing_view"
    | "recommendation_click"
    | "rfq_created"
    | "rfq_compare"
    | "chat_open"
    | "chat_message"
    | "vendor_interaction"
    | "procurement_action"
    | "search"
    | "shortlist";

  module?: string;
  entityId?: string;
  entityTitle?: string;
  category?: string;
  type?: string;
  city?: string;
  district?: string;
  locality?: string;
  metadata?: Record<string, any>;
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

export default function MemoryEventTracker(props: MemoryEventTrackerProps) {
  useEffect(() => {
    let cancelled = false;

    const track = async () => {
      try {
        const sessionId = getSessionId();

        if (cancelled) return;

        await fetch("/api/ai/memory-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            eventType: props.eventType,
            module: props.module,
            entityId: props.entityId,
            entityTitle: props.entityTitle,
            category: props.category,
            type: props.type,
            city: props.city,
            district: props.district,
            locality: props.locality,
            metadata: props.metadata || {},
            score:
              typeof props.score === "number"
                ? props.score
                : null,
          }),
        });
      } catch {
        // silent tracking failure
      }
    };

    track();

    return () => {
      cancelled = true;
    };
  }, [
    props.eventType,
    props.module,
    props.entityId,
    props.entityTitle,
    props.category,
    props.type,
    props.city,
    props.district,
    props.locality,
    props.score,
  ]);

  return null;
}