"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import IndividualProfessionalVerificationSection from "./IndividualProfessionalVerificationSection";
import IndividualProfessionalAiReviewPanel from "./IndividualProfessionalAiReviewPanel";
import {
  INDIVIDUAL_PROFESSIONAL_CONSTITUTIONAL_RULES,
  resolveIndividualProfessionalEligibility,
} from "@/lib/3bos/identity/individual-professional-eligibility";

type ProfileRecord = {
  full_name: string | null;
  phone: string | null;
  role_display_label: string | null;
};

type IndividualProfessionalRecord = {
  primary_skill_key: string;
  secondary_skill_keys: string[];
  economic_mode: string;
  work_preferences: Record<string, unknown>;
  years_experience: number | null;
  availability_status: string;
  service_radius_km: number | null;
  worker_declaration_accepted: boolean;
  contractor_risk_status: string;
  verification_status: string;
  original_name_declared?: string | null;
  original_name_warning_accepted?: boolean;
  identity_document_type?: string | null;
  identity_document_masked_reference?: string | null;
  verified_selfie_json?: Record<string, unknown>;
  work_photo_one_json?: Record<string, unknown>;
  work_photo_two_json?: Record<string, unknown>;
  selfie_verification_status?: string;
  work_evidence_verification_status?: string;
  ai_verification_status?: string;
  ai_confidence?: number | null;
  ai_result_json?: Record<string, unknown>;
  ai_reviewed_at?: string | null;
  lifetime_free_decision_status?: string;
  lifetime_free_decision_reason?: string | null;
};

const INDIVIDUAL_SKILL_OPTIONS = [
  ["mason", "Mason (Rajmistri)"],
  ["carpenter", "Carpenter"],
  ["painter", "Painter / Polisher"],
  ["electrician", "Electrician"],
  ["plumber", "Plumber"],
  ["welder", "Welder / Fabricator"],
  ["tile_worker", "Tile / Marble Installer"],
  ["bar_bender", "Bar Bender / Steel Fixer"],
  ["shuttering_worker", "Shuttering Worker"],
  ["machine_operator", "Construction Machine Operator"],
  ["equipment_operator", "Heavy Equipment Operator"],
  ["driver", "Driver"],
  ["gardener", "Gardener / Landscaping Worker"],
  ["helper", "Skilled Helper"],
  ["repair_professional", "Repair Professional"],
  ["skilled_professional", "Other Skilled Professional"],
] as const;

const AVAILABILITY_OPTIONS = [
  ["available", "Available for work"],
  ["partially_available", "Partially available"],
  ["currently_engaged", "Currently engaged"],
  ["not_available", "Not available now"],
] as const;

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }

  return raw;
}

