import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function getUserPushTokens(userId: string) {
  if (!userId) {
    return [];
  }

  const { data, error } = await admin
    .from("user_push_tokens")
    .select("fcm_token")
    .eq("user_id", userId)
    .eq("notification_enabled", true);

  if (error) {
    console.error("Push token fetch failed", error);
    return [];
  }

  return (data || [])
    .map((x) => x.fcm_token)
    .filter(Boolean);
}