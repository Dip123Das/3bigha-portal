import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import { disablePushDevice, loadPushDevice, registerPushDevice, type PushDeviceState } from "./api";
import { getPushDeviceId, preparePushDevice } from "./device";

export function NotificationDeviceCard({ session }: { session: Session }) {
  const [state, setState] = useState<PushDeviceState | null>(null);
  const [message, setMessage] = useState("Choose whether this device should receive important work alerts.");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void getPushDeviceId().then((id) => loadPushDevice(session, id)).then(setState).catch(() => undefined); }, [session.access_token]);

  async function enable() {
    setBusy(true);
    try { const device = await preparePushDevice(); setState(await registerPushDevice(session, device)); setMessage("Important work alerts are enabled on this device."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Notifications could not be enabled."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try { setState(await disablePushDevice(session, await getPushDeviceId())); setMessage("Alerts are off for this device. Your account and other devices are unchanged."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Notifications could not be disabled."); }
    finally { setBusy(false); }
  }

  return <View style={styles.card}><Text style={styles.kicker}>THIS DEVICE</Text><Text style={styles.title}>Work alerts</Text><Text style={styles.body}>{message}</Text><Pressable disabled={busy} onPress={() => void (state?.enabled ? disable() : enable())} style={[styles.action, busy && styles.disabled]}><Text style={styles.actionText}>{busy ? "Updating…" : state?.enabled ? "Turn off on this device" : "Enable important alerts"}</Text></Pressable></View>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, kicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 21, fontWeight: "900" }, body: { color: colors.muted, fontSize: typography.caption, lineHeight: 20 }, action: { minHeight: 48, marginTop: spacing.xs, borderRadius: radii.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md }, actionText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800" }, disabled: { opacity: 0.6 } });
