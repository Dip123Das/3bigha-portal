"use client";

import { useEffect } from "react";
import type { OperationalEvent } from "@/lib/operational-events/types";
import { saveOperationalEvent } from "@/lib/operational-events/storage";

export default function OperationalEventRecorder({
  event,
}: {
  event: OperationalEvent;
}) {
  useEffect(() => {
    saveOperationalEvent(event);
  }, [event]);

  return null;
}
