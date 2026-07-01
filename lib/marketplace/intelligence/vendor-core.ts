export function clean(v: unknown) {
  return String(v ?? "").trim();
}

export function includesLoose(a: string, b: string) {
  const x = clean(a).toLowerCase();
  const y = clean(b).toLowerCase();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

export function getPlanBoost(row: any) {
  const plan = clean(row.subscription_plan).toLowerCase();
  const status = clean(row.subscription_status).toLowerCase();
  const expiresAt = clean(row.subscription_expires_at);

  const isActive =
    status === "active" &&
    (!expiresAt || new Date(expiresAt).getTime() >= Date.now());

  if (!isActive) return 0;

  if (plan === "hub_vendor" || plan === "platinum") return 20;
  if (plan === "premium_vendor" || plan === "gold") return 10;
  if (plan === "basic_vendor" || plan === "silver") return 5;

  return 0;
}

export function computeRiskScore(row: any) {
  let risk = 0;

  const name = clean(row.business_name);
  const desc = clean(row.description);

  if (!name || name.length < 3) risk += 20;
  if (!desc || desc.length < 15) risk += 15;

  if (!row.verified && clean(row.approval_status).toLowerCase() !== "approved") {
    risk += 20;
  }

  if (!row.city && !row.locality) {
    risk += 10;
  }

  if ((row.boost_priority || 0) > 30) {
    risk += 15;
  }

  return Math.min(100, risk);
}

export function computeReputationScore(row: any) {
  let rep = 50;

  const m = Array.isArray(row.vendor_performance_metrics)
    ? row.vendor_performance_metrics[0]
    : row.vendor_performance_metrics;

  if (m) {
    const totalMatches = Number(m.total_matches || 0);
    const totalSelected = Number(m.total_selected || 0);
    const totalConverted = Number(m.total_converted || 0);

    if (totalMatches > 0) {
      rep += (totalSelected / totalMatches) * 30;
    }

    if (totalSelected > 0) {
      rep += (totalConverted / totalSelected) * 20;
    }

    if (totalMatches > 20) {
      rep += 10;
    }
  }

  if (row.verified === true || clean(row.approval_status).toLowerCase() === "approved") {
    rep += 10;
  }

  if ((row.boost_priority || 0) > 0) {
    rep += 5;
  }

  return Math.max(0, Math.min(100, Math.round(rep)));
}

export function predictWinProbability(row: any, baseScore: number) {
  const m = row.vendor_performance_metrics;

  if (!m) return Math.min(0.6, baseScore / 100);

  const selectionRate =
    m.total_matches > 0 ? m.total_selected / m.total_matches : 0;

  const conversionRate =
    m.total_selected > 0 ? m.total_converted / m.total_selected : 0;

  const consistency =
    m.total_matches > 20 ? 1 : m.total_matches / 20;

  const probability =
    baseScore * 0.5 +
    selectionRate * 30 +
    conversionRate * 20;

  const normalized = Math.min(100, probability);

  return Math.round((normalized / 100) * consistency * 100) / 100;
}
