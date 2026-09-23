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
import {
  cancelPropertyBookingAdvance,
  confirmPropertyBookingAdvance,
  loadPropertyBookingAdvance,
  proposePropertyBookingAdvance,
  type PropertyBookingAdvanceWorkspace,
} from "./booking-advance-api";

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

function money(paise: number | null | undefined) {
  const safePaise =
    typeof paise === "number" && Number.isFinite(paise)
      ? paise
      : 0;

  return (safePaise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
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

  if (days > 0) {
    return (
      String(days) +
      "d " +
      String(hours).padStart(2, "0") +
      "h " +
      String(minutes).padStart(2, "0") +
      "m"
    );
  }

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

function paiseFromRupees(value: string) {
  const normalized = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const paise = Math.round(Number(normalized) * 100);

  return Number.isSafeInteger(paise) && paise > 0
    ? paise
    : null;
}

export function PropertyBookingAdvanceScreen({
  session,
  unitId,
  onBack,
}: {
  session: Session;
  unitId: string;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<PropertyBookingAdvanceWorkspace | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [ownerTermsNote, setOwnerTermsNote] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [clock, setClock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      setWorkspace(
        await loadPropertyBookingAdvance(session, unitId),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private property-advance workspace could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const expiresAt = workspace?.advance?.expiresAt;
    const status = workspace?.advance?.status;
    const active =
      status === "owner_proposed" ||
      status === "buyer_confirmed" ||
      status === "gateway_configuration_pending";

    if (!expiresAt || !active) {
      setClock(0);
      return;
    }

    setClock(Date.now());

    const timer = setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [
    workspace?.advance?.id,
    workspace?.advance?.status,
    workspace?.advance?.expiresAt,
  ]);

  async function propose() {
    const application = workspace?.application;
    const amountPaise = paiseFromRupees(advanceAmount);

    if (
      !application ||
      application.status !== "accepted" ||
      !workspace?.permissions.canProposeAdvance
    ) {
      return;
    }

    if (!amountPaise) {
      setMessage(
        "Enter a valid advance amount in rupees with no more than two decimal places.",
      );
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const next = await proposePropertyBookingAdvance(
        session,
        {
          applicationId: application.id,
          advanceAmountPaise: amountPaise,
          ownerTermsNote: ownerTermsNote.trim() || null,
        },
      );

      setWorkspace(next);
      setAdvanceAmount("");
      setOwnerTermsNote("");
      setMessage(
        "The private advance proposal was saved for buyer review. No payment order was created and no money was collected.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private property-advance proposal could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    const advance = workspace?.advance;

    if (
      !advance ||
      !workspace?.permissions.canConfirmAdvance ||
      !consentAccepted
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const next = await confirmPropertyBookingAdvance(
        session,
        {
          advanceRequestId: advance.id,
          consentAccepted: true,
        },
      );

      setWorkspace(next);
      setConsentAccepted(false);
      setMessage(
        "Your acknowledgement was recorded. Gateway-order creation remains disabled, and no money was collected.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private property-advance acknowledgement could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const advance = workspace?.advance;

    if (
      !advance ||
      !workspace?.permissions.canCancelAdvance
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const next = await cancelPropertyBookingAdvance(
        session,
        {
          advanceRequestId: advance.id,
          reason:
            "Cancelled by the buyer from the native readiness workflow.",
        },
      );

      setWorkspace(next);
      setConsentAccepted(false);
      setMessage(
        "The advance request was cancelled. No payment order was created, no money was collected, and the accepted application remains unchanged.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private property-advance request could not be cancelled.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!workspace && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading private property advance readiness"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Loading the private property-advance workspace…
        </Text>
      </SafeAreaView>
    );
  }

  const application = workspace?.application;
  const advance = workspace?.advance;
  const seconds = remainingSeconds(advance?.expiresAt);
  void clock;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={
          <RefreshControl
            onRefresh={() => void load()}
            refreshing={busy}
            tintColor={colors.brand}
          />
        }
      >
        <Pressable
          accessibilityLabel="Back to private booking application"
          accessibilityRole="button"
          disabled={busy}
          onPress={onBack}
        >
          <Text style={styles.back}>‹ Back to booking application</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            PRIVATE PROPERTY-ADVANCE READINESS
          </Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Review the protected advance step
          </Text>
          <Text style={styles.heroBody}>
            The owner may propose an amount from the server-owned
            property price. The buyer may acknowledge it before any
            separately protected payment integration becomes available.
          </Text>
        </View>

        {message ? (
          <View accessibilityRole="alert" style={styles.message}>
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
                Accepted application and reserved inventory required
              </Text>
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Booking application
              </Text>
              <Text style={styles.status}>
                {human(application?.status)}
              </Text>
              <Text style={styles.muted}>
                Advance readiness is available only for an accepted
                application within its protected next-step window.
              </Text>
            </View>

            {advance ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Property-advance proposal
                </Text>
                <Text style={styles.status}>
                  {human(advance.status)}
                </Text>

                <View style={styles.amountRow}>
                  <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>
                      Server property price
                    </Text>
                    <Text style={styles.amountValue}>
                      {money(advance.quotedPropertyPricePaise)}
                    </Text>
                  </View>
                  <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>
                      Proposed advance
                    </Text>
                    <Text style={styles.amountValue}>
                      {money(advance.advanceAmountPaise)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.muted}>
                  Price source: Builder inventory pricing
                </Text>
                <Text style={styles.muted}>
                  Price snapshot: {dateTime(advance.pricingSnapshotAt)}
                </Text>
                <Text style={styles.muted}>
                  Owner proposed: {dateTime(advance.ownerProposedAt)}
                </Text>

                {advance.ownerTermsNote ? (
                  <View style={styles.note}>
                    <Text style={styles.noteLabel}>Owner terms note</Text>
                    <Text style={styles.noteText}>
                      {advance.ownerTermsNote}
                    </Text>
                  </View>
                ) : null}

                {advance.buyerConsentedAt ? (
                  <Text style={styles.confirmed}>
                    Buyer acknowledgement recorded:{" "}
                    {dateTime(advance.buyerConsentedAt)}
                  </Text>
                ) : null}

                {seconds > 0 ? (
                  <>
                    <Text
                      accessibilityLabel={
                        String(seconds) + " seconds remaining"
                      }
                      accessibilityLiveRegion="polite"
                      style={styles.timer}
                    >
                      {countdown(seconds)}
                    </Text>
                    <Text style={styles.muted}>
                      Readiness window ends:{" "}
                      {dateTime(advance.expiresAt)}
                    </Text>
                  </>
                ) : null}

                {seconds === 0 &&
                (advance.status === "owner_proposed" ||
                  advance.status === "buyer_confirmed" ||
                  advance.status ===
                    "gateway_configuration_pending") ? (
                  <Text style={styles.warning}>
                    The displayed readiness window has ended. Refresh
                    to obtain the canonical state.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {!advance &&
            application?.status === "accepted" &&
            workspace.permissions.actor === "owner" &&
            workspace.permissions.canProposeAdvance ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Owner advance proposal
                </Text>
                <Text style={styles.muted}>
                  Enter only the proposed advance amount. The canonical
                  property price is loaded and validated on the server;
                  it cannot be supplied from this device.
                </Text>

                <TextInput
                  accessibilityLabel="Proposed advance amount in rupees"
                  editable={!busy}
                  keyboardType="decimal-pad"
                  maxLength={16}
                  onChangeText={setAdvanceAmount}
                  placeholder="Advance amount in rupees"
                  placeholderTextColor={colors.muted}
                  style={styles.amountInput}
                  value={advanceAmount}
                />

                <TextInput
                  accessibilityLabel="Optional owner advance terms"
                  editable={!busy}
                  maxLength={2000}
                  multiline
                  onChangeText={setOwnerTermsNote}
                  placeholder="Optional protected terms note"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={ownerTermsNote}
                />

                <Text style={styles.warning}>
                  Saving this proposal does not contact SBI, create a
                  gateway order, collect money, create an agreement, or
                  change ownership.
                </Text>

                <Button
                  disabled={
                    busy ||
                    paiseFromRupees(advanceAmount) === null
                  }
                  label="Save private advance proposal"
                  onPress={() => void propose()}
                />
              </View>
            ) : null}

            {advance &&
            workspace.permissions.actor === "buyer" &&
            workspace.permissions.canConfirmAdvance ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Buyer acknowledgement
                </Text>
                <Text style={styles.muted}>
                  Review the owner’s amount and terms. This acknowledgement
                  records consent for the protected advance lifecycle only.
                </Text>

                <Pressable
                  accessibilityLabel="Accept private property advance acknowledgement"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentAccepted }}
                  disabled={busy}
                  onPress={() =>
                    setConsentAccepted((current) => !current)
                  }
                  style={styles.consent}
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentAccepted && styles.checkboxChecked,
                    ]}
                  >
                    <Text style={styles.checkmark}>
                      {consentAccepted ? "✓" : ""}
                    </Text>
                  </View>
                  <Text style={styles.consentText}>
                    I acknowledge the proposed amount and understand
                    that this does not initiate payment, create an
                    agreement, mark the unit sold, transfer title, or
                    transfer ownership.
                  </Text>
                </Pressable>

                <Button
                  disabled={busy || !consentAccepted}
                  label="Confirm advance readiness"
                  onPress={() => void confirm()}
                />
              </View>
            ) : null}

            {advance &&
            workspace.permissions.actor === "buyer" &&
            workspace.permissions.canCancelAdvance ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Buyer cancellation
                </Text>
                <Text style={styles.muted}>
                  You may cancel this request while it remains within
                  the permitted pre-gateway lifecycle. The accepted
                  booking application and reserved inventory remain
                  unchanged.
                </Text>
                <Button
                  danger
                  disabled={busy}
                  label="Cancel advance request"
                  onPress={() => void cancel()}
                />
              </View>
            ) : null}

            <View style={styles.gatewayCard}>
              <Text accessibilityRole="header" style={styles.gatewayTitle}>
                SBI payment gateway readiness
              </Text>
              <Text style={styles.gatewayStatus}>
                {workspace.gateway.configured
                  ? "Configuration detected"
                  : "Configuration pending"}
              </Text>
              <Text style={styles.gatewayText}>
                {workspace.gateway.configured
                  ? "SBI configuration is detected, but gateway-order creation remains disabled in MOB-34."
                  : "SBI payment configuration is pending. No payment action is available."}
              </Text>
              <Text style={styles.gatewayText}>
                This screen never requests gateway credentials and
                provides no payment-order, payment-link, redirect, or
                money-collection control.
              </Text>
            </View>

            <View style={styles.policy}>
              <Text accessibilityRole="header" style={styles.policyTitle}>
                Readiness only — no financial transaction
              </Text>
              <Text style={styles.policyText}>
                MOB-34 records a server-priced owner proposal and buyer
                acknowledgement only. It creates no gateway order,
                collects no money, creates no agreement, does not mark
                inventory sold, and transfers no title or ownership.
                Private identities, gateway internals, and confidential
                storage details are not exposed.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.error}>
              The private property-advance workspace is unavailable.
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
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  amountBlock: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  amountLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  amountValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
  },
  amountInput: {
    minHeight: 52,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    backgroundColor: colors.canvas,
    fontSize: 18,
    fontWeight: "800",
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
  confirmed: {
    color: "#047857",
    fontSize: typography.caption,
    lineHeight: 20,
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
  gatewayCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  gatewayTitle: {
    color: "#1E3A8A",
    fontSize: 18,
    fontWeight: "900",
  },
  gatewayStatus: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "900",
  },
  gatewayText: {
    color: "#1E3A8A",
    fontSize: typography.caption,
    lineHeight: 21,
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
