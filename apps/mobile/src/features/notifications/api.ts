import type { Session } from "@supabase/supabase-js";
import { MobileRequestError, mobileApiRequest } from "@/lib/api/request";

export type PushDeviceState = { registered: boolean; enabled: boolean; lastSeenAt?: string | null };

export class PushDeviceApiError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}

async function request(session: Session, path: string, init?: RequestInit) {
  try { return await mobileApiRequest<PushDeviceState>(session, path, init, "Notification settings could not be updated."); }
  catch (error) {
    if (error instanceof MobileRequestError) throw new PushDeviceApiError(error.message, error.retryable);
    throw error;
  }
}

export function loadPushDevice(session: Session, deviceId: string) {
  return request(session, `/api/v1/mobile/push-device?deviceId=${encodeURIComponent(deviceId)}`);
}

export function registerPushDevice(session: Session, input: Record<string, string>) {
  return request(session, "/api/v1/mobile/push-device", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
}

export function disablePushDevice(session: Session, deviceId: string) {
  return request(session, "/api/v1/mobile/push-device", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId }) });
}
