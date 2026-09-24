import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme/tokens";
import { PropertyBookingAdvanceScreen } from "./PropertyBookingAdvanceScreen";
import { PropertyBookingAgreementReadinessScreen } from "./PropertyBookingAgreementReadinessScreen";
import {
  cancelPropertyBookingApplication,
  decidePropertyBookingApplication,
  loadPropertyBookingApplication,
  submitPropertyBookingApplication,
  type PropertyBookingApplicationWorkspace,
} from "./booking-application-api";

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

function remainingSeconds(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000))
    : 0;
}

function countdown(value: number) {
  const safe = Math.max(0, value);
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  return days > 0
    ? `${days}d ${String(hours).padStart(2, "0")}h ${String(
        minutes,
      ).padStart(2, "0")}m`
    : `${String(hours).padStart(2, "0")}:${String(
        minutes,
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PropertyBookingApplicationScreen({
  session,
  unitId,
  onBack,
}: {
  session: Session;
  unitId: string;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<PropertyBookingApplicationWorkspace | null>(null);
  const [intentAccepted, setIntentAccepted] = useState(false);
  const [buyerMessage, setBuyerMessage] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [clock, setClock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showBookingAdvance, setShowBookingAdvance] =
    useState(false);
  const [showAgreementReadiness, setShowAgreementReadiness] =
    useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      setWorkspace(
        await loadPropertyBookingApplication(session, unitId),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private booking-application workspace could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const application = workspace?.application;
    const active =
      application?.status === "submitted" ||
      application?.status === "accepted";

    if (!active) {
      setClock(0);
      return;
    }

    setClock(Date.now());
    const timer = setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [
    workspace?.application?.id,
    workspace?.application?.status,
    workspace?.application?.decisionDueAt,
    workspace?.application?.acceptedUntil,
  ]);

  async function submit() {
    const hold = workspace?.hold;
    if (
      !workspace ||
      !hold ||
      hold.status !== "active" ||
      !workspace.permissions.canSubmitApplication ||
      !intentAccepted
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const next = await submitPropertyBookingApplication(
        session,
        {
          holdId: hold.id,
          buyerMessage: buyerMessage.trim() || null,
        },
      );
      setWorkspace(next);
      setIntentAccepted(false);
      setMessage(
        "Your private booking application was submitted for the owner’s decision. The unit remains reserved.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private booking application could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "accepted" | "declined") {
    const application = workspace?.application;
    if (
      !application ||
      application.status !== "submitted" ||
      (decision === "accepted" &&
        !workspace?.permissions.canAcceptApplication) ||
      (decision === "declined" &&
        !workspace?.permissions.canDeclineApplication)
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const next = await decidePropertyBookingApplication(
        session,
        {
          applicationId: application.id,
          decision,
          decisionNote: decisionNote.trim() || null,
        },
      );
      setWorkspace(next);
      setMessage(
        decision === "accepted"
          ? "The booking application was accepted for 48 hours. The unit remains reserved, but no payment or agreement has been created."
          : "The booking application was declined. Any safe inventory release is handled by the canonical authority.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The booking-application decision could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const application = workspace?.application;
    if (
      !application ||
      !workspace?.permissions.canCancelApplication
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const next = await cancelPropertyBookingApplication(
        session,
        {
          applicationId: application.id,
          reason:
            "Cancelled by the buyer from the native app.",
        },
      );
      setWorkspace(next);
      setIntentAccepted(false);
      setMessage(
        "The booking application was cancelled. No payment, agreement, sale, title or ownership transfer was created.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The booking application could not be cancelled.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (showBookingAdvance) {
    return (
      <PropertyBookingAdvanceScreen
        onBack={() => setShowBookingAdvance(false)}
        session={session}
        unitId={unitId}
      />
    );
  }

  if (showAgreementReadiness) {
    return (
      <PropertyBookingAgreementReadinessScreen
        onBack={() => setShowAgreementReadiness(false)}
        session={session}
        unitId={unitId}
      />
    );
  }

  if (!workspace && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading private property booking application"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Loading the private booking-application workspace…
        </Text>
      </SafeAreaView>
    );
  }

  const application = workspace?.application;
  const deadline =
    application?.status === "accepted"
      ? application.acceptedUntil
      : application?.status === "submitted"
        ? application.decisionDueAt
        : null;
  const seconds = remainingSeconds(deadline);
  void clock;

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
          accessibilityLabel="Back to temporary property-unit hold"
          accessibilityRole="button"
          onPress={onBack}
        >
          <Text style={styles.back}>← Back to temporary hold</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PRIVATE BOOKING APPLICATION</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Request the owner’s decision
          </Text>
          <Text style={styles.heroBody}>
            Convert an active temporary hold into an owner-reviewed
            application while keeping this exact unit reserved.
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
              <Text style={styles.reserved}>
                Inventory remains reserved
              </Text>
            </View>

            {application ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Booking application
                </Text>
                <Text style={styles.status}>
                  {human(application.status)}
                </Text>

                {(application.status === "submitted" ||
                  application.status === "accepted") &&
                deadline ? (
                  <>
                    <Text
                      accessibilityLabel={`${seconds} seconds remaining`}
                      accessibilityLiveRegion="polite"
                      style={styles.timer}
                    >
                      {countdown(seconds)}
                    </Text>
                    <Text style={styles.muted}>
                      {application.status === "submitted"
                        ? "Owner decision due"
                        : "Accepted next-step window ends"}
                      : {dateTime(deadline)}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.muted}>
                  Submitted: {dateTime(application.submittedAt)}
                </Text>

                {application.buyerMessage ? (
                  <View style={styles.note}>
                    <Text style={styles.noteLabel}>Buyer message</Text>
                    <Text style={styles.noteText}>
                      {application.buyerMessage}
                    </Text>
                  </View>
                ) : null}

                {application.ownerDecisionNote ? (
                  <View style={styles.note}>
                    <Text style={styles.noteLabel}>Owner note</Text>
                    <Text style={styles.noteText}>
                      {application.ownerDecisionNote}
                    </Text>
                  </View>
                ) : null}

                {seconds === 0 &&
                (application.status === "submitted" ||
                  application.status === "accepted") ? (
                  <Text style={styles.warning}>
                    The displayed window has ended. Refresh to confirm
                    the canonical application and inventory state.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {application?.status === "accepted" &&
            seconds > 0 ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Private property-advance readiness
                </Text>
                <Text style={styles.muted}>
                  {workspace.permissions.actor === "owner"
                    ? "Set a protected advance proposal using the canonical server-owned property price."
                    : "Review the owner’s protected advance proposal and record your acknowledgement."}
                </Text>
                <Text style={styles.warning}>
                  This readiness step creates no gateway order,
                  collects no money, creates no agreement, does not
                  mark inventory sold, and transfers no title or
                  ownership.
                </Text>
                <Button
                  disabled={busy}
                  label={
                    workspace.permissions.actor === "owner"
                      ? "Set private advance proposal"
                      : "Review private advance readiness"
                  }
                  onPress={() => setShowBookingAdvance(true)}
                />
              </View>
            ) : null}

            {application?.status === "accepted" &&
            seconds > 0 ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Private agreement readiness
                </Text>
                <Text style={styles.muted}>
                  Prepare structured party particulars and review
                  the canonical server-owned property schedule.
                  Each party can view and confirm only their own
                  private particulars.
                </Text>
                <Text style={styles.warning}>
                  This is advisory readiness only. It opens no
                  confidential legal document, generates no
                  agreement, performs no signature or registration,
                  collects no payment, does not mark inventory sold,
                  and transfers no title or ownership.
                </Text>
                <Button
                  disabled={busy}
                  label={
                    workspace.permissions.actor === "owner"
                      ? "Prepare private agreement readiness"
                      : "Review private agreement readiness"
                  }
                  onPress={() => setShowAgreementReadiness(true)}
                />
              </View>
            ) : null}

            {!application &&
            workspace.permissions.canSubmitApplication &&
            workspace.hold?.status === "active" ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Submit for owner review
                </Text>
                <Text style={styles.muted}>
                  Your active hold will be converted atomically into
                  this private application. The unit stays reserved.
                </Text>
                <TextInput
                  accessibilityLabel="Optional message to property owner"
                  editable={!busy}
                  maxLength={1000}
                  multiline
                  onChangeText={setBuyerMessage}
                  placeholder="Optional message for the owner"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={buyerMessage}
                />
                <Pressable
                  accessibilityLabel="Accept private booking-application intent"
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
                    I understand this is an owner-reviewed booking
                    application only. It creates no payment, agreement,
                    sale, title, or ownership transfer.
                  </Text>
                </Pressable>
                <Button
                  disabled={busy || !intentAccepted}
                  label="Submit private booking application"
                  onPress={() => void submit()}
                />
              </View>
            ) : null}

            {application?.status === "submitted" &&
            workspace.permissions.actor === "owner" ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Owner decision
                </Text>
                <Text style={styles.muted}>
                  Review the application and record a decision within
                  the protected 48-hour window.
                </Text>
                <TextInput
                  accessibilityLabel="Owner booking-application decision note"
                  editable={!busy}
                  maxLength={1000}
                  multiline
                  onChangeText={setDecisionNote}
                  placeholder="Decision note"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={decisionNote}
                />
                {workspace.permissions.canAcceptApplication ? (
                  <Button
                    disabled={busy}
                    label="Accept for 48 hours"
                    onPress={() => void decide("accepted")}
                  />
                ) : null}
                {workspace.permissions.canDeclineApplication ? (
                  <Button
                    danger
                    disabled={busy}
                    label="Decline booking application"
                    onPress={() => void decide("declined")}
                  />
                ) : null}
              </View>
            ) : null}

            {application &&
            workspace.permissions.canCancelApplication ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Buyer control
                </Text>
                <Text style={styles.muted}>
                  You may cancel your active application. The canonical
                  authority decides whether the still-reserved unit can
                  safely return to availability.
                </Text>
                <Button
                  danger
                  disabled={busy}
                  label="Cancel my booking application"
                  onPress={() => void cancel()}
                />
              </View>
            ) : null}

            <View style={styles.policy}>
              <Text accessibilityRole="header" style={styles.policyTitle}>
                Protected non-transaction boundary
              </Text>
              <Text style={styles.policyText}>
                This application records intent and the owner’s decision
                only. It does not collect money, create an agreement,
                mark inventory sold, transfer title, or transfer
                ownership. Private party identities and confidential
                legal-paper storage details are never exposed here.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.error}>
              The private booking-application workspace is unavailable.
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
  back: {
    color: colors.brand,
    fontWeight: "800",
    paddingVertical: spacing.sm,
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
  eyebrowDark: {
    color: colors.brand,
    fontSize: typography.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  reserved: {
    color: "#047857",
    fontSize: typography.caption,
    fontWeight: "900",
  },
  status: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: "900",
  },
  timer: {
    color: colors.brand,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  input: {
    minHeight: 104,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.ink,
    backgroundColor: colors.canvas,
    textAlignVertical: "top",
  },
  note: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noteLabel: {
    color: colors.brand,
    fontSize: typography.micro,
    fontWeight: "900",
  },
  noteText: {
    color: colors.ink,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  warning: {
    color: "#92400E",
    fontSize: typography.caption,
    lineHeight: 20,
  },
  consent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkmark: {
    color: colors.onBrand,
    fontWeight: "900",
  },
  consentText: {
    flex: 1,
    color: colors.ink,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  buttonDanger: {
    backgroundColor: "#991B1B",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.onBrand,
    fontWeight: "900",
  },
  message: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  messageText: {
    color: "#1E3A8A",
    lineHeight: 21,
  },
  policy: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  policyTitle: {
    color: "#78350F",
    fontSize: 18,
    fontWeight: "900",
  },
  policyText: {
    color: "#78350F",
    fontSize: typography.caption,
    lineHeight: 21,
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  error: {
    color: "#991B1B",
    lineHeight: 21,
  },
});
