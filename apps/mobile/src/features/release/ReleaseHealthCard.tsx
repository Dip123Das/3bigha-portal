import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

type ReleaseState = "idle" | "checking" | "available" | "downloading" | "ready" | "current" | "error";

export function ReleaseHealthCard() {
  const [state, setState] = useState<ReleaseState>(Updates.isEmergencyLaunch ? "error" : "idle");
  const [message, setMessage] = useState<string | null>(Updates.isEmergencyLaunch
    ? "3Bigha recovered with the safe version included in this app. Your account and work remain available."
    : null);

  const check = async () => {
    if (!Updates.isEnabled) {
      setState("current");
      setMessage("Update checks become available in preview and production builds.");
      return;
    }
    setState("checking"); setMessage(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      setState(result.isAvailable ? "available" : "current");
      setMessage(result.isAvailable ? "A compatible 3Bigha update is available." : "This app is up to date.");
    } catch {
      setState("error");
      setMessage("The update service could not be reached. You can continue working with this version.");
    }
  };

  const download = async () => {
    setState("downloading"); setMessage("Downloading the update…");
    try {
      const result = await Updates.fetchUpdateAsync();
      if (!result.isNew) {
        setState("current"); setMessage("This app is already up to date."); return;
      }
      setState("ready");
      setMessage("The update is ready. Restart 3Bigha when it is convenient.");
    } catch {
      setState("error");
      setMessage("The update could not be downloaded. Your current version remains safe to use.");
    }
  };

  const restart = async () => {
    try { await Updates.reloadAsync(); }
    catch {
      setState("error");
      setMessage("3Bigha could not restart automatically. Close and reopen the app when convenient.");
    }
  };

  const busy = state === "checking" || state === "downloading";
  const version = Application.nativeApplicationVersion || "development";
  const channel = Updates.channel || "local development";

  return <View style={styles.card}>
    <Text style={styles.kicker}>APP HEALTH</Text>
    <Text style={styles.title}>Release and updates</Text>
    <Text style={styles.meta}>Version {version} · {channel}</Text>
    {message ? <Text accessibilityRole="alert" style={state === "error" ? styles.warning : styles.body}>{message}</Text> : <Text style={styles.body}>Check for a compatible update without interrupting your work.</Text>}
    {state === "available" ? <Action label="Download update" disabled={busy} onPress={() => void download()} /> : state === "ready" ? <Action label="Restart and apply" disabled={busy} onPress={() => void restart()} /> : <Action label={busy ? "Please wait…" : "Check for updates"} disabled={busy} onPress={() => void check()} />}
    <Text style={styles.note}>Updates cannot change your identity, permissions or server-owned business data.</Text>
  </View>;
}

function Action({ label, disabled, onPress }: { label: string; disabled: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  kicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 21, fontWeight: "900" },
  meta: { color: colors.ink, fontSize: typography.caption, fontWeight: "800" },
  body: { color: colors.muted, fontSize: typography.caption, lineHeight: 20 },
  warning: { color: "#8A4B16", fontSize: typography.caption, lineHeight: 20 },
  note: { color: colors.muted, fontSize: typography.micro, lineHeight: 17 },
  action: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand, borderRadius: radii.md, paddingHorizontal: spacing.md },
  actionText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
