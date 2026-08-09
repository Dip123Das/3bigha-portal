import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getNativeSupabase } from "@/lib/auth/supabase";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { canonicalWebUrl, loadMobileBootstrap, type MobileBootstrap, type MobileDashboardKey } from "./api";

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
  const [data, setData] = useState<MobileBootstrap | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true); setMessage(null);
    try { setData(await loadMobileBootstrap(session)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Your workspace could not be prepared."); }
    finally { setBusy(false); }
  }, [session.access_token]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (!data && !message) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text style={styles.muted}>Preparing your workspace…</Text></SafeAreaView>;
  if (!data) return <SafeAreaView style={styles.center}><Text accessibilityRole="alert" style={styles.error}>{message}</Text><Action label="Try again" onPress={() => void refresh()} /></SafeAreaView>;
  if (data.registration.requiredAction !== "none") return <>{onboarding}</>;

  const copy = DASHBOARD_COPY[data.navigation.primaryDashboard];
  const capabilityGroups = Object.entries(data.capabilities.groups).filter(([, values]) => values.length > 0);
  const ungrouped = data.capabilities.operating.filter((capability) => !capabilityGroups.some(([, values]) => values.includes(capability)));

  if (selectedCapability) {
    return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page}>
      <Pressable onPress={() => setSelectedCapability(null)}><Text style={styles.back}>‹ Back to dashboard</Text></Pressable>
      <View style={styles.hero}><Text style={styles.eyebrow}>AUTHORISED CAPABILITY</Text><Text style={styles.heroTitle}>{humanise(selectedCapability)}</Text><Text style={styles.heroBody}>This capability is available because the canonical 3Bigha server included it in your operating projection. The mobile app cannot grant or activate it.</Text></View>
      <View style={styles.card}><Text style={styles.sectionTitle}>Continue safely</Text><Text style={styles.muted}>Use the canonical workspace for the complete production workflow while its task-specific native surface evolves.</Text><Action label="Open canonical workspace" onPress={() => void Linking.openURL(canonicalWebUrl(data.navigation.primaryWebPath))} /></View>
    </ScrollView></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void refresh()} tintColor={colors.brand} />}>
    <View style={styles.topline}><View><Text style={styles.brand}>3Bigha</Text><Text style={styles.brandSub}>Business Operating System</Text></View><Pressable onPress={() => void getNativeSupabase()?.auth.signOut({ scope: "local" })}><Text style={styles.signout}>Sign out</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>{copy.eyebrow}</Text><Text style={styles.heroTitle}>{copy.title}</Text><Text style={styles.heroBody}>{copy.summary}</Text><Text style={styles.welcome}>{data.person.displayName}{data.identity.businessName ? ` · ${data.identity.businessName}` : ""}</Text></View>
    <View style={styles.card}><Text style={styles.kicker}>CONTINUE YOUR WORK</Text><Text style={styles.sectionTitle}>Your authorised destinations</Text>{data.navigation.items.map((item) => <Action key={item.key} label={item.label} onPress={() => void Linking.openURL(canonicalWebUrl(item.webPath))} secondary />)}<Action label="Open Unified Workspace" onPress={() => void Linking.openURL(canonicalWebUrl(data.navigation.unifiedWorkspacePath))} /></View>
    <View style={styles.card}><Text style={styles.kicker}>CAPABILITIES</Text><Text style={styles.sectionTitle}>What you can do</Text><Text style={styles.muted}>Only capabilities returned by the canonical server are shown.</Text>{capabilityGroups.map(([group, values]) => <View key={group} style={styles.group}><Text style={styles.groupTitle}>{humanise(group)}</Text><View style={styles.chips}>{values.map((value) => <Capability key={value} value={value} onPress={setSelectedCapability} />)}</View></View>)}{ungrouped.length > 0 && <View style={styles.chips}>{ungrouped.map((value) => <Capability key={value} value={value} onPress={setSelectedCapability} />)}</View>}{capabilityGroups.length === 0 && ungrouped.length === 0 && <Text style={styles.empty}>No additional operating capability is active yet. Your primary workspace remains available.</Text>}</View>
    <Text style={styles.footnote}>Human First. AI Second. Precision Always.</Text>
  </ScrollView></SafeAreaView>;
}

function Capability({ value, onPress }: { value: string; onPress(value: string): void }) { return <Pressable onPress={() => onPress(value)} style={styles.chip}><Text style={styles.chipText}>{humanise(value)}</Text></Pressable>; }
function Action({ label, onPress, secondary = false }: { label: string; onPress(): void; secondary?: boolean }) { return <Pressable onPress={onPress} style={[styles.action, secondary && styles.actionSecondary]}><Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>{label}</Text><Text style={[styles.arrow, secondary && styles.actionTextSecondary]}>›</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.canvas }, page: { width: "100%", maxWidth: 820, alignSelf: "center", padding: spacing.lg, gap: spacing.md }, topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brand: { color: colors.ink, fontSize: 21, fontWeight: "900" }, brandSub: { color: colors.muted, fontSize: typography.micro }, signout: { color: colors.brand, fontSize: typography.caption, fontWeight: "700" }, hero: { backgroundColor: colors.brand, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm }, eyebrow: { color: colors.accentSoft, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.2 }, heroTitle: { color: colors.onBrand, fontSize: typography.display, lineHeight: 42, fontWeight: "900" }, heroBody: { color: colors.onBrandMuted, fontSize: typography.body, lineHeight: 25 }, welcome: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800", marginTop: spacing.md }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, kicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 }, sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "900", marginBottom: spacing.xs }, muted: { color: colors.muted, fontSize: typography.caption, lineHeight: 20 }, group: { gap: spacing.sm, marginTop: spacing.sm }, groupTitle: { color: colors.ink, fontSize: typography.caption, fontWeight: "800" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, chip: { backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, chipText: { color: colors.ink, fontSize: typography.caption, fontWeight: "700" }, action: { minHeight: 52, backgroundColor: colors.brand, borderRadius: radii.md, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, actionSecondary: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border }, actionText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800", flex: 1 }, actionTextSecondary: { color: colors.ink }, arrow: { color: colors.onBrand, fontSize: 25 }, empty: { color: colors.muted, lineHeight: 21, paddingVertical: spacing.md }, footnote: { color: colors.muted, textAlign: "center", fontSize: typography.caption, padding: spacing.lg }, back: { color: colors.brand, fontWeight: "800", paddingVertical: spacing.sm }, error: { color: "#A4382A", textAlign: "center", lineHeight: 22 },
});
