"use server";

import { createClient } from "@/utils/supabase/server";

export async function markRfqViewedAction(rfqId: string) {
  if (!rfqId) throw new Error("rfqId is required");

  const supabase = await createClient();

  // Uses your existing DB RPC: mark_rfq_viewed
  // If your param name differs, change only p_rfq_id key.
  const { error } = await supabase.rpc("mark_rfq_viewed", { p_rfq_id: rfqId });

  if (error) throw new Error(error.message);

  return { ok: true };
}