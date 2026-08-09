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

type SavePushTokenInput = {
  userId: string;
  token: string;
  role?: string | null;
  platform?: string;
  deviceId?: string | null;
  deviceName?: string | null;
  appVersion?: string | null;
};

export async function savePushToken({
  userId,
  token,
  role,
  platform = "android",
  deviceId,
  deviceName,
  appVersion,
}: SavePushTokenInput) {
  if (!userId || !token) {
    return;
  }

  if (deviceId) {
    const { error: retirementError } = await admin
      .from("user_push_tokens")
      .update({ notification_enabled: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("device_id", deviceId)
      .neq("fcm_token", token);
    if (retirementError) throw retirementError;
  }

  const { error } = await admin
    .from("user_push_tokens")
    .upsert(
      {
        user_id: userId,
        fcm_token: token,
        role: role || null,

        platform,

        device_id: deviceId || null,
        device_name: deviceName || null,
        app_version: appVersion || null,

        notification_enabled: true,

        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "fcm_token",
      }
    );

  if (error) throw error;
}

export async function getPushDeviceState(userId: string, deviceId: string) {
  const { data, error } = await admin
    .from("user_push_tokens")
    .select("notification_enabled,last_seen_at,platform,device_name,app_version")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function disablePushDevice(userId: string, deviceId: string) {
  const { error } = await admin
    .from("user_push_tokens")
    .update({ notification_enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_id", deviceId);
  if (error) throw error;
}
