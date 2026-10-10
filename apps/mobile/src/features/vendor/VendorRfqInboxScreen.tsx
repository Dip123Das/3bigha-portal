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

import {
  loadVendorRfqs,
  type VendorRfqInbox,
  type VendorRfqRow,
} from "@/features/vendor/api";
import {
  colors,
  radii,
  spacing,
  typography,
} from "@/theme/tokens";

export function VendorRfqInboxScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack(): void;
}) {
  const [data, setData] = useState<VendorRfqInbox | null>(null);
  const [selected, setSelected] = useState<VendorRfqRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      setData(await loadVendorRfqs(session));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your assigned RFQs could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = useMemo(() => data?.rows ?? [], [data]);

  if (!data && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading assigned RFQs"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.muted}>Loading your assigned RFQs…</Text>
      </SafeAreaView>
    );
  }

  if (!data && message) {
    return (
      <SafeAreaView style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
        <Button label="Try again" onPress={() => void refresh()} />
        <Button label="Back to dashboard" onPress={onBack} secondary />
      </SafeAreaView>
    );
  }

  if (selected) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <Back
            label="Back to assigned RFQs"
            onPress={() => setSelected(null)}
          />

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>ASSIGNED RFQ</Text>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              {selected.name || "Buyer requirement"}
            </Text>
            <Text style={styles.heroBody}>
              {[selected.delivery_city, selected.delivery_district]
                .filter(Boolean)
                .join(" · ") || "Delivery location not specified"}
            </Text>
          </View>

          <View style={styles.card}>
            <Field label="RFQ reference" value={selected.id} />
            <Field label="Status" value={selected.status || "open"} />
            <Field
              label="Assignment status"
              value={selected.target_status || "assigned"}
            />
            <Field label="Phone" value={selected.phone} />
            <Field label="WhatsApp" value={selected.whatsapp} />
            <Field label="Email" value={selected.email} />
            <Field
              label="Pincode"
              value={selected.delivery_pincode}
            />
            <Field
              label="Received"
              value={formatDate(
                selected.target_created_at || selected.created_at,
              )}
            />
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Protected native view</Text>
            <Text style={styles.muted}>
              This RFQ was returned by the canonical vendor assignment
              authority for your signed-in account. Quote submission and
              conversation actions will be enabled through dedicated mobile
              endpoints in the next MOB-48 slice.
            </Text>
          </View>
        </ScrollView>
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
            onRefresh={() => void refresh()}
            tintColor={colors.brand}
          />
        }
      >
        <Back label="Back to dashboard" onPress={onBack} />

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>NATIVE VENDOR WORKSPACE</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Assigned RFQs
          </Text>
          <Text style={styles.heroBody}>
            Review buyer requirements assigned to your authenticated
            vendor account without leaving the 3Bigha app.
          </Text>
        </View>

        {data ? (
          <View style={styles.metrics}>
            <Metric
              label="Last 7 days"
              value={data.analytics.leadsLast7Days}
            />
            <Metric
              label="Last 30 days"
              value={data.analytics.leadsLast30Days}
            />
            <Metric
              label="New"
              value={data.analytics.newLeadCount}
            />
            <Metric
              label="Viewed"
              value={data.analytics.viewedLeadCount}
            />
          </View>
        ) : null}

        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}

        {rows.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No assigned RFQs</Text>
            <Text style={styles.muted}>
              New requirements will appear here when the canonical matching
              authority assigns them to your vendor account.
            </Text>
          </View>
        ) : (
          rows.map((row) => (
            <Pressable
              accessibilityHint="Shows this RFQ inside the app"
              accessibilityLabel={`Open RFQ from ${
                row.name || "buyer"
              }`}
              accessibilityRole="button"
              key={row.id}
              onPress={() => setSelected(row)}
              style={styles.card}
            >
              <View style={styles.row}>
                <Text style={styles.sectionTitle}>
                  {row.name || "Buyer requirement"}
                </Text>
                <Text style={styles.status}>
                  {humanise(row.target_status || row.status || "assigned")}
                </Text>
              </View>

              <Text style={styles.muted}>
                {[row.delivery_city, row.delivery_pincode]
                  .filter(Boolean)
                  .join(" · ") || "Delivery location not specified"}
              </Text>

              <Text style={styles.reference}>
                {row.id}
              </Text>

              <Text style={styles.open}>View inside app ›</Text>
            </Pressable>
          ))
        )}

        <Text style={styles.footnote}>
          Pull down to refresh from the production vendor assignment view.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function humanise(value: string) {
  return value
    .replace(/[._:-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function Back({
  label,
  onPress,
}: {
  label: string;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
    >
      <Text style={styles.back}>‹ {label}</Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={styles.metric}
    >
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text selectable style={styles.fieldValue}>
        {value || "Not provided"}
      </Text>
    </View>
  );
}

function Button({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress(): void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.canvas,
  },
  page: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accentSoft,
    fontSize: typography.micro,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.onBrand,
    fontSize: typography.display,
    lineHeight: 42,
    fontWeight: "900",
  },
  heroBody: {
    color: colors.onBrandMuted,
    fontSize: typography.body,
    lineHeight: 25,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metric: {
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "44%",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.brand,
    fontSize: 28,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.ink,
    fontSize: typography.caption,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  notice: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noticeTitle: {
    color: colors.brand,
    fontSize: typography.caption,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    flexShrink: 1,
  },
  status: {
    color: colors.brand,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: typography.micro,
    fontWeight: "900",
  },
  reference: {
    color: colors.muted,
    fontSize: typography.micro,
  },
  open: {
    color: colors.brand,
    fontSize: typography.caption,
    fontWeight: "900",
  },
  field: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  fieldValue: {
    color: colors.ink,
    fontSize: typography.body,
    lineHeight: 24,
  },
  muted: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 21,
  },
  error: {
    color: "#A4382A",
    textAlign: "center",
    lineHeight: 22,
  },
  back: {
    color: colors.brand,
    fontWeight: "800",
    paddingVertical: spacing.sm,
  },
  button: {
    minHeight: 52,
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  buttonSecondary: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonText: {
    color: colors.onBrand,
    fontSize: typography.caption,
    fontWeight: "900",
  },
  buttonTextSecondary: {
    color: colors.ink,
  },
  footnote: {
    color: colors.muted,
    textAlign: "center",
    fontSize: typography.caption,
    padding: spacing.lg,
  },
});
