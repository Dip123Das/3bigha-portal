export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { authenticateMobileRequest, MobileAuthError } from "@/lib/mobile/server/auth";
import { disablePushDevice, getPushDeviceState, savePushToken } from "@/lib/mobile/savePushToken";

const headers = { "Cache-Control": "private, no-store, max-age=0" };
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const isExpoToken = (value: string) => /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(value);

function failure(error: unknown) {
  const authenticationError = error instanceof MobileAuthError;
  const status = authenticationError ? 401 : 500;
  const message = authenticationError ? error.message : "Notification settings could not be updated.";
  return NextResponse.json({ ok: false, error: { code: authenticationError ? "AUTH_REQUIRED" : "DEVICE_UPDATE_FAILED", message } }, { status, headers });
}

export async function GET(request: Request) {
  try {
    const { user } = await authenticateMobileRequest(request);
    const deviceId = clean(new URL(request.url).searchParams.get("deviceId"), 160);
    if (!deviceId) return NextResponse.json({ ok: false, error: { code: "DEVICE_REQUIRED", message: "A device identifier is required." } }, { status: 400, headers });
    const state = await getPushDeviceState(user.id, deviceId);
    return NextResponse.json({ ok: true, data: { registered: Boolean(state), enabled: state?.notification_enabled === true, lastSeenAt: state?.last_seen_at || null } }, { headers });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  try {
    const { user } = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => ({}));
    const token = clean(body.token, 512);
    const deviceId = clean(body.deviceId, 160);
    const platform = clean(body.platform, 16);
    if (!isExpoToken(token) || !deviceId || !["android", "ios"].includes(platform)) {
      return NextResponse.json({ ok: false, error: { code: "INVALID_DEVICE", message: "Valid notification device details are required." } }, { status: 400, headers });
    }
    await savePushToken({ userId: user.id, token, platform, deviceId, deviceName: clean(body.deviceName, 120) || null, appVersion: clean(body.appVersion, 40) || null });
    return NextResponse.json({ ok: true, data: { registered: true, enabled: true } }, { headers });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => ({}));
    const deviceId = clean(body.deviceId, 160);
    if (!deviceId) return NextResponse.json({ ok: false, error: { code: "DEVICE_REQUIRED", message: "A device identifier is required." } }, { status: 400, headers });
    await disablePushDevice(user.id, deviceId);
    return NextResponse.json({ ok: true, data: { registered: true, enabled: false } }, { headers });
  } catch (error) { return failure(error); }
}
