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

import {
  generatePropertyBookingAgreementAdvisoryDraft,
  loadPropertyBookingAgreementAdvisoryDraft,
  type PropertyBookingAgreementAdvisoryDraft,
  type PropertyBookingAgreementAdvisoryDraftContent,
  type PropertyBookingAgreementAdvisoryDraftWorkspace,
} from "./booking-agreement-draft-api";

function human(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function dateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Date(timestamp).toLocaleString();
}

function structuredText(value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Structured information unavailable.";
  }
}

export function PropertyBookingAgreementAdvisoryDraftScreen({
  session,
  readinessId,
  onBack,
}: {
  session: Session;
  readinessId: string;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<PropertyBookingAgreementAdvisoryDraftWorkspace | null>(
      null,
    );
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    async (showProgress = true) => {
      if (showProgress) {
        setBusy(true);
      }

      setMessage(null);

      try {
        const next =
          await loadPropertyBookingAgreementAdvisoryDraft(
            session,
            readinessId,
          );

        setWorkspace(next);
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "The private advisory agreement draft could not be loaded.",
        );
      } finally {
        if (showProgress) {
          setBusy(false);
        }
      }
    },
    [readinessId, session],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const result =
        await generatePropertyBookingAgreementAdvisoryDraft(
          session,
          readinessId,
        );

      setMessage(
        result.replayed
          ? "The existing advisory draft was recovered safely."
          : "The advisory draft was generated. It has no legal effect and requires review by a qualified lawyer.",
      );

      await load(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The advisory agreement draft could not be generated.",
      );
    } finally {
      setGenerating(false);
    }
  }, [load, readinessId, session]);

  const draft = workspace?.draft ?? null;
  const canGenerate =
    !draft ||
    draft.status === "generation_failed" ||
    draft.status === "cancelled";

  if (!workspace && busy) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          accessibilityRole="progressbar"
          style={styles.centered}
        >
          <ActivityIndicator color="#0F766E" size="large" />
          <Text
            accessibilityLiveRegion="polite"
            style={styles.muted}
          >
            Loading private advisory draft…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => void load()}
            tintColor="#0F766E"
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to agreement readiness"
          disabled={generating}
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Agreement readiness</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Private advisory agreement draft
          </Text>
          <Text style={styles.heroText}>
            Review an AI-assisted draft prepared from the confirmed
            private particulars, canonical property schedule and
            audited legal sources.
          </Text>
        </View>

        {message ? (
          <View style={styles.messageCard}>
            <Text
              accessibilityLiveRegion="assertive"
              style={styles.messageText}
            >
              {message}
            </Text>
          </View>
        ) : null}

        <View style={styles.policyCard}>
          <Text
            accessibilityRole="header"
            style={styles.policyTitle}
          >
            Advisory-only boundary
          </Text>
          <Text style={styles.policyText}>
            This content is an AI-assisted working draft only. It
            requires review by a qualified lawyer and creates no
            agreement, approval, signature, registration, payment,
            sale, title transfer or ownership transfer.
          </Text>
        </View>

        {workspace ? (
          <>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.title}>
                Draft workspace
              </Text>
              <Row
                label="Readiness reference"
                value={workspace.readinessId}
              />
              <Row
                label="Draft availability"
                value={draft ? "Available" : "Not generated"}
              />
              {draft ? (
                <>
                  <Row
                    label="Version"
                    value={String(draft.version)}
                  />
                  <Row
                    label="Status"
                    value={human(draft.status)}
                  />
                  <Row
                    label="Generated"
                    value={dateTime(draft.generatedAt)}
                  />
                  <Row
                    label="Last updated"
                    value={dateTime(draft.updatedAt)}
                  />
                </>
              ) : null}
            </View>

            {!draft ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Generate advisory draft
                </Text>
                <Text style={styles.muted}>
                  Generation uses only canonical server-held sources.
                  No prompt, private document locator, AI credential
                  or source data is supplied by this mobile client.
                </Text>
                <Text style={styles.warning}>
                  Generation may take up to three minutes. Keep the
                  app open until the request completes.
                </Text>
                <Button
                  disabled={generating || busy}
                  label={
                    generating
                      ? "Generating advisory draft…"
                      : "Generate advisory agreement draft"
                  }
                  onPress={generate}
                />
              </View>
            ) : null}

            {draft?.status === "generation_failed" ? (
              <View style={styles.failureCard}>
                <Text
                  accessibilityRole="header"
                  style={styles.failureTitle}
                >
                  Draft generation did not complete
                </Text>
                <Row
                  label="Failure code"
                  value={
                    draft.generationFailureCode ??
                    "GENERATION_FAILED"
                  }
                />
                <Row
                  label="Failed"
                  value={dateTime(draft.generationFailedAt)}
                />
                <Text style={styles.failureText}>
                  The failure response contains no prompt, document,
                  credential or private storage information.
                </Text>
                <Button
                  disabled={generating || busy}
                  label={
                    generating
                      ? "Retrying advisory generation…"
                      : "Retry advisory draft generation"
                  }
                  onPress={generate}
                />
              </View>
            ) : null}

            {draft &&
            draft.status !== "generation_failed" &&
            !draft.draftContent ? (
              <View style={styles.pendingCard}>
                <Text
                  accessibilityRole="header"
                  style={styles.pendingTitle}
                >
                  Advisory generation in progress
                </Text>
                <Text style={styles.pendingText}>
                  The trusted server worker has not yet returned
                  readable advisory content. Pull down to refresh.
                </Text>
                <Row
                  label="Generation started"
                  value={dateTime(draft.generationStartedAt)}
                />
              </View>
            ) : null}

            {draft?.draftContent ? (
              <DraftContent
                content={draft.draftContent}
                draft={draft}
              />
            ) : null}

            {draft?.printableText ? (
              <View style={styles.documentCard}>
                <Text
                  accessibilityRole="header"
                  style={styles.documentTitle}
                >
                  Printable advisory text
                </Text>
                <Text style={styles.printableText}>
                  {draft.printableText}
                </Text>
              </View>
            ) : null}

            {draft && canGenerate && draft.status === "cancelled" ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Cancelled draft
                </Text>
                <Text style={styles.muted}>
                  This advisory draft version is cancelled. A later
                  canonical authority may permit a new version.
                </Text>
              </View>
            ) : null}

            <View style={styles.privacyCard}>
              <Text
                accessibilityRole="header"
                style={styles.privacyTitle}
              >
                Private-source protection
              </Text>
              <Text style={styles.privacyText}>
                Access is limited to the buyer and owner bound to
                this readiness workspace. AI credentials, request
                references, source hashes, document identifiers,
                storage paths and private URLs are not projected to
                this screen.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              The private advisory-draft workspace is unavailable.
              Pull down to retry.
            </Text>
          </View>
        )}

        {generating ? (
          <View
            accessibilityRole="progressbar"
            style={styles.busyRow}
          >
            <ActivityIndicator color="#0F766E" />
            <Text
              accessibilityLiveRegion="polite"
              style={styles.muted}
            >
              Generating the protected advisory draft…
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DraftContent({
  content,
  draft,
}: {
  content: PropertyBookingAgreementAdvisoryDraftContent;
  draft: PropertyBookingAgreementAdvisoryDraft;
}) {
  return (
    <>
      <View style={styles.advisoryCard}>
        <Text
          accessibilityRole="header"
          style={styles.advisoryTitle}
        >
          {content.documentTitle}
        </Text>
        <Text style={styles.advisoryNotice}>
          {content.advisoryNotice}
        </Text>
        <Row
          label="Draft version"
          value={String(draft.version)}
        />
        <Row
          label="Lawyer review"
          value="Mandatory"
        />
        <Row
          label="Legal effect"
          value="None"
        />
      </View>

      <StructuredSection
        title="Parties"
        value={content.parties}
      />
      <StructuredSection
        title="Canonical property schedule"
        value={content.propertySchedule}
      />
      <StructuredSection
        title="Financial terms"
        value={content.financialTerms}
      />

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          Advisory clauses
        </Text>
        {content.clauses.map((clause, index) => (
          <View key={index} style={styles.clause}>
            <Text style={styles.clauseTitle}>
              Clause {index + 1}
            </Text>
            <Text selectable style={styles.structuredText}>
              {structuredText(clause)}
            </Text>
          </View>
        ))}
      </View>

      <StructuredSection
        title="Lawyer-review instructions"
        value={content.lawyerReview}
      />
    </>
  );
}

function StructuredSection({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown>;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text selectable style={styles.structuredText}>
        {structuredText(value)}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text selectable style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

function Button({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 18,
    paddingBottom: 48,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 18,
  },
  backText: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "800",
  },
  hero: {
    borderRadius: 22,
    backgroundColor: "#0F766E",
    padding: 22,
    gap: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  heroText: {
    color: "#CCFBF1",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 13,
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  muted: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
  },
  warning: {
    color: "#92400E",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 20,
  },
  messageCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
    padding: 16,
  },
  messageText: {
    color: "#1E3A8A",
    lineHeight: 21,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 9,
    gap: 3,
  },
  rowLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  rowValue: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  advisoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
    padding: 18,
    gap: 12,
  },
  advisoryTitle: {
    color: "#166534",
    fontSize: 20,
    fontWeight: "900",
  },
  advisoryNotice: {
    color: "#166534",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },
  pendingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
    padding: 18,
    gap: 12,
  },
  pendingTitle: {
    color: "#1E3A8A",
    fontSize: 18,
    fontWeight: "900",
  },
  pendingText: {
    color: "#1E40AF",
    lineHeight: 21,
  },
  failureCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 18,
    gap: 12,
  },
  failureTitle: {
    color: "#991B1B",
    fontSize: 18,
    fontWeight: "900",
  },
  failureText: {
    color: "#991B1B",
    lineHeight: 21,
  },
  documentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C4B5FD",
    backgroundColor: "#FAF5FF",
    padding: 18,
    gap: 14,
  },
  documentTitle: {
    color: "#5B21B6",
    fontSize: 18,
    fontWeight: "900",
  },
  printableText: {
    color: "#1E293B",
    fontSize: 14,
    lineHeight: 23,
  },
  structuredText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: undefined,
  },
  clause: {
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 7,
  },
  clauseTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  policyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
    padding: 18,
    gap: 8,
  },
  policyTitle: {
    color: "#78350F",
    fontSize: 18,
    fontWeight: "900",
  },
  policyText: {
    color: "#78350F",
    fontSize: 14,
    lineHeight: 21,
  },
  privacyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#A5B4FC",
    backgroundColor: "#EEF2FF",
    padding: 18,
    gap: 8,
  },
  privacyTitle: {
    color: "#3730A3",
    fontSize: 18,
    fontWeight: "900",
  },
  privacyText: {
    color: "#3730A3",
    fontSize: 14,
    lineHeight: 21,
  },
  busyRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
});
