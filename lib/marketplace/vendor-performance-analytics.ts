type SupabaseLike = {
  from: (table: string) => any;
};

type RankHistoryRow = {
  user_id: string;
  rank: number | null;
  score: number | null;
  created_at: string | null;
};

function cleanNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function trendFor(rankDelta: number, scoreDelta: number) {
  if (rankDelta > 0 || scoreDelta >= 5) return "rising";
  if (rankDelta < 0 || scoreDelta <= -5) return "falling";
  return "stable";
}

export async function getVendorPerformanceAnalytics(
  supabase: SupabaseLike,
  vendorUserId: string,
) {
  const { data, error } = await supabase
    .from("vendor_rank_history")
    .select("user_id,rank,score,created_at")
    .eq("user_id", vendorUserId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = ((data || []) as RankHistoryRow[]).filter(
    (row) => row.rank != null && row.score != null,
  );

  const latest = rows[0] || null;
  const previous = rows[1] || null;

  const currentRank = latest ? cleanNumber(latest.rank) : null;
  const previousRank = previous ? cleanNumber(previous.rank) : null;
  const currentScore = latest ? cleanNumber(latest.score) : null;
  const previousScore = previous ? cleanNumber(previous.score) : null;

  const rankDelta =
    currentRank != null && previousRank != null
      ? previousRank - currentRank
      : 0;
  const scoreDelta =
    currentScore != null && previousScore != null
      ? currentScore - previousScore
      : 0;

  const scores = rows.map((row) => cleanNumber(row.score));
  const ranks = rows.map((row) => cleanNumber(row.rank));

  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;

  return {
    ok: true,
    vendorUserId,
    currentRank,
    previousRank,
    rankDelta,
    currentScore,
    previousScore,
    scoreDelta,
    bestRank: ranks.length ? Math.min(...ranks) : null,
    worstRank: ranks.length ? Math.max(...ranks) : null,
    highestScore: scores.length ? Math.max(...scores) : null,
    lowestScore: scores.length ? Math.min(...scores) : null,
    averageScore,
    trend: trendFor(rankDelta, scoreDelta),
    snapshotCount: rows.length,
    latestCapturedAt: latest?.created_at || null,
    history: rows.slice(0, 30),
  };
}
