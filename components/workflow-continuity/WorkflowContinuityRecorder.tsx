"use client";

import { useEffect } from "react";
import type { WorkflowContinuityState } from "@/lib/workflow-continuity/types";
import { saveWorkflowContinuity } from "@/lib/workflow-continuity/storage";

export default function WorkflowContinuityRecorder({
  state,
}: {
  state: WorkflowContinuityState;
}) {
  useEffect(() => {
    saveWorkflowContinuity(state);
    window.dispatchEvent(new Event("workflow-continuity-updated"));
  }, [state]);

  return null;
}
