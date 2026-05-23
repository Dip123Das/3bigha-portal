export type OperationalPriorityTone = "danger" | "warning" | "success" | "normal";

export type OperationalPriorityItem = {
  label: string;
  detail: string;
  href?: string;
  tone: OperationalPriorityTone;
};

export function buildOperationalPriorityItems(input: {
  unread?: number;
  highRisk?: number;
  stale?: number;
  pendingQuotes?: number;
  activeThreads?: number;
  fallbackHref?: string;
}): OperationalPriorityItem[] {
  const items: OperationalPriorityItem[] = [];

  if ((input.highRisk || 0) > 0) {
    items.push({
      label: "High-risk workflow needs review",
      detail: `${input.highRisk} item(s) may require urgent attention.`,
      href: input.fallbackHref,
      tone: "danger",
    });
  }

  if ((input.stale || 0) > 0) {
    items.push({
      label: "Follow-up may be required",
      detail: `${input.stale} conversation(s) appear inactive or delayed.`,
      href: input.fallbackHref,
      tone: "warning",
    });
  }

  if ((input.unread || 0) > 0) {
    items.push({
      label: "Unread operational messages",
      detail: `${input.unread} message(s) waiting for review.`,
      href: input.fallbackHref,
      tone: "warning",
    });
  }

  if ((input.pendingQuotes || 0) > 0) {
    items.push({
      label: "Quotation decision pending",
      detail: `${input.pendingQuotes} quotation item(s) may need comparison or action.`,
      href: input.fallbackHref,
      tone: "normal",
    });
  }

  if (!items.length && (input.activeThreads || 0) > 0) {
    items.push({
      label: "Workflows are active",
      detail: `${input.activeThreads} active workflow(s) are being monitored.`,
      href: input.fallbackHref,
      tone: "success",
    });
  }

  return items.slice(0, 4);
}

export function buildOperationalNextStep(input: {
  highRisk?: number;
  stale?: number;
  unread?: number;
  pendingQuotes?: number;
}) {
  if ((input.highRisk || 0) > 0) return "Review the highest-risk workflow first, then continue normal follow-up.";
  if ((input.stale || 0) > 0) return "Start with delayed conversations and send follow-up where required.";
  if ((input.unread || 0) > 0) return "Open unread messages and reply to the most important conversation first.";
  if ((input.pendingQuotes || 0) > 0) return "Compare pending quotations and move the best option toward negotiation.";
  return "Continue monitoring active workflows and keep operations moving calmly.";
}
