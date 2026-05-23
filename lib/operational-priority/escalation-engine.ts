export type OperationalEscalationLevel =
  | "urgent"
  | "high"
  | "medium"
  | "low"
  | "stable";

export type OperationalEscalationItem = {
  level: OperationalEscalationLevel;
  title: string;
  detail: string;
  href?: string;
  score: number;
};

function buildLevel(score: number): OperationalEscalationLevel {
  if (score >= 90) return "urgent";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 20) return "low";
  return "stable";
}

export function buildOperationalEscalations(input: {
  unread?: number;
  stale?: number;
  highRisk?: number;
  pendingQuotes?: number;
  activeThreads?: number;
  href?: string;
}): OperationalEscalationItem[] {
  const rows: OperationalEscalationItem[] = [];

  if ((input.highRisk || 0) > 0) {
    const score = Math.min(100, 70 + input.highRisk! * 8);

    rows.push({
      level: buildLevel(score),
      score,
      title: "High-risk workflow detected",
      detail: `${input.highRisk} operational workflow(s) may require immediate review.`,
      href: input.href,
    });
  }

  if ((input.stale || 0) > 0) {
    const score = Math.min(100, 50 + input.stale! * 5);

    rows.push({
      level: buildLevel(score),
      score,
      title: "Delayed follow-up detected",
      detail: `${input.stale} workflow(s) appear inactive or delayed.`,
      href: input.href,
    });
  }

  if ((input.unread || 0) > 0) {
    const score = Math.min(100, 35 + input.unread! * 4);

    rows.push({
      level: buildLevel(score),
      score,
      title: "Unread operational communication",
      detail: `${input.unread} unread operational item(s) waiting.`,
      href: input.href,
    });
  }

  if ((input.pendingQuotes || 0) > 0) {
    const score = Math.min(100, 25 + input.pendingQuotes! * 3);

    rows.push({
      level: buildLevel(score),
      score,
      title: "Quotation review pending",
      detail: `${input.pendingQuotes} quotation decision(s) pending.`,
      href: input.href,
    });
  }

  if (!rows.length && (input.activeThreads || 0) > 0) {
    rows.push({
      level: "stable",
      score: 5,
      title: "Operational workflows stable",
      detail: `${input.activeThreads} active workflow(s) currently stable.`,
      href: input.href,
    });
  }

  return rows.sort((a, b) => b.score - a.score).slice(0, 5);
}
