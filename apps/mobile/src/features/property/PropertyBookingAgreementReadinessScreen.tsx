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

import { PropertyBookingAgreementAdvisoryDraftScreen } from "./PropertyBookingAgreementAdvisoryDraftScreen";

import {
  cancelPropertyBookingAgreementReadiness,
  confirmPropertyBookingAgreementPartyInput,
  confirmPropertyBookingAgreementSchedule,
  createPropertyBookingAgreementReadiness,
  loadPropertyBookingAgreementReadiness,
  submitPropertyBookingAgreementPartyInput,
  type PropertyBookingAgreementIdentityDocumentType,
  type PropertyBookingAgreementRelationType,
  type PropertyBookingAgreementWorkspace,
} from "./booking-agreement-readiness-api";

const RELATION_TYPES: Array<{
  value: PropertyBookingAgreementRelationType;
  label: string;
}> = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "spouse", label: "Spouse" },
  { value: "guardian", label: "Guardian" },
  {
    value: "authorized_representative",
    label: "Authorized representative",
  },
];

const IDENTITY_TYPES: Array<{
  value: PropertyBookingAgreementIdentityDocumentType;
  label: string;
}> = [
  { value: "pan", label: "PAN" },
  { value: "aadhaar", label: "Aadhaar" },
  { value: "voter_id", label: "Voter ID" },
  { value: "passport", label: "Passport" },
  {
    value: "driving_licence",
    label: "Driving licence",
  },
  {
    value: "company_registration",
    label: "Company registration",
  },
  { value: "other", label: "Other" },
];

function human(value: string | null | undefined) {
  return value
    ? value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Pending";
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

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "Not recorded";
}

