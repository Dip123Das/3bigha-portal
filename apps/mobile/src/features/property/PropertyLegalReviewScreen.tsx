import type { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
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
  createPropertyLegalDocumentAccess,
  decidePropertyLegalReview,
  loadPropertyLegalReview,
  requestPropertyLegalReview,
  type PropertyLegalReviewDocument,
  type PropertyLegalReviewWorkspace,
} from "./legal-review-api";
import { PropertyBookingHoldScreen } from "./PropertyBookingHoldScreen";

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

function fileSize(value: number | null) {
  if (value === null) return "Size unavailable";
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function PropertyLegalReviewScreen({
  session,
  unitId,
  onBack,
}: {
  session: Session;
  unitId: string;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<PropertyLegalReviewWorkspace | null>(null);
  const [purpose, setPurpose] = useState(
    "I am considering purchasing this unit and want to review its legal papers.",
  );
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showBookingHold, setShowBookingHold] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      setWorkspace(
        await loadPropertyLegalReview(session, unitId),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The confidential legal-review workspace could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitRequest() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await requestPropertyLegalReview(session, {
        unitId,
        purpose,
        consentAccepted,
      });
      setWorkspace(next);
      setMessage(
        "Your confidential legal-review request was sent to the property owner.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The legal-review request could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function decide(
    decision: "granted" | "declined" | "revoked",
  ) {
    if (!workspace?.request) return;
    setBusy(true);
    setMessage(null);
    try {
      const next = await decidePropertyLegalReview(session, {
        requestId: workspace.request.id,
        decision,
        decisionNote: decisionNote.trim() || null,
      });
      setWorkspace(next);
      setMessage(
        decision === "granted"
          ? "Confidential access was granted for 48 hours."
          : decision === "revoked"
            ? "Confidential access was revoked."
            : "The legal-review request was declined.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The legal-review decision could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openDocument(
    document: PropertyLegalReviewDocument,
  ) {
    if (!workspace?.request) return;
    setBusy(true);
    setMessage(null);
    try {
      const access = await createPropertyLegalDocumentAccess(
        session,
        {
          requestId: workspace.request.id,
          documentId: document.id,
        },
      );
      await WebBrowser.openBrowserAsync(access.accessUrl);
      setMessage(
        "This confidential document view was recorded. Temporary access expires shortly.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The confidential legal paper could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }

  const canOpenBookingHold =
    workspace?.permissions.actor === "buyer" &&
    workspace.request?.status === "granted" &&
    Boolean(
      workspace.request.expiresAt &&
        Date.parse(workspace.request.expiresAt) > Date.now(),
    );

  if (showBookingHold) {
    return (
      <PropertyBookingHoldScreen
        onBack={() => setShowBookingHold(false)}
        session={session}
        unitId={unitId}
      />
    );
  }

  if (!workspace && busy) {
    return (
      <SafeAreaView
        accessibilityLabel="Loading confidential legal review"
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          Loading the confidential legal-review workspace…
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
          accessibilityLabel="Back to property discovery"
          accessibilityRole="button"
          onPress={onBack}
        >
          <Text style={styles.back}>← Back to selected property</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CONFIDENTIAL PROPERTY REVIEW</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Legal papers before booking
          </Text>
          <Text style={styles.heroBody}>
            Access is unit-specific, owner-approved, time-limited and
            audited. These papers never appear in public discovery.
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

            <RequestStatus workspace={workspace} />

            {canOpenBookingHold ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Temporary unit hold
                </Text>
                <Text style={styles.muted}>
                  Your owner-granted legal review is active. You may
                  now check live availability and, if still eligible,
                  hold this exact unit for 15 minutes.
                </Text>
                <Text style={styles.warning}>
                  This does not create a payment, agreement, sale,
                  title, or ownership transfer.
                </Text>
                <Button
                  disabled={busy}
                  label="Continue to temporary unit hold"
                  onPress={() => setShowBookingHold(true)}
                />
              </View>
            ) : null}

            {workspace.permissions.canRequestReview ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Request confidential access
                </Text>
                <Text style={styles.muted}>
                  Explain your genuine purchase-review purpose. The owner
                  must approve before any paper becomes visible.
                </Text>
                <TextInput
                  accessibilityLabel="Purpose for legal-paper review"
                  multiline
                  onChangeText={setPurpose}
                  placeholder="Explain why you need to review these papers"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={purpose}
                />
                <Pressable
                  accessibilityLabel="Accept confidential legal-review consent"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentAccepted }}
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
                    I will use these confidential papers only to evaluate
                    this exact unit. I understand that access expires and
                    every document view is audited.
                  </Text>
                </Pressable>
                <Button
                  disabled={
                    busy ||
                    !consentAccepted ||
                    purpose.trim().length < 10
                  }
                  label="Send legal-review request"
                  onPress={() => void submitRequest()}
                />
              </View>
            ) : null}

            {workspace.permissions.canDecideReview ||
            workspace.permissions.canRevokeReview ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Owner decision
                </Text>
                <Text style={styles.muted}>
                  Grant access only after confirming that this request is
                  genuine. A grant expires automatically after 48 hours.
                </Text>
                <TextInput
                  accessibilityLabel="Owner decision note"
                  multiline
                  onChangeText={setDecisionNote}
                  placeholder="Optional note for the buyer"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={decisionNote}
                />
                {workspace.permissions.canDecideReview ? (
                  <View style={styles.actions}>
                    <Button
                      disabled={busy}
                      label="Grant for 48 hours"
                      onPress={() => void decide("granted")}
                    />
                    <Button
                      danger
                      disabled={busy}
                      label="Decline request"
                      onPress={() => void decide("declined")}
                    />
                  </View>
                ) : null}
                {workspace.permissions.canRevokeReview ? (
                  <Button
                    danger
                    disabled={busy}
                    label="Revoke confidential access"
                    onPress={() => void decide("revoked")}
                  />
                ) : null}
              </View>
            ) : null}

            {workspace.permissions.canViewDocuments ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Unit legal papers
                </Text>
                <Text style={styles.muted}>
                  Buyer document links are generated only when opened,
                  expire after 60 seconds and are recorded in the audit
                  trail.
                </Text>
                {workspace.documents.map((document) => (
                  <DocumentCard
                    document={document}
                    key={document.id}
                    onOpen={
                      workspace.permissions.actor === "buyer"
                        ? () => void openDocument(document)
                        : undefined
                    }
                  />
                ))}
                {workspace.documents.length === 0 ? (
                  <Text style={styles.empty}>
                    No current legal paper is attached to this unit.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.error}>
              The confidential legal-review workspace is unavailable.
            </Text>
            <Button
              disabled={busy}
              label="Try again"
              onPress={() => void load()}
            />
          </View>
        )}

        <Text style={styles.privacy}>
          Legal papers remain in private storage. Public discovery never
          receives document files, storage locations or permanent links.
          Legal review is informational and is not a title certificate or
          legal opinion.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function RequestStatus({
  workspace,
}: {
  workspace: PropertyLegalReviewWorkspace;
}) {
  const request = workspace.request;
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Access status
      </Text>
      <Text style={styles.status}>
        {request ? human(request.status) : "Not requested"}
      </Text>
      {request ? (
        <>
          <Text style={styles.muted}>Purpose: {request.purpose}</Text>
          <Text style={styles.muted}>
            Requested: {dateTime(request.requestedAt)}
          </Text>
          <Text style={styles.muted}>
            Expires: {dateTime(request.expiresAt)}
          </Text>
          {request.decisionNote ? (
            <Text style={styles.muted}>
              Owner note: {request.decisionNote}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>
          No confidential-paper access has been requested for this unit.
        </Text>
      )}
    </View>
  );
}

function DocumentCard({
  document,
  onOpen,
}: {
  document: PropertyLegalReviewDocument;
  onOpen?: () => void;
}) {
  return (
    <View style={styles.document}>
      <Text style={styles.documentTitle}>{document.title}</Text>
      <Text style={styles.muted}>
        {human(document.documentType)} · {fileSize(document.fileSizeBytes)}
      </Text>
      <Text style={styles.muted}>
        Analysis: {human(document.analysisStatus)}
        {document.analysisConfidence === null
          ? ""
          : ` · ${document.analysisConfidence}% confidence`}
      </Text>
      {document.summary ? (
        <Text style={styles.summary}>{document.summary}</Text>
      ) : null}
      {document.warnings.map((warning, index) => (
        <Text key={`${document.id}-warning-${index}`} style={styles.warning}>
          ⚠ {warning}
        </Text>
      ))}
      {onOpen ? (
        <Button label="Open audited 60-second view" onPress={onOpen} />
      ) : null}
    </View>
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
  status: { color: colors.brand, fontSize: 18, fontWeight: "900" },
  input: { minHeight: 104, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, backgroundColor: colors.canvas, color: colors.ink, padding: spacing.md, textAlignVertical: "top" },
  consent: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  checkbox: { width: 26, height: 26, borderColor: colors.border, borderWidth: 2, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkmark: { color: colors.onBrand, fontWeight: "900" },
  consentText: { flex: 1, color: colors.ink, fontSize: typography.caption, lineHeight: 20 },
  actions: { gap: spacing.sm },
  document: { backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  documentTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  summary: { color: colors.ink, fontSize: typography.caption, lineHeight: 20 },
  warning: { color: "#92400E", fontSize: typography.caption, lineHeight: 20 },
  button: { minHeight: 48, backgroundColor: colors.brand, borderRadius: radii.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  buttonDanger: { backgroundColor: "#991B1B" },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.onBrand, fontWeight: "900" },
  message: { backgroundColor: "#EFF6FF", borderColor: "#93C5FD", borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  messageText: { color: "#1E3A8A", lineHeight: 21 },
  errorCard: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  error: { color: "#991B1B", lineHeight: 21 },
  empty: { color: colors.muted, paddingVertical: spacing.lg, textAlign: "center" },
  privacy: { color: colors.muted, fontSize: typography.micro, lineHeight: 18, textAlign: "center", padding: spacing.md },
});
