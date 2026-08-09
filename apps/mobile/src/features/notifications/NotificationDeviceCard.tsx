import type { Session } from "@supabase/supabase-js";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import { disablePushDevice, loadPushDevice, PushDeviceApiError, registerPushDevice, type PushDeviceState } from "./api";
import { getPushDeviceId, preparePushDevice } from "./device";
import { flushDeviceQueue, hasPendingDeviceMutation, queueDeviceDisable, queueDeviceEnable } from "./offlineQueue";

export function NotificationDeviceCard({ session }: { session: Session }) {
  const [state, setState] = useState<PushDeviceState | null>(null);
  const [message, setMessage] = useState("Choose whether this device should receive important work alerts.");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    async function sync() {
      const id = await getPushDeviceId();
      const queued = await hasPendingDeviceMutation(session.user.id, id);
      if (active) setPending(queued);
      const flushed = await flushDeviceQueue(session).catch(() => null);
      const remote = flushed || await loadPushDevice(session, id);
      if (active) { setState(remote); setPending(await hasPendingDeviceMutation(session.user.id, id)); }
    }
    void sync().catch(() => undefined);
    const unsubscribe = NetInfo.addEventListener((network) => { if (network.isConnected) void sync().catch(() => undefined); });
    return () => { active = false; unsubscribe(); };
  }, [session.access_token, session.user.id]);

  async function enable() {
    setBusy(true);
    let device: Awaited<ReturnType<typeof preparePushDevice>> | null = null;
    try { device = await preparePushDevice(); setState(await registerPushDevice(session, device)); setPending(false); setMessage("Important work alerts are enabled on this device."); }
    catch (error) {
      if (device && error instanceof PushDeviceApiError && error.retryable) { await queueDeviceEnable(session.user.id, device); setState({ registered: false, enabled: true }); setPending(true); setMessage("Your choice is saved securely. Alerts will be enabled when this device reconnects."); }
      else setMessage(error instanceof Error ? error.message : "Notifications could not be enabled.");
    }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try { setState(await disablePushDevice(session, await getPushDeviceId())); setPending(false); setMessage("Alerts are off for this device. Your account and other devices are unchanged."); }
    catch (error) {
      if (error instanceof PushDeviceApiError && error.retryable) { const id = await getPushDeviceId(); await queueDeviceDisable(session.user.id, id); setState({ registered: true, enabled: false }); setPending(true); setMessage("Your choice is saved securely. Alerts will be turned off when this device reconnects."); }
      else setMessage(error instanceof Error ? error.message : "Notifications could not be disabled.");
    }
    finally { setBusy(false); }
  }

  return <View style={styles.card}><Text style={styles.kicker}>THIS DEVICE</Text><Text style={styles.title}>Work alerts</Text>{pending && <Text style={styles.pending}>Waiting for internet · saved on this device</Text>}<Text style={styles.body}>{message}</Text><Pressable disabled={busy} onPress={() => void (state?.enabled ? disable() : enable())} style={[styles.action, busy && styles.disabled]}><Text style={styles.actionText}>{busy ? "Updating…" : state?.enabled ? "Turn off on this device" : "Enable important alerts"}</Text></Pressable></View>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, kicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, fontWeight: "900" }, pending: { color: colors.brand, fontSize: typography.micro, fontWeight: "800" }, body: { color: colors.muted, fontSize: typography.caption, lineHeight: 20 }, action: { minHeight: 48, marginTop: spacing.xs, borderRadius: radii.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }, actionText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800" }, disabled: { opacity: 0.6 } });
