import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
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
import {
  acquirePropertyUnitHold,
  cancelPropertyUnitHold,
  loadPropertyUnitHold,
  type PropertyUnitHoldEligibilityReason,
  type PropertyUnitHoldWorkspace,
} from "./booking-hold-api";

function human(value: string | null | undefined) {
  return value
    ? value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Pending";
}

function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-IN");
}

function remainingSeconds(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry)
    ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
    : 0;
}

function countdown(value: number) {
  const safe = Math.max(0, value);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function eligibilityMessage(reason: PropertyUnitHoldEligibilityReason) {
  switch (reason) {
    case "eligible":
      return "This verified unit is available for a temporary booking hold.";
    case "legal_review_required":
      return "Owner-granted confidential legal review is required before a hold can be created.";
    case "legal_review_expired":
      return "Your confidential legal-review access has expired. Request fresh owner approval before continuing.";
    case "unit_not_verified":
      return "This unit has not completed trusted verification and cannot be held.";
    case "unit_not_transaction_ready":
      return "This unit is not yet marked ready for a booking-intent hold.";
    case "unit_not_available":
      return "This unit is no longer available for a new hold.";
    case "unit_already_held":
      return "This unit currently has an active hold. Competing buyer details remain private.";
    case "self_hold_forbidden":
      return "An owner cannot create a buyer hold on their own unit.";
  }
}

export function PropertyBookingHoldScreen({
  session,
  unitId,
  onBack,
}: {
  session: Session;
  unitId: string;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<PropertyUnitHoldWorkspace | null>(null);
  const [intentAccepted, setIntentAccepted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await loadPropertyUnitHold(session, unitId);
      setWorkspace(next);
      setSeconds(remainingSeconds(next.hold?.expiresAt));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The temporary booking-hold workspace could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const expiresAt = workspace?.hold?.expiresAt;
    if (!expiresAt || workspace?.hold?.status !== "active") {
      setSeconds(0);
      return;
    }

    setSeconds(remainingSeconds(expiresAt));
    const timer = setInterval(() => {
      setSeconds(remainingSeconds(expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [workspace?.hold?.expiresAt, workspace?.hold?.status]);

  async function acquire() {
    const legalReviewRequestId =
      workspace?.eligibility.legalReviewRequestId;
    if (
      !workspace ||
      !workspace.permissions.canAcquireHold ||
      !workspace.eligibility.eligible ||
      !legalReviewRequestId ||
      !intentAccepted
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const next = await acquirePropertyUnitHold(session, {
        unitId: workspace.unit.id,
        legalReviewRequestId,
      });
      setWorkspace(next);
      setSeconds(remainingSeconds(next.hold?.expiresAt));
      setIntentAccepted(false);
      setMessage(
        "Your temporary 15-minute hold is active. Continue only when the later protected booking steps become available.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The temporary property-unit hold could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const hold = workspace?.hold;
    if (
      !hold ||
      hold.status !== "active" ||
      !workspace.permissions.canCancelHold
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const next = await cancelPropertyUnitHold(session, {
        holdId: hold.id,
        reason: "Cancelled by the buyer from the native app.",
      });
      setWorkspace(next);
      setSeconds(0);
      setIntentAccepted(false);
      setMessage(
        "The temporary hold was cancelled. No payment, agreement or ownership transfer was created.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The temporary property-unit hold could not be cancelled.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!workspace && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading temporary property booking hold"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Checking live unit availability…
        </Text>
      </SafeAreaView>
    );
  }

  const activeHold =
    workspace?.hold?.status === "active" && seconds > 0;

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
          accessibilityLabel="Back to confidential legal review"
          accessibilityRole="button"
          onPress={onBack}
        >
          <Text style={styles.back}>← Back to legal review</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TEMPORARY BOOKING INTENT</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Hold this property unit
          </Text>
          <Text style={styles.heroBody}>
            A successful hold reserves this exact verified unit for 15
            minutes while preserving every buyer’s privacy.
          </Text>
        </View>

        {message ? (
          <View
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.message}
          >
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {workspace ? (
          <>
            <View style={styles.card}>
              <Text style={styles.eyebrowDark}>SELECTED UNIT</Text>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {workspace.unit.title ||
                  workspace.unit.unitCode ||
                  "Property unit"}
              </Text>
              <Text style={styles.muted}>
                {workspace.unit.projectName} ·{" "}
                {human(workspace.unit.unitKind)} ·{" "}
                {human(workspace.unit.status)}
              </Text>
              <Text style={styles.verified}>✓ Verified unit</Text>
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Hold eligibility
              </Text>
              <Text
                style={
                  workspace.eligibility.eligible
                    ? styles.eligible
                    : styles.ineligible
                }
              >
                {workspace.eligibility.eligible
                  ? "Eligible"
                  : human(workspace.eligibility.reason)}
              </Text>
              <Text style={styles.muted}>
                {eligibilityMessage(workspace.eligibility.reason)}
              </Text>
            </View>

            {workspace.hold ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Your hold
                </Text>
                <Text style={styles.status}>
                  {activeHold
                    ? "Active"
                    : human(workspace.hold.status)}
                </Text>
                {activeHold ? (
                  <Text
                    accessibilityLabel={`${seconds} seconds remaining`}
                    accessibilityLiveRegion="polite"
                    style={styles.timer}
                  >
                    {countdown(seconds)}
                  </Text>
                ) : null}
                <Text style={styles.muted}>
                  Held: {dateTime(workspace.hold.heldAt)}
                </Text>
                <Text style={styles.muted}>
                  Expires: {dateTime(workspace.hold.expiresAt)}
                </Text>
                {seconds === 0 &&
                workspace.hold.status === "active" ? (
                  <Text style={styles.warning}>
                    The displayed hold time has ended. Refresh to confirm
                    canonical availability.
                  </Text>
                ) : null}
                {activeHold &&
                workspace.permissions.canCancelHold ? (
                  <Button
                    danger
                    disabled={busy}
                    label="Cancel my temporary hold"
                    onPress={() => void cancel()}
                  />
                ) : null}
              </View>
            ) : null}

            {!workspace.hold &&
            workspace.permissions.canAcquireHold &&
            workspace.eligibility.eligible ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Confirm temporary hold
                </Text>
                <Text style={styles.muted}>
                  The owner-approved legal review must remain granted.
                  Availability is checked atomically when you confirm.
                </Text>
                <Pressable
                  accessibilityLabel="Accept temporary booking-hold intent"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: intentAccepted }}
                  onPress={() =>
                    setIntentAccepted((current) => !current)
                  }
                  style={styles.consent}
                >
                  <View
                    style={[
                      styles.checkbox,
                      intentAccepted && styles.checkboxChecked,
                    ]}
                  >
                    <Text style={styles.checkmark}>
                      {intentAccepted ? "✓" : ""}
                    </Text>
                  </View>
                  <Text style={styles.consentText}>
                    I understand that this is a temporary 15-minute
                    booking-intent hold only. It creates no payment,
                    agreement, sale, title, or ownership transfer.
                  </Text>
                </Pressable>
                <Button
                  disabled={busy || !intentAccepted}
                  label="Hold this unit for 15 minutes"
                  onPress={() => void acquire()}
                />
              </View>
            ) : null}

            <View style={styles.policy}>
              <Text accessibilityRole="header" style={styles.policyTitle}>
                Protected boundary
              </Text>
              <Text style={styles.policyText}>
                This step creates no payment, agreement or ownership
                transfer. It does not expose another buyer’s identity or
                confidential legal papers. Expired or cancelled holds
                release only units that remain safely reserved.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.error}>
              The property booking-hold workspace is unavailable.
            </Text>
            <Button
              disabled={busy}
              label="Try again"
              onPress={() => void load()}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Button({
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        danger && styles.buttonDanger,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
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
  verified: { color: "#047857", fontSize: typography.caption, fontWeight: "900" },
  eligible: { color: "#047857", fontSize: 18, fontWeight: "900" },
  ineligible: { color: "#92400E", fontSize: 18, fontWeight: "900" },
  status: { color: colors.brand, fontSize: 18, fontWeight: "900" },
  timer: { color: colors.brand, fontSize: 40, lineHeight: 48, fontWeight: "900", letterSpacing: 2, textAlign: "center", paddingVertical: spacing.sm },
  warning: { color: "#92400E", fontSize: typography.caption, lineHeight: 20 },
  consent: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  checkbox: { width: 26, height: 26, borderColor: colors.border, borderWidth: 2, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkmark: { color: colors.onBrand, fontWeight: "900" },
  consentText: { flex: 1, color: colors.ink, fontSize: typography.caption, lineHeight: 20 },
  button: { minHeight: 48, backgroundColor: colors.brand, borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  buttonDanger: { backgroundColor: "#991B1B" },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.onBrand, fontWeight: "900" },
  message: { backgroundColor: "#EFF6FF", borderColor: "#93C5FD", borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  messageText: { color: "#1E3A8A", lineHeight: 21 },
  policy: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D", borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  policyTitle: { color: "#78350F", fontSize: 18, fontWeight: "900" },
  policyText: { color: "#78350F", fontSize: typography.caption, lineHeight: 21 },
  errorCard: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  error: { color: "#991B1B", lineHeight: 21 },
});
