import type { Session } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { disablePushDevice, registerPushDevice, PushDeviceApiError, type PushDeviceState } from "./api";

const KEY = "3bigha.push-device-queue.v1";
const LIMIT = 8;
type DeviceInput = Record<string, string> & { deviceId: string };
type PendingDeviceMutation = { userId: string; deviceId: string; action: "enable"; input: DeviceInput; queuedAt: string } | { userId: string; deviceId: string; action: "disable"; queuedAt: string };

async function read(): Promise<PendingDeviceMutation[]> {
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.slice(-LIMIT) : [];
  } catch { return []; }
}

async function write(items: PendingDeviceMutation[]) {
  if (items.length === 0) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, JSON.stringify(items.slice(-LIMIT)));
}

export async function queueDeviceEnable(userId: string, input: DeviceInput) {
  const items = (await read()).filter((item) => !(item.userId === userId && item.deviceId === input.deviceId));
  await write([...items, { userId, deviceId: input.deviceId, action: "enable", input, queuedAt: new Date().toISOString() }]);
}

export async function queueDeviceDisable(userId: string, deviceId: string) {
  const items = (await read()).filter((item) => !(item.userId === userId && item.deviceId === deviceId));
  await write([...items, { userId, deviceId, action: "disable", queuedAt: new Date().toISOString() }]);
}

export async function hasPendingDeviceMutation(userId: string, deviceId: string) {
  return (await read()).some((item) => item.userId === userId && item.deviceId === deviceId);
}

export async function flushDeviceQueue(session: Session): Promise<PushDeviceState | null> {
  const all = await read();
  const mine = all.filter((item) => item.userId === session.user.id);
  let latest: PushDeviceState | null = null;
  for (const item of mine) {
    try {
      latest = item.action === "enable" ? await registerPushDevice(session, item.input) : await disablePushDevice(session, item.deviceId);
      const current = await read();
      await write(current.filter((candidate) => candidate !== item && !(candidate.userId === item.userId && candidate.deviceId === item.deviceId && candidate.queuedAt === item.queuedAt)));
    } catch (error) {
      if (error instanceof PushDeviceApiError && error.retryable) break;
      const current = await read();
      await write(current.filter((candidate) => !(candidate.userId === item.userId && candidate.deviceId === item.deviceId && candidate.queuedAt === item.queuedAt)));
      throw error;
    }
  }
  return latest;
}