export default function IndividualProfessionalOnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [originalName, setOriginalName] = useState("");
  const [phone, setPhone] = useState("");
  const [primarySkillKey, setPrimarySkillKey] = useState("");
  const [primarySkillLabel, setPrimarySkillLabel] = useState("");
  const [secondarySkills, setSecondarySkills] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [availabilityStatus, setAvailabilityStatus] =
    useState("available");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("25");

  const [dailyWage, setDailyWage] = useState(true);
  const [hourlyWork, setHourlyWork] = useState(false);
  const [perJobWork, setPerJobWork] = useState(true);

  const [workerDeclarationAccepted, setWorkerDeclarationAccepted] =
    useState(false);

  const [originalNameWarningAccepted, setOriginalNameWarningAccepted] =
    useState(false);

  const [selfieAssets, setSelfieAssets] =
    useState<UploadedMediaAsset[]>([]);

  const [workPhotoOneAssets, setWorkPhotoOneAssets] =
    useState<UploadedMediaAsset[]>([]);

  const [workPhotoTwoAssets, setWorkPhotoTwoAssets] =
    useState<UploadedMediaAsset[]>([]);

  const [identityDocumentType, setIdentityDocumentType] =
    useState("");

  const [identityDocumentMaskedReference, setIdentityDocumentMaskedReference] =
    useState("");

  const [identityDocumentConsentAccepted, setIdentityDocumentConsentAccepted] =
    useState(false);

  const [aiChecking, setAiChecking] = useState(false);
  const [aiVerificationStatus, setAiVerificationStatus] =
    useState("not_started");
  const [aiConfidence, setAiConfidence] =
    useState<number | null>(null);
  const [aiResult, setAiResult] =
    useState<Record<string, any> | null>(null);
  const [lifetimeFreeDecisionStatus, setLifetimeFreeDecisionStatus] =
    useState("not_evaluated");
  const [lifetimeFreeDecisionReason, setLifetimeFreeDecisionReason] =
    useState("");

  const [takesCompleteContracts, setTakesCompleteContracts] =
    useState(false);
  const [suppliesWorkerTeams, setSuppliesWorkerTeams] =
    useState(false);
  const [operatesFirmOrAgency, setOperatesFirmOrAgency] =
    useState(false);
  const [primarilySupervises, setPrimarilySupervises] =
    useState(false);

  const contractorIndicatorDetected =
    takesCompleteContracts ||
    suppliesWorkerTeams ||
    operatesFirmOrAgency ||
    primarilySupervises;

  useEffect(() => {
    let active = true;

    async function loadRegistration() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user?.id) {
          router.replace("/login");
          return;
        }

        const metadata = user.user_metadata || {};

        const registrationPath = String(
          metadata.registration_path || ""
        );

        const identityKey = String(
          metadata.primary_human_identity || ""
        );

        const isFreshIndividualRegistration =
          registrationPath ===
            "individual_professional" &&
          !identityKey;

        const operatingProfile = String(
          metadata.operating_profile ||
            (registrationPath ===
            "individual_professional"
              ? "individual_professional"
              : "")
        );
        const identityLabel = String(
          metadata.human_identity_local_label ||
            metadata.human_identity_label ||
            ""
        );

        const { data: identityRecord } = await supabase
          .from("identity_master")
          .select(
            "legacy_role,requires_business_onboarding,label"
          )
          .eq("identity_key", identityKey)
          .maybeSingle();

        const eligibility =
          resolveIndividualProfessionalEligibility({
            operatingProfile,
            identityKey,
            identityLabel:
              identityRecord?.label || identityLabel,
            legacyRole: identityRecord?.legacy_role || null,
            requiresBusinessOnboarding:
              identityRecord?.requires_business_onboarding ||
              false,
          });

        if (
          !eligibility.eligible &&
          !isFreshIndividualRegistration
        ) {
          router.replace(
            identityRecord?.requires_business_onboarding
              ? "/onboarding/business?registration=1"
              : "/auth/register-role"
          );
          return;
        }

        const [{ data: profile }, { data: professionalProfile }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("full_name,phone,role_display_label")
              .eq("id", user.id)
              .maybeSingle<ProfileRecord>(),
            supabase
              .from("individual_professional_profiles")
              .select(
                "primary_skill_key,secondary_skill_keys,economic_mode,work_preferences,years_experience,availability_status,service_radius_km,worker_declaration_accepted,contractor_risk_status,verification_status,original_name_declared,original_name_warning_accepted,identity_document_type,identity_document_masked_reference,verified_selfie_json,work_photo_one_json,work_photo_two_json,selfie_verification_status,work_evidence_verification_status,ai_verification_status,ai_confidence,ai_result_json,ai_reviewed_at,lifetime_free_decision_status,lifetime_free_decision_reason"
              )
              .eq("user_id", user.id)
              .maybeSingle<IndividualProfessionalRecord>(),
          ]);

        if (!active) return;

        setOriginalName(profile?.full_name || "");
        setPhone(profile?.phone || "");
        setPrimarySkillKey(
          professionalProfile?.primary_skill_key || identityKey
        );
        setPrimarySkillLabel(
          profile?.role_display_label ||
            identityRecord?.label ||
            identityLabel
        );

        setSecondarySkills(
          (professionalProfile?.secondary_skill_keys || []).join(", ")
        );

        setYearsExperience(
          professionalProfile?.years_experience == null
            ? ""
            : String(professionalProfile.years_experience)
        );

        setAvailabilityStatus(
          professionalProfile?.availability_status || "available"
        );

        setServiceRadiusKm(
          professionalProfile?.service_radius_km == null
            ? "25"
            : String(professionalProfile.service_radius_km)
        );

        setWorkerDeclarationAccepted(
          Boolean(
            professionalProfile?.worker_declaration_accepted
          )
        );

        setOriginalNameWarningAccepted(
          Boolean(
            professionalProfile?.original_name_warning_accepted
          )
        );

        setSelfieAssets(
          professionalProfile?.verified_selfie_json &&
          Object.keys(professionalProfile.verified_selfie_json).length
            ? [professionalProfile.verified_selfie_json as UploadedMediaAsset]
            : []
        );

        setWorkPhotoOneAssets(
          professionalProfile?.work_photo_one_json &&
          Object.keys(professionalProfile.work_photo_one_json).length
            ? [professionalProfile.work_photo_one_json as UploadedMediaAsset]
            : []
        );

        setWorkPhotoTwoAssets(
          professionalProfile?.work_photo_two_json &&
          Object.keys(professionalProfile.work_photo_two_json).length
            ? [professionalProfile.work_photo_two_json as UploadedMediaAsset]
            : []
        );

        setIdentityDocumentType(
          professionalProfile?.identity_document_type || ""
        );

        setIdentityDocumentMaskedReference(
          professionalProfile?.identity_document_masked_reference || ""
        );

        setAiVerificationStatus(
          professionalProfile?.ai_verification_status || "not_started"
        );

        setAiConfidence(
          professionalProfile?.ai_confidence == null
            ? null
            : Number(professionalProfile.ai_confidence)
        );

        setAiResult(
          professionalProfile?.ai_result_json &&
          Object.keys(professionalProfile.ai_result_json).length
            ? professionalProfile.ai_result_json
            : null
        );

        setLifetimeFreeDecisionStatus(
          professionalProfile?.lifetime_free_decision_status ||
            "not_evaluated"
        );

        setLifetimeFreeDecisionReason(
          professionalProfile?.lifetime_free_decision_reason || ""
        );

        const preferences =
          professionalProfile?.work_preferences || {};

        setDailyWage(preferences.daily_wage !== false);
        setHourlyWork(Boolean(preferences.hourly_work));
        setPerJobWork(preferences.per_job_work !== false);
      } catch (error: any) {
        if (active) {
          setMessage(
            error?.message ||
              "Could not load your professional registration."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRegistration();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const selfieComplete =
    selfieAssets.length === 1 &&
    selfieAssets[0]?.captureSource === "live_camera" &&
    selfieAssets[0]?.preparedBeforeUpload === true;

  const workPhotoOneComplete =
    workPhotoOneAssets.length === 1 &&
    workPhotoOneAssets[0]?.captureSource === "live_camera" &&
    workPhotoOneAssets[0]?.preparedBeforeUpload === true;

  const workPhotoTwoComplete =
    workPhotoTwoAssets.length === 1 &&
    workPhotoTwoAssets[0]?.captureSource === "live_camera" &&
    workPhotoTwoAssets[0]?.preparedBeforeUpload === true;

  const aiResultAllowsSubmission =
    aiVerificationStatus !== "likely_unrelated";

  const mandatoryVerificationComplete =
    originalNameWarningAccepted &&
    selfieComplete &&
    workPhotoOneComplete &&
    workPhotoTwoComplete &&
    aiResultAllowsSubmission;

  async function checkWorkEvidence() {
    if (!workPhotoOneComplete || !workPhotoTwoComplete) {
      setMessage(
        "Take both mandatory live-camera work photographs before checking them."
      );
      return;
    }

    setAiChecking(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/ai/individual-professional-verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Work-evidence verification could not be completed."
        );
      }

      const verification = payload?.verification || {};

      setAiVerificationStatus(
        String(verification.status || "human_review")
      );

      setAiConfidence(
        typeof verification.confidence === "number"
          ? verification.confidence
          : null
      );

      setAiResult(verification);

      setLifetimeFreeDecisionStatus(
        String(
          verification?.constitutionalProjection
            ?.recommendedDecision || "pending_human_review"
        )
      );

      setLifetimeFreeDecisionReason(
        String(
          verification?.constitutionalProjection?.reason ||
            verification.summary ||
            "Human review is required."
        )
      );

      if (
        verification.status === "strong_match" ||
        verification.status === "likely_match"
      ) {
        setMessage(
          "Your work evidence is consistent with the declared skill and is ready for authorised human review."
        );
      } else if (
        verification.status === "likely_unrelated"
      ) {
        setMessage(
          "The photographs do not clearly match your declared skill. Please retake them using the guidance shown below."
        );
      } else if (
        verification.status === "contractor_risk"
      ) {
        setMessage(
          "The evidence needs human classification because it may represent contractor or business activity."
        );
      } else {
        setMessage(
          "The evidence needs clearer photographs or human review."
        );
      }
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Work-evidence verification could not be completed."
      );
    } finally {
      setAiChecking(false);
    }
  }

  async function saveFoundation(event: React.FormEvent) {
    event.preventDefault();

    if (!primarySkillKey) {
      setMessage(
        "Choose the primary skill that you personally perform."
      );
      return;
    }

    if (!originalName.trim()) {
      setMessage(
        "Enter your complete original name exactly as shown on your accepted identity document."
      );
      return;
    }

    if (!originalNameWarningAccepted) {
      setMessage(
        "Confirm that you are using your complete original name."
      );
      return;
    }

    if (!selfieComplete) {
      setMessage(
        "A verified live-camera selfie is mandatory."
      );
      return;
    }

    if (!workPhotoOneComplete || !workPhotoTwoComplete) {
      setMessage(
        "Two prepared live-camera work photographs are mandatory."
      );
      return;
    }

    if (
      identityDocumentType &&
      !identityDocumentConsentAccepted
    ) {
      setMessage(
        "Accept the optional identity-reference consent before saving it."
      );
      return;
    }

    if (!workerDeclarationAccepted) {
      setMessage(
        "You must confirm that you personally perform the declared work."
      );
      return;
    }

    if (contractorIndicatorDetected) {
      setMessage(
        "This pathway is only for self-working individual professionals. Contractors, agencies and labour suppliers must use Business Registration."
      );
      return;
    }

    const parsedExperience =
      yearsExperience.trim() === ""
        ? null
        : Number(yearsExperience);

    if (
      parsedExperience !== null &&
      (!Number.isInteger(parsedExperience) ||
        parsedExperience < 0 ||
        parsedExperience > 80)
    ) {
      setMessage(
        "Enter your years of experience as a number between 0 and 80."
      );
      return;
    }

    const parsedRadius = Number(serviceRadiusKm);

    if (
      !Number.isFinite(parsedRadius) ||
      parsedRadius < 0 ||
      parsedRadius > 5000
    ) {
      setMessage(
        "Enter a valid service radius between 0 and 5000 km."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user?.id) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const selectedSkill =
        INDIVIDUAL_SKILL_OPTIONS.find(
          ([key]) => key === primarySkillKey
        );

      if (!selectedSkill) {
        throw new Error(
          "Choose a supported individual skilled profession."
        );
      }

      const selectedSkillLabel =
        selectedSkill[1];

      const {
        error: declarationError,
      } = await supabase.rpc(
        "declare_operating_profile",
        {
          p_operating_profile:
            "individual_professional",
          p_identity_keys: [
            primarySkillKey,
          ],
          p_primary_identity_key:
            primarySkillKey,
        }
      );

      if (declarationError) {
        throw declarationError;
      }

      const { error: grantsError } =
        await supabase.rpc(
          "sync_member_module_grants"
        );

      if (grantsError) {
        throw grantsError;
      }

      const secondarySkillKeys = secondarySkills
        .split(",")
        .map((item) =>
          item
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
        )
        .filter(Boolean)
        .filter((item) => item !== primarySkillKey);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: originalName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { error: professionalError } = await supabase
        .from("individual_professional_profiles")
        .upsert(
          {
            user_id: user.id,
            primary_skill_key: primarySkillKey,
            secondary_skill_keys: secondarySkillKeys,
            economic_mode: "self_working_individual",
            work_preferences: {
              daily_wage: dailyWage,
              hourly_work: hourlyWork,
              per_job_work: perJobWork,
              takes_complete_contracts: false,
              supplies_worker_teams: false,
              operates_firm_or_agency: false,
              primarily_supervises: false,
            },
            years_experience: parsedExperience,
            availability_status: availabilityStatus,
            service_radius_km: parsedRadius,
            worker_declaration_accepted: true,
            worker_declaration_at: new Date().toISOString(),
            contractor_risk_status: "not_detected",
            verification_status: "incomplete",
            lifetime_free_eligible: false,
            original_name_declared: originalName.trim(),
            original_name_warning_accepted: true,
            original_name_warning_accepted_at:
              new Date().toISOString(),
            verified_selfie_json: selfieAssets[0],
            work_photo_one_json: workPhotoOneAssets[0],
            work_photo_two_json: workPhotoTwoAssets[0],
            selfie_verification_status: "captured",
            work_evidence_verification_status:
              "pending_review",
            identity_document_type:
              identityDocumentType || null,
            identity_document_masked_reference:
              identityDocumentType
                ? identityDocumentMaskedReference.trim() || null
                : null,
            identity_document_verification_status:
              identityDocumentType
                ? "pending_review"
                : "not_submitted",
            identity_name_match_status:
              identityDocumentType
                ? "human_review"
                : "not_checked",
            identity_document_consent_at:
              identityDocumentType
                ? new Date().toISOString()
                : null,
            identity_document_consent_version:
              identityDocumentType
                ? "individual-professional-v1"
                : null,
          },
          { onConflict: "user_id" }
        );

      if (professionalError) throw professionalError;

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            ...(user.user_metadata || {}),
            registration_path:
              "individual_professional",
            operating_profile:
              "individual_professional",
            primary_human_identity:
              primarySkillKey,
            human_identities: [
              primarySkillKey,
            ],
            human_identity_label:
              selectedSkillLabel,
            human_identity_local_label:
              selectedSkillLabel,
            role_display_label:
              selectedSkillLabel,
            economic_mode:
              "self_working_individual",
            individual_professional_registration_status:
              "foundation_complete",
            lifetime_free_plan_candidate:
              INDIVIDUAL_PROFESSIONAL_CONSTITUTIONAL_RULES.planKey,
          },
        });

      if (metadataError) throw metadataError;

      setMessage(
        "Your professional details are saved. Live selfie and work-evidence verification are required next."
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Could not save your professional registration."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>Loading your registration…</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <div style={eyebrowStyle}>
          Lifetime-Free Individual Skilled Professional
        </div>

        <h1 style={{ margin: "7px 0 8px", fontSize: 30 }}>
          Register your personal skill
        </h1>

        <p style={introStyle}>
          This pathway is only for people who personally perform their
          work. Contractors, labour suppliers, agencies and business
          organisations must use Business Registration.
        </p>

        <div style={noticeStyle}>
          <strong>Use your original name.</strong>
          <div style={{ marginTop: 5 }}>
            Enter your complete original name exactly as shown on your
            accepted identity document. If deliberate use of a false or
            different identity is confirmed, the account may be suspended
            after review. Genuine spelling, transliteration or document
            reading differences will be eligible for correction and human
            review.
          </div>
        </div>

        <form onSubmit={saveFoundation} style={{ display: "grid", gap: 18 }}>
          <section style={sectionStyle}>
            <h2 style={headingStyle}>1. Your original identity</h2>

            <label style={labelStyle}>
              Complete original name *
              <input
                value={originalName}
                onChange={(event) =>
                  setOriginalName(event.target.value)
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                style={inputStyle}
                inputMode="tel"
              />
            </label>

            <div style={pendingStyle}>
              Verified live-camera selfie is mandatory and will become
              your only profile photograph. Gallery upload will not be
              allowed.
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>2. Your skill</h2>

            <label style={labelStyle}>
              Primary skill *
              <select
                value={primarySkillKey}
                onChange={(event) => {
                  const selectedKey =
                    event.target.value;

                  const selectedSkill =
                    INDIVIDUAL_SKILL_OPTIONS.find(
                      ([key]) =>
                        key === selectedKey
                    );

                  setPrimarySkillKey(
                    selectedKey
                  );

                  setPrimarySkillLabel(
                    selectedSkill?.[1] || ""
                  );
                }}
                style={inputStyle}
              >
                <option value="">
                  Choose your primary skill
                </option>

                {INDIVIDUAL_SKILL_OPTIONS.map(
                  ([key, label]) => (
                    <option
                      key={key}
                      value={key}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label style={labelStyle}>
              Other skills, separated by commas
              <input
                value={secondarySkills}
                onChange={(event) =>
                  setSecondarySkills(event.target.value)
                }
                placeholder="Example: tile work, plastering"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Years of experience
              <input
                value={yearsExperience}
                onChange={(event) =>
                  setYearsExperience(event.target.value)
                }
                inputMode="numeric"
                style={inputStyle}
              />
            </label>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>3. How you work</h2>

            <CheckRow
              checked={dailyWage}
              onChange={setDailyWage}
              label="Daily-wage work"
            />
            <CheckRow
              checked={hourlyWork}
              onChange={setHourlyWork}
              label="Hourly work"
            />
            <CheckRow
              checked={perJobWork}
              onChange={setPerJobWork}
              label="Small per-job work"
            />

            <label style={labelStyle}>
              Current availability
              <select
                value={availabilityStatus}
                onChange={(event) =>
                  setAvailabilityStatus(event.target.value)
                }
                style={inputStyle}
              >
                {AVAILABILITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Service radius in kilometres
              <input
                value={serviceRadiusKm}
                onChange={(event) =>
                  setServiceRadiusKm(event.target.value)
                }
                inputMode="decimal"
                style={inputStyle}
              />
            </label>
          </section>

          <section style={exclusionStyle}>
            <h2 style={headingStyle}>Contractor eligibility check</h2>

            <p style={introStyle}>
              Answer honestly. A “Yes” means Business Registration is
              the correct pathway.
            </p>

            <CheckRow
              checked={takesCompleteContracts}
              onChange={setTakesCompleteContracts}
              label="I take complete construction or service contracts."
            />
            <CheckRow
              checked={suppliesWorkerTeams}
              onChange={setSuppliesWorkerTeams}
              label="I regularly supply or manage teams of workers."
            />
            <CheckRow
              checked={operatesFirmOrAgency}
              onChange={setOperatesFirmOrAgency}
              label="I operate under a firm, agency or business organisation."
            />
            <CheckRow
              checked={primarilySupervises}
              onChange={setPrimarilySupervises}
              label="I mainly supervise work instead of personally performing it."
            />

            {contractorIndicatorDetected ? (
              <div style={blockedStyle}>
                This registration cannot continue as an individual
                skilled professional.
                <button
                  type="button"
                  onClick={() =>
                    router.push("/onboarding/business?registration=1")
                  }
                  style={businessButtonStyle}
                >
                  Continue with Business Registration
                </button>
              </div>
            ) : null}
          </section>

          <IndividualProfessionalVerificationSection
            originalName={originalName}
            originalNameWarningAccepted={originalNameWarningAccepted}
            onOriginalNameWarningAcceptedChange={setOriginalNameWarningAccepted}
            selfieAssets={selfieAssets}
            onSelfieAssetsChange={setSelfieAssets}
            workPhotoOneAssets={workPhotoOneAssets}
            onWorkPhotoOneAssetsChange={setWorkPhotoOneAssets}
            workPhotoTwoAssets={workPhotoTwoAssets}
            onWorkPhotoTwoAssetsChange={setWorkPhotoTwoAssets}
            identityDocumentType={identityDocumentType}
            onIdentityDocumentTypeChange={setIdentityDocumentType}
            identityDocumentMaskedReference={identityDocumentMaskedReference}
            onIdentityDocumentMaskedReferenceChange={setIdentityDocumentMaskedReference}
            identityDocumentConsentAccepted={identityDocumentConsentAccepted}
            onIdentityDocumentConsentAcceptedChange={setIdentityDocumentConsentAccepted}
            primarySkillLabel={primarySkillLabel}
          />

          <IndividualProfessionalAiReviewPanel
            checking={aiChecking}
            status={aiVerificationStatus}
            confidence={aiConfidence}
            result={aiResult}
            decisionStatus={lifetimeFreeDecisionStatus}
            decisionReason={lifetimeFreeDecisionReason}
            canCheck={
              workPhotoOneComplete &&
              workPhotoTwoComplete
            }
            onCheck={checkWorkEvidence}
          />

          <section style={declarationStyle}>
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontWeight: 800,
              }}
            >
              <input
                type="checkbox"
                checked={workerDeclarationAccepted}
                onChange={(event) =>
                  setWorkerDeclarationAccepted(event.target.checked)
                }
                style={{ marginTop: 3 }}
              />

              <span>
                I personally perform this work and earn through my own
                skill or labour. I am not registering as a contractor,
                labour supplier, agency, firm or business organisation.
              </span>
            </label>
          </section>

          <div style={summaryStyle}>
            <strong>Lifetime-Free pathway</strong>
            <div style={{ marginTop: 5 }}>
              No Trade Licence, GSTIN or UDYAM is required. Verified
              live selfie, original identity, exact location and live
              work evidence remain mandatory.
            </div>
          </div>

          {message ? (
            <div role="status" style={messageStyle}>
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              saving ||
              contractorIndicatorDetected ||
              !workerDeclarationAccepted ||
              !mandatoryVerificationComplete
            }
            style={{
              ...submitStyle,
              opacity:
                saving ||
                contractorIndicatorDetected ||
                !workerDeclarationAccepted ||
                !mandatoryVerificationComplete
                  ? 0.55
                  : 1,
            }}
          >
            {saving
              ? "Saving…"
              : "Save and continue to verification"}
          </button>
        </form>
      </div>
    </main>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        border: "1px solid #e2e8f0",
        borderRadius: 11,
        background: "white",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: 3 }}
      />
      <span>{label}</span>
    </label>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "28px 16px",
  background: "#f8fafc",
};

const shellStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: 22,
  border: "1px solid #dbe4ef",
  borderRadius: 20,
  background: "white",
  boxShadow: "0 16px 46px rgba(15,23,42,.07)",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".07em",
};

const introStyle: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
};

