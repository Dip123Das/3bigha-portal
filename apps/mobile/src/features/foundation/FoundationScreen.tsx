import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme/tokens";

const constitutionalPrinciples = [
  "Human First",
  "AI Second",
  "Precision Always",
] as const;

export function FoundationScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.page, isTablet && styles.tabletPage]}>
        <View accessibilityRole="header" style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>3B</Text>
          </View>
          <View>
            <Text style={styles.brandName}>3Bigha</Text>
            <Text style={styles.brandDescriptor}>Business Operating System</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>MOB-01 · NATIVE FOUNDATION</Text>
          <Text accessibilityRole="header" style={styles.title}>
            One business system. A genuine mobile experience.
          </Text>
          <Text style={styles.body}>
            This Android and iOS interface is ready for the canonical 3Bigha
            identity and capability contracts. It does not load or wrap the web
            portal.
          </Text>

          <View style={styles.principles}>
            {constitutionalPrinciples.map((principle) => (
              <View key={principle} style={styles.principle}>
                <View style={styles.dot} />
                <Text style={styles.principleText}>{principle}</Text>
              </View>
            ))}
          </View>
        </View>

        <View accessibilityRole="summary" style={styles.statusCard}>
          <Text style={styles.statusLabel}>FOUNDATION STATUS</Text>
          <Text style={styles.statusTitle}>Native shell ready</Text>
          <Text style={styles.statusBody}>
            Authentication and business workflows will connect only after the
            MOB-02 canonical backend contract is established.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tabletPage: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 760,
    paddingHorizontal: spacing.xxl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  brandMarkText: {
    color: colors.onBrand,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandDescriptor: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: typography.display,
    lineHeight: 42,
    fontWeight: "800",
    letterSpacing: -1.2,
    maxWidth: 620,
  },
  body: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 25,
    marginTop: spacing.md,
    maxWidth: 620,
  },
  principles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  principle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  principleText: {
    color: colors.ink,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  statusCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.brand,
    marginBottom: spacing.sm,
  },
  statusLabel: {
    color: colors.accentSoft,
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusTitle: {
    color: colors.onBrand,
    fontSize: 20,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  statusBody: {
    color: colors.onBrandMuted,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});
