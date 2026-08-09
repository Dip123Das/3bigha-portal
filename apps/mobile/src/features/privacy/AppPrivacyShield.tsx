import { type PropsWithChildren, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme/tokens";

export function AppPrivacyShield({ children }: PropsWithChildren) {
  const [active, setActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.root}>
      <View accessibilityElementsHidden={!active} importantForAccessibility={active ? "auto" : "no-hide-descendants"} style={styles.content}>
        {children}
      </View>
      {!active && (
        <View accessibilityLabel="3Bigha is private while in the background" accessibilityRole="summary" style={styles.safe}>
          <View style={styles.mark}><Text style={styles.markText}>3B</Text></View>
          <Text accessibilityRole="header" style={styles.title}>Your work stays private</Text>
          <Text style={styles.body}>Return to 3Bigha to continue securely.</Text>
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
});