const noticeStyle: React.CSSProperties = {
  margin: "18px 0",
  padding: 14,
  border: "1px solid #fde68a",
  borderRadius: 14,
  background: "#fffbeb",
  color: "#854d0e",
  lineHeight: 1.55,
};

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "#f8fafc",
};

const exclusionStyle: React.CSSProperties = {
  ...sectionStyle,
  border: "1px solid #fdba74",
  background: "#fff7ed",
};

const declarationStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 14,
  border: "1px solid #93c5fd",
  background: "#eff6ff",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
};

const pendingStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#eef2ff",
  color: "#3730a3",
  lineHeight: 1.5,
};

const blockedStyle: React.CSSProperties = {
  padding: 13,
  borderRadius: 11,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 800,
};

const businessButtonStyle: React.CSSProperties = {
  display: "block",
  marginTop: 10,
  padding: "9px 12px",
  border: 0,
  borderRadius: 9,
  background: "#991b1b",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const summaryStyle: React.CSSProperties = {
  padding: 15,
  borderRadius: 14,
  border: "1px solid #86efac",
  background: "#f0fdf4",
  color: "#166534",
};

const messageStyle: React.CSSProperties = {
  padding: 13,
  borderRadius: 11,
  background: "#f1f5f9",
  color: "#334155",
  fontWeight: 700,
};

const submitStyle: React.CSSProperties = {
  padding: "13px 16px",
  border: 0,
  borderRadius: 11,
  background: "#1d4ed8",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
