import type { WorkflowContinuityState } from "./types";

const STORAGE_KEY = "3bigha_workflow_continuity_v1";

export function saveWorkflowContinuity(state: WorkflowContinuityState) {
  if (typeof window === "undefined") return;

  try {
    const cleanState: WorkflowContinuityState = {
      ...state,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
  } catch {
    // Ignore storage failures silently.
  }
}

export function getWorkflowContinuity(): WorkflowContinuityState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as WorkflowContinuityState;

    if (!parsed?.id || !parsed?.href || !parsed?.title) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearWorkflowContinuity() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures silently.
  }
}
