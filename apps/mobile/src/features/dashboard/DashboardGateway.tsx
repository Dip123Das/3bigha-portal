import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getNativeSupabase } from "@/lib/auth/supabase";
import { NotificationDeviceCard } from "@/features/notifications/NotificationDeviceCard";
import { useNotificationResponse } from "@/features/notifications/NotificationResponseProvider";
import { ReleaseHealthCard } from "@/features/release/ReleaseHealthCard";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { canonicalWebUrl, loadDashboardAggregate, loadMobileBootstrap, type MobileBootstrap, type MobileDashboardAggregate, type MobileDashboardKey } from "./api";

const DASHBOARD_COPY: Record<MobileDashboardKey, { eyebrow: string; title: string; summary: string }> = {
  admin_home: { eyebrow: "PLATFORM STEWARDSHIP", title: "Administration", summary: "Review authorised platform operations from your canonical administrator identity." },
  blog_admin_home: { eyebrow: "KNOWLEDGE STEWARDSHIP", title: "Editorial administration", summary: "Guide 3Bigha knowledge and publishing through the existing editorial authority." },
  banker_home: { eyebrow: "FINANCE WORKSPACE", title: "Banking work", summary: "Continue borrower follow-up, documents, offers and finance progress." },
  investor_home: { eyebrow: "INVESTMENT WORKSPACE", title: "Investment work", summary: "Review authorised opportunities and continue active investment work." },
  vendor_home: { eyebrow: "BUSINESS WORKSPACE", title: "Run your business", summary: "Continue inventory, enquiries, RFQs and operations across authorised segments." },
  publisher_home: { eyebrow: "PUBLISHING WORKSPACE", title: "Your publications", summary: "Create and manage knowledge using your existing publisher authority." },
  buyer_home: { eyebrow: "BUYER WORKSPACE", title: "Plan and procure", summary: "Continue requirements, quotations, supplier discovery and buying decisions." },
};

function humanise(value: string) {
  return value.replace(/[._:-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardGateway({ session, onboarding }: { session: Session; onboarding: ReactNode }) {
  const notification = useNotificationResponse();
  const [data, setData] = useState<MobileBootstrap | null>(null);
  const [aggregate, setAggregate] = useState<MobileDashboardAggregate | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true); setMessage(null);
    try {
      const bootstrap = await loadMobileBootstrap(session);
      setData(bootstrap);
      const summary = await loadDashboardAggregate(session).catch(() => null);
      setAggregate(summary?.dashboard === bootstrap.navigation.primaryDashboard ? summary : null);
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Your workspace could not be prepared."); }
    finally { setBusy(false); }
  }, [session.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (notification.action) void refresh(); }, [notification.action, refresh]);

  if (!data && !message) return <SafeAreaView accessibilityLabel="Preparing your workspace" accessibilityRole="progressbar" style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text accessibilityLiveRegion="polite" style={styles.muted}>Preparing your workspace…</Text></SafeAreaView>;
  if (!data) return <SafeAreaView style={styles.center}><Text accessibilityRole="alert" style={styles.error}>{message}</Text><Action label="Try again" onPress={() => void refresh()} /></SafeAreaView>;
  if (data.registration.requiredAction !== "none") return <>{onboarding}</>;

  const copy = DASHBOARD_COPY[data.navigation.primaryDashboard];
  const capabilityGroups = Object.entries(data.capabilities.groups).filter(([, values]) => values.length > 0);
  const ungrouped = data.capabilities.operating.filter((capability) => !capabilityGroups.some(([, values]) => values.includes(capability)));

  if (selectedCapability) {
    return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
      <Pressable accessibilityLabel="Back to dashboard" accessibilityRole="button" hitSlop={8} onPress={() => setSelectedCapability(null)}><Text style={styles.back}>‹ Back to dashboard</Text></Pressable>
      <View style={styles.hero}><Text style={styles.eyebrow}>AUTHORISED CAPABILITY</Text><Text accessibilityRole="header" style={styles.heroTitle}>{humanise(selectedCapability)}</Text><Text style={styles.heroBody}>This capability is available because the canonical 3Bigha server included it in your operating projection. The mobile app cannot grant or activate it.</Text></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Continue safely</Text><Text style={styles.muted}>Use the canonical workspace for the complete production workflow while its task-specific native surface evolves.</Text><Action label="Open canonical workspace" onPress={() => void Linking.openURL(canonicalWebUrl(data.navigation.primaryWebPath))} /></View>
    </ScrollView></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void refresh()} tintColor={colors.brand} />}>
    <View style={styles.topline}><View><Text style={styles.brand}>3Bigha</Text><Text style={styles.brandSub}>Business Operating System</Text></View><Pressable accessibilityLabel="Sign out on this device" accessibilityRole="button" hitSlop={8} onPress={() => void getNativeSupabase()?.auth.signOut({ scope: "local" })}><Text style={styles.signout}>Sign out</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>{copy.eyebrow}</Text><Text accessibilityRole="header" style={styles.heroTitle}>{copy.title}</Text><Text style={styles.heroBody}>{copy.summary}</Text><Text style={styles.welcome}>{data.person.displayName}{data.identity.businessName ? ` · ${data.identity.businessName}` : ""}</Text></View>
    {notification.action && <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.notificationCard}><Text style={styles.notificationKicker}>IMPORTANT WORK UPDATE</Text><Text accessibilityRole="header" style={styles.sectionTitle}>{notification.action.title}</Text><Text style={styles.notificationBody}>{notification.action.body}</Text>{notification.action.webPath ? <Action label="Continue to the canonical workspace" onPress={() => { const path = notification.action?.webPath; notification.clear(); if (path) void Linking.openURL(canonicalWebUrl(path)); }} /> : <Text style={styles.muted}>This alert has no safe action link. Your refreshed dashboard remains available below.</Text>}<Pressable accessibilityLabel="Dismiss work update" accessibilityRole="button" hitSlop={8} onPress={notification.clear}><Text style={styles.dismiss}>Dismiss</Text></Pressable></View>}
    {aggregate && <View style={styles.card}><Text style={styles.kicker}>LIVE WORK SUMMARY</Text><Text accessibilityRole="header" style={styles.sectionTitle}>At a glance</Text><View style={styles.metrics}>{aggregate.metrics.map((item) => <Pressable accessibilityHint="Opens the canonical workspace" accessibilityLabel={`${item.label}: ${item.value === null ? "unavailable" : item.value}`} accessibilityRole="link" key={item.key} style={styles.metric} onPress={() => void Linking.openURL(canonicalWebUrl(item.webPath))}><Text style={styles.metricValue}>{item.value === null ? "—" : item.value}</Text><Text style={styles.metricLabel}>{item.label}</Text></Pressable>)}</View><Text style={styles.muted}>Counts come from your current authorised server view. Pull down to refresh.</Text></View>}
    <NotificationDeviceCard session={session} />
    <ReleaseHealthCard />
    <View style={styles.card}><Text style={styles.kicker}>CONTINUE YOUR WORK</Text><Text style={styles.sectionTitle}>Your authorised destinations</Text>{data.navigation.items.map((item) => <Action key={item.key} label={item.label} onPress={() => void Linking.openURL(canonicalWebUrl(item.webPath))} secondary />)}<Action label="Open Unified Workspace" onPress={() => void Linking.openURL(canonicalWebUrl(data.navigation.unifiedWorkspacePath))} /></View>
    <View style={styles.card}><Text style={styles.kicker}>CAPABILITIES</Text><Text style={styles.sectionTitle}>What you can do</Text><Text style={styles.muted}>Only capabilities returned by the canonical server are shown.</Text>{capabilityGroups.map(([group, values]) => <View key={group} style={styles.group}><Text style={styles.groupTitle}>{humanise(group)}</Text><View style={styles.chips}>{values.map((value) => <Capability key={value} value={value} onPress={setSelectedCapability} />)}</View></View>)}{ungrouped.length > 0 && <View style={styles.chips}>{ungrouped.map((value) => <Capability key={value} value={value} onPress={setSelectedCapability} />)}</View>}{capabilityGroups.length === 0 && ungrouped.length === 0 && <Text style={styles.empty}>No additional operating capability is active yet. Your primary workspace remains available.</Text>}</View>
    <Text style={styles.footnote}>Human First. AI Second. Precision Always.</Text>
  </ScrollView></SafeAreaView>;
}

