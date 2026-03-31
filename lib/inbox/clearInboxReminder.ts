export function clearInboxReminder(threadId: string) {
  if (typeof window === "undefined" || !threadId) return;

  try {
    const raw = window.localStorage.getItem("inbox_reminders");
    if (!raw) return;

    const parsed = JSON.parse(raw) as Record<
      string,
      { id?: string; dueAt?: number | string }
    >;

    if (!parsed[threadId]) return;

    delete parsed[threadId];
    window.localStorage.setItem("inbox_reminders", JSON.stringify(parsed));

    const now = Date.now();

    const dueThreadIds = Object.entries(parsed)
      .filter(([, value]) => {
        const rawDueAt = value?.dueAt;
        const dueAt =
          typeof rawDueAt === "number"
            ? rawDueAt
            : typeof rawDueAt === "string"
            ? Number(rawDueAt)
            : NaN;

        return Number.isFinite(dueAt) && dueAt <= now;
      })
      .map(([id]) => id);

    const detail = {
      dueCount: dueThreadIds.length,
      dueThreadIds,
      now,
    };

    window.dispatchEvent(
      new CustomEvent("inbox-reminder-cleared", { detail })
    );
    window.dispatchEvent(
      new CustomEvent("inbox-reminders-mutated", { detail })
    );
    window.dispatchEvent(
      new CustomEvent("inbox-reminders-updated", { detail })
    );
    window.dispatchEvent(
      new CustomEvent("inbox-v2-reminders-updated", { detail })
    );
  } catch {
    // no-op
  }
}