export function PropertyBookingAgreementReadinessScreen({
  session,
  unitId,
  onBack,
}: {
  session: Session;
  unitId: string;
  onBack(): void;
}) {
  const [workspace, setWorkspace] =
    useState<PropertyBookingAgreementWorkspace | null>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [relationType, setRelationType] =
    useState<PropertyBookingAgreementRelationType>("father");
  const [relationName, setRelationName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [villageOrLocality, setVillageOrLocality] =
    useState("");
  const [postOffice, setPostOffice] = useState("");
  const [policeStation, setPoliceStation] = useState("");
  const [blockOrMunicipality, setBlockOrMunicipality] =
    useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [identityDocumentType, setIdentityDocumentType] =
    useState<PropertyBookingAgreementIdentityDocumentType>(
      "pan",
    );
  const [
    identityMaskedReference,
    setIdentityMaskedReference,
  ] = useState("");
  const [authorityCapacity, setAuthorityCapacity] =
    useState("");
  const [consentAccepted, setConsentAccepted] =
    useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showAdvisoryDraft, setShowAdvisoryDraft] =
    useState(false);

  function applyWorkspace(
    next: PropertyBookingAgreementWorkspace,
  ) {
    setWorkspace(next);

    const own = next.myPartyInput;

    if (!own) {
      return;
    }

    setLegalName(own.legalName ?? "");
    setRelationType(own.relationType ?? "father");
    setRelationName(own.relationName ?? "");
    setAddressLine1(own.addressLine1 ?? "");
    setAddressLine2(own.addressLine2 ?? "");
    setVillageOrLocality(own.villageOrLocality ?? "");
    setPostOffice(own.postOffice ?? "");
    setPoliceStation(own.policeStation ?? "");
    setBlockOrMunicipality(
      own.blockOrMunicipality ?? "",
    );
    setDistrict(own.district ?? "");
    setStateName(own.state ?? "");
    setPincode(own.pincode ?? "");
    setIdentityDocumentType(
      own.identityDocumentType ?? "pan",
    );
    setIdentityMaskedReference(
      own.identityMaskedReference ?? "",
    );
    setAuthorityCapacity(own.authorityCapacity ?? "");
    setConsentAccepted(own.consentAccepted);
  }

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      applyWorkspace(
        await loadPropertyBookingAgreementReadiness(
          session,
          unitId,
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The private agreement-readiness workspace could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session.access_token, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const readiness = workspace?.readiness;
    const active =
      readiness?.status === "collecting_details" ||
      readiness?.status === "ready_for_draft";

    if (!readiness?.expiresAt || !active) {
      setClock(0);
      return;
    }

    setClock(Date.now());

    const timer = setInterval(() => {
      setClock(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [
    workspace?.readiness?.id,
    workspace?.readiness?.status,
    workspace?.readiness?.expiresAt,
  ]);

  async function createReadiness() {
    const application = workspace?.application;

    if (
      !application ||
      !workspace?.permissions.canCreateReadiness
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      applyWorkspace(
        await createPropertyBookingAgreementReadiness(
          session,
          application.id,
        ),
      );
      setMessage(
        "The private agreement-readiness workspace was created. No agreement draft or payment was created.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The agreement-readiness workspace could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitOwnDetails() {
    const readiness = workspace?.readiness;

    if (
      !readiness ||
      !workspace.permissions.canSubmitOwnDetails
    ) {
      return;
    }

    if (
      !legalName.trim() ||
      !addressLine1.trim() ||
      !district.trim() ||
      !stateName.trim() ||
      !/^\d{6}$/.test(pincode.trim()) ||
      !identityMaskedReference.trim() ||
      !consentAccepted
    ) {
      setMessage(
        "Complete the required particulars, enter a six-digit PIN code, provide only a masked identity reference, and accept the acknowledgement.",
      );
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      applyWorkspace(
        await submitPropertyBookingAgreementPartyInput(
          session,
          {
            readinessId: readiness.id,
            legalName,
            relationType,
            relationName: relationName.trim() || null,
            addressLine1,
            addressLine2: addressLine2.trim() || null,
            villageOrLocality:
              villageOrLocality.trim() || null,
            postOffice: postOffice.trim() || null,
            policeStation: policeStation.trim() || null,
            blockOrMunicipality:
              blockOrMunicipality.trim() || null,
            district,
            state: stateName,
            pincode,
            identityDocumentType,
            identityMaskedReference,
            authorityCapacity:
              authorityCapacity.trim() || null,
            consentAccepted: true,
          },
        ),
      );
      setMessage(
        "Your structured particulars were submitted privately. No raw identity document was uploaded.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your private particulars could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmOwnDetails() {
    const readiness = workspace?.readiness;

    if (
      !readiness ||
      !workspace.permissions.canConfirmOwnDetails
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      applyWorkspace(
        await confirmPropertyBookingAgreementPartyInput(
          session,
          readiness.id,
        ),
      );
      setMessage(
        "Your own submitted particulars were confirmed. The other party's private particulars remain hidden.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your particulars could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmSchedule() {
    const readiness = workspace?.readiness;

    if (
      !readiness ||
      !workspace.permissions.canConfirmPropertySchedule
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      applyWorkspace(
        await confirmPropertyBookingAgreementSchedule(
          session,
          readiness.id,
        ),
      );
      setMessage(
        "The canonical property schedule was confirmed. This is advisory ready-for-draft status only.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The protected property schedule could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelReadiness() {
    const readiness = workspace?.readiness;

    if (
      !readiness ||
      !workspace.permissions.canCancelReadiness
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      applyWorkspace(
        await cancelPropertyBookingAgreementReadiness(
          session,
          {
            readinessId: readiness.id,
            reason: cancelReason.trim() || null,
          },
        ),
      );
      setCancelReason("");
      setMessage(
        "The readiness workspace was cancelled. The accepted application and reserved inventory remain unchanged.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The agreement-readiness workspace could not be cancelled.",
      );
    } finally {
      setBusy(false);
    }
  }

  const readiness = workspace?.readiness;
  const schedule = workspace?.schedule;
  const own = workspace?.myPartyInput;
  const remaining =
    readiness?.expiresAt &&
    (
      readiness.status === "collecting_details" ||
      readiness.status === "ready_for_draft"
    )
      ? Math.max(
          0,
          Math.ceil(
            (
              Date.parse(readiness.expiresAt) -
              (clock || Date.now())
            ) / 1000,
          ),
        )
      : 0;

  if (showAdvisoryDraft && readiness) {
    return (
      <PropertyBookingAgreementAdvisoryDraftScreen
        session={session}
        readinessId={readiness.id}
        onBack={() => setShowAdvisoryDraft(false)}
      />
    );
  }

  if (!workspace && busy) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          accessibilityRole="progressbar"
          style={styles.centered}
        >
          <ActivityIndicator size="large" color="#0F766E" />
          <Text
            accessibilityLiveRegion="polite"
            style={styles.muted}
          >
            Loading private agreement readiness…
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
            onRefresh={load}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            Private agreement readiness
          </Text>
          <Text style={styles.heroText}>
            Collect and confirm structured particulars and the
            canonical property schedule before a later advisory
            drafting stage.
          </Text>
        </View>

        {message ? (
          <View
            accessibilityLiveRegion="assertive"
            style={styles.messageCard}
          >
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {workspace ? (
          <>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.title}>
                Readiness status
              </Text>
              <Row
                label="Your role"
                value={human(workspace.permissions.actor)}
              />
              <Row
                label="Workspace"
                value={
                  readiness
                    ? human(readiness.status)
                    : "Not created"
                }
              />
              {readiness?.expiresAt ? (
                <Row
                  label="Time remaining"
                  value={countdown(remaining)}
                />
              ) : null}
              <Row
                label="Buyer details submitted"
                value={
                  workspace.progress.buyerDetailsSubmitted
                    ? "Yes"
                    : "Pending"
                }
              />
              <Row
                label="Buyer details confirmed"
                value={
                  workspace.progress.buyerDetailsConfirmed
                    ? "Yes"
                    : "Pending"
                }
              />
              <Row
                label="Owner details submitted"
                value={
                  workspace.progress.ownerDetailsSubmitted
                    ? "Yes"
                    : "Pending"
                }
              />
              <Row
                label="Owner details confirmed"
                value={
                  workspace.progress.ownerDetailsConfirmed
                    ? "Yes"
                    : "Pending"
                }
              />
              <Row
                label="Property schedule confirmed"
                value={
                  workspace.progress.propertyScheduleConfirmed
                    ? "Yes"
                    : "Pending"
                }
              />
              <Row
                label="Ready for advisory draft"
                value={
                  workspace.progress.readyForDraft
                    ? "Yes"
                    : "No"
                }
              />
            </View>

            {!readiness &&
            workspace.permissions.canCreateReadiness ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Start protected readiness
                </Text>
                <Text style={styles.muted}>
                  Either party to the accepted application may start
                  this private workspace. Canonical price, unit,
                  boundaries and structured legal identifiers are
                  snapshotted by the server.
                </Text>
                <Button
                  disabled={busy}
                  label="Create agreement-readiness workspace"
                  onPress={createReadiness}
                />
              </View>
            ) : null}

            {schedule ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Canonical property schedule
                </Text>
                <Row
                  label="Unit"
                  value={
                    schedule.unitCode +
                    (schedule.unitTitle
                      ? " — " + schedule.unitTitle
                      : "")
                  }
                />
                <Row
                  label="Unit kind"
                  value={human(schedule.unitKind)}
                />
                <Row
                  label="Project"
                  value={schedule.projectName ?? "—"}
                />
                <Row
                  label="Server property price"
                  value={money(
                    schedule.quotedPropertyPricePaise,
                  )}
                />
                <Row
                  label="North boundary"
                  value={schedule.boundaryNorth}
                />
                <Row
                  label="South boundary"
                  value={schedule.boundarySouth}
                />
                <Row
                  label="East boundary"
                  value={schedule.boundaryEast}
                />
                <Row
                  label="West boundary"
                  value={schedule.boundaryWest}
                />
                <Row
                  label="Plot numbers"
                  value={formatList(schedule.plotNumbers)}
                />
                <Row
                  label="Deed numbers"
                  value={formatList(schedule.deedNumbers)}
                />
                <Row
                  label="Mutation numbers"
                  value={formatList(schedule.mutationNumbers)}
                />
                <Row
                  label="Khatian numbers"
                  value={formatList(schedule.khatianNumbers)}
                />
                <Row
                  label="Print layout"
                  value={
                    schedule.printLayout.pageSize +
                    " · portrait"
                  }
                />
                <Text style={styles.warning}>
                  This screen shows the canonical structured schedule
                  only. It does not open or expose confidential deeds,
                  mutations, tax papers or other legal files.
                </Text>

                {workspace.permissions
                  .canConfirmPropertySchedule ? (
                  <Button
                    disabled={busy}
                    label="Confirm canonical property schedule"
                    onPress={confirmSchedule}
                  />
                ) : null}
              </View>
            ) : null}

            {readiness &&
            workspace.permissions.canSubmitOwnDetails ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Your private particulars
                </Text>
                <Text style={styles.muted}>
                  These fields belong only to your authenticated
                  account. The other party cannot see them through
                  this mobile workspace.
                </Text>

                <Field
                  label="Legal name"
                  value={legalName}
                  onChangeText={setLegalName}
                />

                <Text style={styles.fieldLabel}>
                  Relation type
                </Text>
                <View style={styles.choiceWrap}>
                  {RELATION_TYPES.map((option) => (
                    <Choice
                      key={option.value}
                      selected={relationType === option.value}
                      label={option.label}
                      onPress={() =>
                        setRelationType(option.value)
                      }
                    />
                  ))}
                </View>

                <Field
                  label="Relation name"
                  value={relationName}
                  onChangeText={setRelationName}
                />
                <Field
                  label="Address line 1"
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                />
                <Field
                  label="Address line 2 (optional)"
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                />
                <Field
                  label="Village or locality (optional)"
                  value={villageOrLocality}
                  onChangeText={setVillageOrLocality}
                />
                <Field
                  label="Post office (optional)"
                  value={postOffice}
                  onChangeText={setPostOffice}
                />
                <Field
                  label="Police station (optional)"
                  value={policeStation}
                  onChangeText={setPoliceStation}
                />
                <Field
                  label="Block or municipality (optional)"
                  value={blockOrMunicipality}
                  onChangeText={setBlockOrMunicipality}
                />
                <Field
                  label="District"
                  value={district}
                  onChangeText={setDistrict}
                />
                <Field
                  label="State"
                  value={stateName}
                  onChangeText={setStateName}
                />
                <Field
                  keyboardType="number-pad"
                  label="Six-digit PIN code"
                  maxLength={6}
                  value={pincode}
                  onChangeText={setPincode}
                />

                <Text style={styles.fieldLabel}>
                  Identity-document type
                </Text>
                <View style={styles.choiceWrap}>
                  {IDENTITY_TYPES.map((option) => (
                    <Choice
                      key={option.value}
                      selected={
                        identityDocumentType === option.value
                      }
                      label={option.label}
                      onPress={() =>
                        setIdentityDocumentType(option.value)
                      }
                    />
                  ))}
                </View>

                <Field
                  label="Masked identity reference"
                  value={identityMaskedReference}
                  onChangeText={setIdentityMaskedReference}
                  placeholder="Example: XXXXX1234X"
                />
                <Text style={styles.warning}>
                  Enter only a visibly masked reference. Never enter
                  or upload a complete PAN, Aadhaar, voter card,
                  passport, driving licence or registration document.
                </Text>

                <Field
                  label="Authority capacity (optional)"
                  value={authorityCapacity}
                  onChangeText={setAuthorityCapacity}
                />

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: consentAccepted,
                  }}
                  onPress={() =>
                    setConsentAccepted((current) => !current)
                  }
                  style={styles.checkboxRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      consentAccepted &&
                        styles.checkboxSelected,
                    ]}
                  >
                    <Text style={styles.checkboxMark}>
                      {consentAccepted ? "✓" : ""}
                    </Text>
                  </View>
                  <Text style={styles.checkboxText}>
                    I confirm that these are my own particulars, the
                    identity reference is masked, and this readiness
                    step does not create or execute an agreement.
                  </Text>
                </Pressable>

                <Button
                  disabled={
                    busy ||
                    !consentAccepted ||
                    !legalName.trim() ||
                    !addressLine1.trim() ||
                    !district.trim() ||
                    !stateName.trim() ||
                    !/^\d{6}$/.test(pincode.trim()) ||
                    !identityMaskedReference.trim()
                  }
                  label={
                    own?.status === "submitted"
                      ? "Update my submitted particulars"
                      : "Submit my private particulars"
                  }
                  onPress={submitOwnDetails}
                />
              </View>
            ) : null}

            {own ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Your saved particulars
                </Text>
                <Row label="Status" value={human(own.status)} />
                <Row
                  label="Legal name"
                  value={own.legalName ?? "—"}
                />
                <Row
                  label="District"
                  value={own.district ?? "—"}
                />
                <Row
                  label="State"
                  value={own.state ?? "—"}
                />
                <Row
                  label="PIN code"
                  value={own.pincode ?? "—"}
                />
                <Row
                  label="Identity type"
                  value={human(own.identityDocumentType)}
                />
                <Row
                  label="Masked reference"
                  value={own.identityMaskedReference ?? "—"}
                />
                <Text style={styles.muted}>
                  Only your own private particulars are projected
                  here. The competing party's particulars are never
                  returned to this screen.
                </Text>

                {workspace.permissions.canConfirmOwnDetails ? (
                  <Button
                    disabled={busy}
                    label="Confirm my submitted particulars"
                    onPress={confirmOwnDetails}
                  />
                ) : null}
              </View>
            ) : null}

            {workspace.progress.readyForDraft ||
            readiness?.status === "draft_generated" ? (
              <View style={styles.readyCard}>
                <Text
                  accessibilityRole="header"
                  style={styles.readyTitle}
                >
                  Advisory drafting workspace
                </Text>
                <Text style={styles.readyText}>
                  Both parties confirmed their own particulars and
                  the owner confirmed the revalidated property
                  schedule. You may now generate or review the
                  private advisory draft. Qualified lawyer review,
                  payment prerequisites and separate future
                  authorities remain mandatory.
                </Text>
                <Button
                  disabled={busy}
                  label={
                    readiness?.status === "draft_generated"
                      ? "Review private advisory draft"
                      : "Open advisory drafting workspace"
                  }
                  onPress={() => setShowAdvisoryDraft(true)}
                />
              </View>
            ) : null}

            {readiness &&
            workspace.permissions.canCancelReadiness ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>
                  Cancel readiness workspace
                </Text>
                <Field
                  label="Optional cancellation reason"
                  multiline
                  value={cancelReason}
                  onChangeText={setCancelReason}
                />
                <Button
                  danger
                  disabled={busy}
                  label="Cancel agreement readiness"
                  onPress={cancelReadiness}
                />
              </View>
            ) : null}

            <View style={styles.policyCard}>
              <Text
                accessibilityRole="header"
                style={styles.policyTitle}
              >
                Protected readiness boundary
              </Text>
              <Text style={styles.policyText}>
                This step collects structured particulars and
                confirms a server-owned schedule only. It opens no
                confidential legal document, makes no AI drafting
                request, generates or approves no agreement, creates
                no payment, performs no signature or registration,
                does not mark inventory sold, and transfers no title
                or ownership.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              The private workspace is unavailable. Pull down to
              retry.
            </Text>
          </View>
        )}

        {busy && workspace ? (
          <View
            accessibilityRole="progressbar"
            style={styles.busyRow}
          >
            <ActivityIndicator color="#0F766E" />
            <Text
              accessibilityLiveRegion="polite"
              style={styles.muted}
            >
              Saving protected readiness…
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="words"
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
        value={value}
      />
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        selected && styles.choiceSelected,
      ]}
    >
      <Text
        style={[
          styles.choiceText,
          selected && styles.choiceTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Button({
  label,
  disabled,
  danger,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
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
        danger && styles.dangerButton,
        disabled && styles.disabledButton,
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
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 94,
    textAlignVertical: "top",
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderColor: "#94A3B8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  choiceSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#CCFBF1",
  },
  choiceText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  choiceTextSelected: {
    color: "#115E59",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#64748B",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxSelected: {
    borderColor: "#0F766E",
    backgroundColor: "#0F766E",
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  checkboxText: {
    flex: 1,
    color: "#334155",
    lineHeight: 20,
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
  dangerButton: {
    backgroundColor: "#B91C1C",
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
  readyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
    padding: 18,
    gap: 8,
  },
  readyTitle: {
    color: "#166534",
    fontSize: 18,
    fontWeight: "900",
  },
  readyText: {
    color: "#166534",
    lineHeight: 21,
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
  busyRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
});
