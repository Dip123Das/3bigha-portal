import { type PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/features/auth/AuthProvider";
import { useDeviceReauthentication } from "@/features/privacy/DeviceReauthenticationProvider";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export function AppPrivacyShield({ children }: PropsWithChildren) {
  const [active, setActive] = useState(AppState.currentState === "active");
  const { foregroundReady, foregroundError, retryForegroundValidation } = useAuth();
  const { deviceReady, deviceError, retryDeviceAuthentication, signOutSafely, registerLocalInteraction } = useDeviceReauthentication();
  const privateState = !active || !foregroundReady || !deviceReady;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.root}>
      <View accessibilityElementsHidden={privateState} importantForAccessibility={privateState ? "no-hide-descendants" : "auto"} onTouchStart={registerLocalInteraction} style={styles.content}>
        {children}
      </View>
      {privateState && (
        <View accessibilityLabel="3Bigha is private while in the background" accessibilityRole="summary" style={styles.safe}>
          <View style={styles.mark}><Text style={styles.markText}>3B</Text></View>
          <Text accessibilityRole="header" style={styles.title}>{active ? !deviceReady ? "Unlock 3Bigha" : "Confirming your secure session" : "Your work stays private"}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.body}>{active ? deviceError ? "We could not verify that it is you. Your work remains hidden." : !deviceReady ? "Use your device security to return to your work." : foregroundError ? "We could not confirm your session. Your work remains hidden." : "Please wait while 3Bigha safely restores your work." : "Return to 3Bigha to continue securely."}</Text>
          {active && !foregroundError && !deviceError && <ActivityIndicator accessibilityLabel="Confirming secure access" color={colors.brand} />}
          {active && foregroundError && <Pressable accessibilityLabel="Try session validation again" accessibilityRole="button" onPress={retryForegroundValidation} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>}
          {active && deviceError && <Pressable accessibilityLabel="Try device verification again" accessibilityRole="button" onPress={retryDeviceAuthentication} style={styles.retry}><Text style={styles.retryText}>Unlock again</Text></Pressable>}
          {active && deviceError && <Pressable accessibilityLabel="Sign out of 3Bigha on this device" accessibilityRole="button" onPress={signOutSafely} style={styles.secondary}><Text style={styles.secondaryText}>Sign out on this device</Text></Pressable>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  safe: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.canvas,
  },
  mark: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.brand,
  },
  markText: { color: colors.onBrand, fontSize: 20, fontWeight: "900" },
  title: { color: colors.ink, fontSize: 24, fontWeight: "900", textAlign: "center" },
  body: { color: colors.muted, fontSize: typography.caption, lineHeight: 20, textAlign: "center" },
  retry: { minHeight: 48, minWidth: 120, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.brand },
  retryText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800" },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  secondaryText: { color: colors.brand, fontSize: typography.caption, fontWeight: "800" },
});
