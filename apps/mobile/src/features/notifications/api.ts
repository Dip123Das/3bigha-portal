import type { Session } from "@supabase/supabase-js";

export type PushDeviceState = { registered: boolean; enabled: boolean; lastSeenAt?: string | null };

function origin() {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("The approved 3Bigha API URL is not configured.");
  return value;
}

async function decode(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error?.message || "Notification settings could not be updated.");
  return body.data as PushDeviceState;
}

export function loadPushDevice(session: Session, deviceId: string) {
  return fetch(`${origin()}/api/v1/mobile/push-device?deviceId=${encodeURIComponent(deviceId)}`, { headers: { Authorization: `Bearer ${session.access_token}` } }).then(decode);
}

export function registerPushDevice(session: Session, input: Record<string, string>) {
  return fetch(`${origin()}/api/v1/mobile/push-device`, { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(input) }).then(decode);
}

export function disablePushDevice(session: Session, deviceId: string) {
  return fetch(`${origin()}/api/v1/mobile/push-device`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ deviceId }) }).then(decode);
}