function Capability({ value, onPress }: { value: string; onPress(value: string): void }) { const label = humanise(value); return <Pressable accessibilityHint="Shows capability details" accessibilityLabel={label} accessibilityRole="button" hitSlop={6} onPress={() => onPress(value)} style={styles.chip}><Text style={styles.chipText}>{label}</Text></Pressable>; }
function Action({ label, onPress, secondary = false }: { label: string; onPress(): void; secondary?: boolean }) { return <Pressable accessibilityLabel={label} accessibilityRole={secondary ? "link" : "button"} hitSlop={6} onPress={onPress} style={[styles.action, secondary && styles.actionSecondary]}><Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>{label}</Text><Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.arrow, secondary && styles.actionTextSecondary]}>›</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.canvas }, page: { width: "100%", maxWidth: 820, alignSelf: "center", padding: spacing.lg, gap: spacing.md }, topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brand: { color: colors.ink, fontSize: 21, fontWeight: "900" }, brandSub: { color: colors.muted, fontSize: typography.micro }, signout: { color: colors.brand, fontSize: typography.caption, fontWeight: "700" }, hero: { backgroundColor: colors.brand, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm }, eyebrow: { color: colors.accentSoft, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.2 }, heroTitle: { color: colors.onBrand, fontSize: typography.display, lineHeight: 42, fontWeight: "900" }, heroBody: { color: colors.onBrandMuted, fontSize: typography.body, lineHeight: 25 }, welcome: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800", marginTop: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, kicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 }, sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "900", marginBottom: spacing.xs }, muted: { color: colors.muted, fontSize: typography.caption, lineHeight: 20 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, metric: { minWidth: 132, flexGrow: 1, flexBasis: "44%", backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }, metricValue: { color: colors.brand, fontSize: 28, fontWeight: "900" }, metricLabel: { color: colors.ink, fontSize: typography.caption, fontWeight: "800" }, group: { gap: spacing.sm, marginTop: spacing.sm }, groupTitle: { color: colors.ink, fontSize: typography.caption, fontWeight: "800" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, chip: { backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipText: { color: colors.ink, fontSize: typography.caption, fontWeight: "700" }, action: { minHeight: 52, backgroundColor: colors.brand, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, actionSecondary: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border }, actionText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800", flex: 1 }, actionTextSecondary: { color: colors.ink }, arrow: { color: colors.onBrand, fontSize: 25 }, empty: { color: colors.muted, lineHeight: 21, paddingVertical: spacing.md }, footnote: { color: colors.muted, textAlign: "center", fontSize: typography.caption, padding: spacing.lg }, back: { color: colors.brand, fontWeight: "800", paddingVertical: spacing.sm }, error: { color: "#A4382A", textAlign: "center", lineHeight: 22 }, notificationCard: { backgroundColor: colors.accentSoft, borderColor: colors.brand, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, notificationKicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 }, notificationBody: { color: colors.ink, fontSize: typography.caption, lineHeight: 21 }, dismiss: { color: colors.brand, fontSize: typography.caption, fontWeight: "800", textAlign: "center", paddingTop: spacing.xs },
});
