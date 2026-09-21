import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import { PropertyLegalReviewScreen } from "./PropertyLegalReviewScreen";
import {
  loadPropertyDiscovery,
  type MobilePropertyDiscovery,
  type MobilePropertyDiscoveryUnit,
  type MobilePropertyUnitStatus,
} from "./api";

type Filter = "all" | MobilePropertyUnitStatus;

const STATUS: Record<
  MobilePropertyUnitStatus,
  { label: string; background: string; border: string; text: string }
> = {
  available: { label: "Available", background: "#ECFDF5", border: "#10B981", text: "#065F46" },
  hold: { label: "Temporarily held", background: "#FFFBEB", border: "#F59E0B", text: "#92400E" },
  booked: { label: "Booked", background: "#EFF6FF", border: "#3B82F6", text: "#1E40AF" },
  sold: { label: "Sold", background: "#F3F4F6", border: "#6B7280", text: "#374151" },
  blocked: { label: "Unavailable", background: "#FEF2F2", border: "#EF4444", text: "#991B1B" },
};

function money(value: number | null) {
  return value === null
    ? "Price pending"
    : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

function area(unit: MobilePropertyDiscoveryUnit) {
  const value =
    unit.plotAreaSqft ??
    unit.carpetAreaSqft ??
    unit.builtUpAreaSqft ??
    unit.superBuiltUpAreaSqft;
  return value === null ? "Area pending" : `${value.toLocaleString("en-IN")} sq.ft.`;
}

function human(value: string | null) {
  return value
    ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Pending";
}

export function PropertyDiscoveryScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack(): void;
}) {
  const [data, setData] = useState<MobilePropertyDiscovery | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [reviewUnitId, setReviewUnitId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    async (slug: string | null = selectedSlug) => {
      setBusy(true);
      setMessage(null);
      try {
        const result = await loadPropertyDiscovery(session, slug);
        setData(result);
        setSelectedSlug(slug);
        if (!slug) setSelectedUnitId(null);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Property projects could not be loaded safely.",
        );
      } finally {
        setBusy(false);
      }
    },
    [session.access_token, selectedSlug],
  );

  useEffect(() => {
    void load(null);
  }, [session.access_token]);

  const preview = data?.selectedProject ?? null;
  const units = useMemo(
    () =>
      (preview?.units ?? []).filter(
        (unit) => filter === "all" || unit.status === filter,
      ),
    [filter, preview?.units],
  );
  const selectedUnit =
    preview?.units.find((unit) => unit.id === selectedUnitId) ?? null;

  if (reviewUnitId) {
    return (
      <PropertyLegalReviewScreen
        session={session}
        unitId={reviewUnitId}
        onBack={() => setReviewUnitId(null)}
      />
    );
  }

  function goBack() {
    if (preview || selectedSlug) {
      setFilter("all");
      setSelectedUnitId(null);
      void load(null);
      return;
    }
    onBack();
  }

  if (!data && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading property projects"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Loading verified property projects…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => void load()}
            tintColor={colors.brand}
          />
        }
      >
        <Pressable
          accessibilityLabel={preview ? "Back to projects" : "Back to dashboard"}
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
        >
          <Text style={styles.back}>‹ {preview ? "Projects" : "Dashboard"}</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>VERIFIED PROPERTY DISCOVERY</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            {preview?.project.name ?? "Choose a project"}
          </Text>
          <Text style={styles.heroBody}>
            {preview
              ? "Compare verified units, live availability, dimensions and declared boundaries."
              : "Explore active builder projects and select a specific verified unit."}
          </Text>
        </View>

        {message ? (
          <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.error}>{message}</Text>
            <Action label="Try again" onPress={() => void load()} />
          </View>
        ) : null}

        {!preview ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Active projects</Text>
            <Text style={styles.muted}>
              Unit counts include only inventory verified for buyer visibility.
            </Text>
            {(data?.projects ?? []).map((project) => (
              <Pressable
                accessibilityHint="Loads verified units for this project"
                accessibilityLabel={`${project.name}, ${project.availableUnitCount} available units`}
                accessibilityRole="button"
                key={project.id}
                onPress={() => {
                  setFilter("all");
                  setSelectedUnitId(null);
                  void load(project.slug);
                }}
                style={styles.project}
              >
                <Text style={styles.projectTitle}>{project.name}</Text>
                <Text style={styles.muted}>
                  {[project.city, project.district, project.state].filter(Boolean).join(", ") ||
                    "Location pending"}
                </Text>
                <View style={styles.badges}>
                  <Badge label={`${project.availableUnitCount} available`} />
                  <Badge label={`${project.verifiedUnitCount} verified`} />
                </View>
              </Pressable>
            ))}
            {data?.projects.length === 0 ? (
              <Text style={styles.empty}>No verified public project is available right now.</Text>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Availability filter</Text>
              <View style={styles.filters}>
                {(["all", "available", "hold", "booked", "sold", "blocked"] as const).map(
                  (value) => (
                    <Pressable
                      accessibilityLabel={
                        value === "all" ? "Show all units" : `Show ${STATUS[value].label} units`
                      }
                      accessibilityRole="button"
                      key={value}
                      onPress={() => setFilter(value)}
                      style={[styles.filter, filter === value && styles.filterActive]}
                    >
                      <Text style={styles.filterText}>
                        {value === "all" ? "All" : STATUS[value].label}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </View>

            {preview.layout && preview.layout.placements.length > 0 ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {preview.layout.name}
                </Text>
                <Text style={styles.muted}>
                  Published layout v{preview.layout.version}. Select a positioned unit or use the list below.
                </Text>
                <View style={styles.layout}>
                  {preview.layout.placements.map((placement) => {
                    const unit = preview.units.find((item) => item.id === placement.unitId);
                    if (!unit || (filter !== "all" && unit.status !== filter)) return null;
                    const palette = STATUS[unit.status];
                    return (
                      <Pressable
                        accessibilityLabel={`Select ${placement.labelOverride || unit.unitCode || "unit"}, ${palette.label}`}
                        accessibilityRole="button"
                        key={placement.unitId}
                        onPress={() => setSelectedUnitId(unit.id)}
                        style={[
                          styles.layoutUnit,
                          {
                            left: `${placement.positionX}%`,
                            top: `${placement.positionY}%`,
                            width: `${placement.width}%`,
                            height: `${placement.height}%`,
                            backgroundColor: palette.background,
                            borderColor:
                              selectedUnitId === unit.id ? colors.ink : palette.border,
                            borderWidth: selectedUnitId === unit.id ? 3 : 2,
                            transform: [{ rotate: `${placement.rotation}deg` }],
                          },
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.layoutLabel, { color: palette.text }]}>
                          {placement.labelOverride || unit.unitCode || "Unit"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Verified units</Text>
              <Text style={styles.muted}>{units.length} unit(s) match this filter.</Text>
              <View style={styles.unitGrid}>
                {units.map((unit) => {
                  const palette = STATUS[unit.status];
                  return (
                    <Pressable
                      accessibilityLabel={`${unit.unitCode || unit.title || "Unit"}, ${palette.label}, ${money(unit.price)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedUnitId === unit.id }}
                      key={unit.id}
                      onPress={() => setSelectedUnitId(unit.id)}
                      style={[
                        styles.unit,
                        {
                          backgroundColor: palette.background,
                          borderColor: selectedUnitId === unit.id ? colors.ink : palette.border,
                          borderWidth: selectedUnitId === unit.id ? 3 : 2,
                        },
                      ]}
                    >
                      <Text style={[styles.unitTitle, { color: palette.text }]}>
                        {unit.unitCode || unit.unitNumber || "Unit"}
                      </Text>
                      <Text style={[styles.unitMeta, { color: palette.text }]}>{palette.label}</Text>
                      <Text style={[styles.unitMeta, { color: palette.text }]}>{money(unit.price)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {units.length === 0 ? <Text style={styles.empty}>No verified unit matches this filter.</Text> : null}
            </View>

            {selectedUnit ? (
              <UnitDetail
                unit={selectedUnit}
                onLegalReview={() => setReviewUnitId(selectedUnit.id)}
              />
            ) : null}
          </>
        )}

        <Text style={styles.privacy}>
          Private legal papers are never loaded into public discovery. Use the authenticated confidential-review workflow before proceeding toward booking. Holds, bookings, payments and agreements remain separate protected steps.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function UnitDetail({
  unit,
  onLegalReview,
}: {
  unit: MobilePropertyDiscoveryUnit;
  onLegalReview(): void;
}) {
  const palette = STATUS[unit.status];
  const facts = [
    ["Type", human(unit.unitKind)],
    ["Price", money(unit.price)],
    ["Area", area(unit)],
    ["Floor", unit.floorNumber === null ? "—" : String(unit.floorNumber)],
    ["Facing", unit.facing || "—"],
    ["Tower / Block", [unit.tower, unit.block].filter(Boolean).join(" / ") || "—"],
    ["Dimensions", unit.dimensionLengthFt && unit.dimensionWidthFt
      ? `${unit.dimensionLengthFt} × ${unit.dimensionWidthFt} ft`
      : "—"],
    ["Trust", "Verified"],
  ];

  return (
    <View style={styles.card}>
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleWrap}>
          <Text style={styles.eyebrowDark}>SELECTED UNIT</Text>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {unit.title || unit.unitCode || "Property unit"}
          </Text>
        </View>
        <Badge label={palette.label} />
      </View>
      <View style={styles.factGrid}>
        {facts.map(([label, value]) => (
          <View key={label} style={styles.fact}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value}</Text>
          </View>
        ))}
      </View>
      {unit.unitKind === "plot" ? (
        <View style={styles.info}>
          <Text style={styles.infoTitle}>Present land condition</Text>
          <Text style={styles.muted}>Vacancy: {human(unit.landVacancyStatus)}</Text>
          <Text style={styles.muted}>Existing structure: {human(unit.existingStructureType)}</Text>
          <Text style={styles.muted}>Boundary marking: {human(unit.boundaryDemarcationType)}</Text>
        </View>
      ) : null}
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Declared four-side boundaries</Text>
        <Text style={styles.muted}>North: {unit.boundaryNorth || "Pending"}</Text>
        <Text style={styles.muted}>South: {unit.boundarySouth || "Pending"}</Text>
        <Text style={styles.muted}>East: {unit.boundaryEast || "Pending"}</Text>
        <Text style={styles.muted}>West: {unit.boundaryWest || "Pending"}</Text>
      </View>
      <Action
        label="Review confidential legal papers"
        onPress={onLegalReview}
      />
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return <View style={styles.badge}><Text style={styles.badgeText}>{label}</Text></View>;
}

function Action({ label, onPress }: { label: string; onPress(): void }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.action}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.canvas },
  page: { width: "100%", maxWidth: 820, alignSelf: "center", padding: spacing.lg, gap: spacing.md },
  back: { color: colors.brand, fontWeight: "800", paddingVertical: spacing.sm },
  hero: { backgroundColor: colors.brand, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.sm },
  eyebrow: { color: colors.accentSoft, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.2 },
  eyebrowDark: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 },
  heroTitle: { color: colors.onBrand, fontSize: typography.display, lineHeight: 42, fontWeight: "900" },
  heroBody: { color: colors.onBrandMuted, fontSize: typography.body, lineHeight: 25 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: "900" },
  muted: { color: colors.muted, fontSize: typography.caption, lineHeight: 20 },
  project: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  projectTitle: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  badge: { backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { color: colors.ink, fontSize: typography.micro, fontWeight: "800" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  filter: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterActive: { borderColor: colors.ink, borderWidth: 2 },
  filterText: { color: colors.ink, fontSize: typography.caption, fontWeight: "800" },
  layout: { position: "relative", height: 300, overflow: "hidden", backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md },
  layoutUnit: { position: "absolute", minWidth: 44, minHeight: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", padding: 3 },
  layoutLabel: { fontSize: 10, fontWeight: "900" },
  unitGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  unit: { minWidth: 135, flexGrow: 1, flexBasis: "44%", minHeight: 108, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  unitTitle: { fontSize: 16, fontWeight: "900" },
  unitMeta: { fontSize: typography.micro, fontWeight: "800" },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  detailTitleWrap: { flex: 1, gap: spacing.xs },
  factGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  fact: { minWidth: 135, flexGrow: 1, flexBasis: "44%", backgroundColor: colors.canvas, borderRadius: radii.md, padding: spacing.md },
  factLabel: { color: colors.muted, fontSize: typography.micro },
  factValue: { color: colors.ink, fontSize: typography.caption, fontWeight: "800", marginTop: spacing.xs },
  info: { backgroundColor: colors.canvas, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  infoTitle: { color: colors.ink, fontSize: typography.caption, fontWeight: "900" },
  empty: { color: colors.muted, paddingVertical: spacing.lg, textAlign: "center" },
  privacy: { color: colors.muted, fontSize: typography.micro, lineHeight: 18, textAlign: "center", padding: spacing.md },
  errorCard: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  error: { color: "#991B1B", lineHeight: 21 },
  action: { minHeight: 48, backgroundColor: colors.brand, borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  actionText: { color: colors.onBrand, fontWeight: "900" },
});
