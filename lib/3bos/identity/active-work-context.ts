import type { HumanIdentityKey } from "./types";
import type { WorkspaceKey } from "../workspace";

const ACTIVE_WORK_CONTEXT_SESSION_KEY =
  "3bos.active-work-context.v1";

export type ActiveWorkContext = {
  version: 1;
  userId: string;
  identityKey: HumanIdentityKey;
  workspaceKey: WorkspaceKey;
};

export function readActiveWorkContext(
  userId: string
): ActiveWorkContext | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(
      ACTIVE_WORK_CONTEXT_SESSION_KEY
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActiveWorkContext>;

    if (
      parsed.version !== 1 ||
      parsed.userId !== userId ||
      typeof parsed.identityKey !== "string" ||
      typeof parsed.workspaceKey !== "string"
    ) {
      return null;
    }

    return parsed as ActiveWorkContext;
  } catch {
    return null;
  }
}

export function persistActiveWorkContext(
  context: ActiveWorkContext
): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      ACTIVE_WORK_CONTEXT_SESSION_KEY,
      JSON.stringify(context)
    );
  } catch {}
}

export function clearActiveWorkContext(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(
      ACTIVE_WORK_CONTEXT_SESSION_KEY
    );
  } catch {}
}
