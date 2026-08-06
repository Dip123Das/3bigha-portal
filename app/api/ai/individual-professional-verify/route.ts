import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  resolveIndividualProfessionalVerification,
  type IndividualProfessionalAiStatus,
} from "@/lib/3bos/identity/individual-professional-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaAsset = {
  url?: string;
  path?: string;
  name?: string;
  mimeType?: string;
  kind?: string;
  captureSource?: string;
  captureTimestamp?: string;
  preparedBeforeUpload?: boolean;
  evidenceCategory?: string;
  evidencePurpose?: string;
};

type ProfessionalProfile = {
  user_id: string;
  primary_skill_key: string;
  secondary_skill_keys: string[] | null;
  economic_mode: string;
  worker_declaration_accepted: boolean;
  original_name_warning_accepted: boolean;
  contractor_risk_status: string;
  selfie_verification_status: string;
  work_evidence_verification_status: string;
  identity_name_match_status: string;
  verified_selfie_json: MediaAsset | null;
  work_photo_one_json: MediaAsset | null;
  work_photo_two_json: MediaAsset | null;
};

type PhotoAssessment = {
  photo: "work_photo_one" | "work_photo_two";
  readable: boolean;
  quality: "good" | "acceptable" | "poor";
  skillRelevance:
    | "strong"
    | "likely"
    | "unclear"
    | "unrelated";
  personAppearsToPerformWork: boolean | null;
  visibleSignals: string[];
  concerns: string[];
  correctiveGuidance: string;
};

type AiAssessment = {
  status: IndividualProfessionalAiStatus;
  confidence: number;
  declaredSkill: string;
  skillMatchSummary: string;
  contractorRisk:
    | "not_detected"
    | "possible"
    | "strong";
  contractorIndicators: string[];
  photoAssessments: PhotoAssessment[];
  guidance: string[];
  summary: string;
};

function safeString(value: unknown) {
  return String(value || "").trim();
}

function clampConfidence(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(0, Math.min(1, parsed));
}

function isTrustedLiveCameraAsset(
  asset: MediaAsset | null | undefined
) {
  return Boolean(
    asset &&
      safeString(asset.url) &&
      asset.captureSource === "live_camera" &&
      safeString(asset.captureTimestamp) &&
      asset.preparedBeforeUpload === true
  );
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string") {
    return data.output_text;
  }

  const output = Array.isArray(data?.output)
    ? data.output
    : [];

  const text: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content)
      ? item.content
      : [];

    for (const chunk of content) {
      if (typeof chunk?.text === "string") {
        text.push(chunk.text);
      }
    }
  }

  return text.join("\n").trim();
}

function parseJsonLoose(text: string) {
  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeAiStatus(
  value: unknown
): IndividualProfessionalAiStatus {
  const allowed = new Set<IndividualProfessionalAiStatus>([
    "strong_match",
    "likely_match",
    "unclear",
    "likely_unrelated",
    "contractor_risk",
    "human_review",
  ]);

  const normalized =
    safeString(value) as IndividualProfessionalAiStatus;

  return allowed.has(normalized)
    ? normalized
    : "human_review";
}

function normalizeContractorRisk(value: unknown) {
  const normalized = safeString(value);

  if (normalized === "strong") return "strong";
  if (normalized === "possible") return "possible";

  return "not_detected";
}

function normalizePhotoAssessment(
  value: any,
  photo: PhotoAssessment["photo"]
): PhotoAssessment {
  const quality = ["good", "acceptable", "poor"].includes(
    safeString(value?.quality)
  )
    ? value.quality
    : "poor";

  const skillRelevance = [
    "strong",
    "likely",
    "unclear",
    "unrelated",
  ].includes(safeString(value?.skillRelevance))
    ? value.skillRelevance
    : "unclear";

  return {
    photo,
    readable: Boolean(value?.readable),
    quality,
    skillRelevance,
    personAppearsToPerformWork:
      typeof value?.personAppearsToPerformWork === "boolean"
        ? value.personAppearsToPerformWork
        : null,
    visibleSignals: Array.isArray(value?.visibleSignals)
      ? value.visibleSignals
          .map(safeString)
          .filter(Boolean)
          .slice(0, 12)
      : [],
    concerns: Array.isArray(value?.concerns)
      ? value.concerns
          .map(safeString)
          .filter(Boolean)
          .slice(0, 10)
      : [],
    correctiveGuidance: safeString(
      value?.correctiveGuidance
    ),
  };
}

function normalizeAssessment(
  raw: any,
  declaredSkill: string
): AiAssessment {
  const photoAssessments = Array.isArray(
    raw?.photoAssessments
  )
    ? raw.photoAssessments
    : [];

  return {
    status: normalizeAiStatus(raw?.status),
    confidence: clampConfidence(raw?.confidence),
    declaredSkill,
    skillMatchSummary: safeString(
      raw?.skillMatchSummary
    ),
    contractorRisk: normalizeContractorRisk(
      raw?.contractorRisk
    ),
    contractorIndicators: Array.isArray(
      raw?.contractorIndicators
    )
      ? raw.contractorIndicators
          .map(safeString)
          .filter(Boolean)
          .slice(0, 12)
      : [],
    photoAssessments: [
      normalizePhotoAssessment(
        photoAssessments.find(
          (item: any) =>
            item?.photo === "work_photo_one"
        ),
        "work_photo_one"
      ),
      normalizePhotoAssessment(
        photoAssessments.find(
          (item: any) =>
            item?.photo === "work_photo_two"
        ),
        "work_photo_two"
      ),
    ],
    guidance: Array.isArray(raw?.guidance)
      ? raw.guidance
          .map(safeString)
          .filter(Boolean)
          .slice(0, 10)
      : [],
    summary: safeString(raw?.summary),
  };
}

function buildPrompt(profile: ProfessionalProfile) {
  const primarySkill = safeString(
    profile.primary_skill_key
  );

  const secondarySkills = Array.isArray(
    profile.secondary_skill_keys
  )
    ? profile.secondary_skill_keys
        .map(safeString)
        .filter(Boolean)
    : [];

  return `
You are assisting a human reviewer for 3Bigha's
Individual Skilled Professional registration.

Declared primary skill:
${primarySkill}

Declared secondary skills:
${secondarySkills.join(", ") || "None"}

Review exactly two live-camera work photographs.

PHOTO 1 is intended to show the applicant personally
performing or clearly demonstrating the declared skill.

PHOTO 2 is intended to show real tools, materials,
workplace, completed work or another genuine work signal
associated with the declared skill.

Evaluate only visible work-related evidence.

Do not identify the person.
Do not infer age, caste, religion, ethnicity, disability,
health, income, nationality or any other sensitive trait.
Do not decide whether the person should be suspended.
Do not approve lifetime-free eligibility.

Possible contractor or business indicators may include:
- prominent firm or agency branding;
- organised labour-team supply;
- an office or enterprise primarily representing a firm;
- applicant appearing only to supervise a workforce;
- evidence of a contractor organisation rather than
  personal performance of the declared skill.

The presence of multiple people, tools, vehicles,
uniforms, machinery or a workplace alone is not proof
of contractor activity. Report contractor risk only when
the visible context provides meaningful supporting signs.

Return JSON only with this shape:

{
  "status":
    "strong_match" |
    "likely_match" |
    "unclear" |
    "likely_unrelated" |
    "contractor_risk" |
    "human_review",
  "confidence": 0.0,
  "skillMatchSummary": "",
  "contractorRisk":
    "not_detected" |
    "possible" |
    "strong",
  "contractorIndicators": [],
  "photoAssessments": [
    {
      "photo": "work_photo_one",
      "readable": true,
      "quality": "good" | "acceptable" | "poor",
      "skillRelevance":
        "strong" | "likely" | "unclear" | "unrelated",
      "personAppearsToPerformWork": true | false | null,
      "visibleSignals": [],
      "concerns": [],
      "correctiveGuidance": ""
    },
    {
      "photo": "work_photo_two",
      "readable": true,
      "quality": "good" | "acceptable" | "poor",
      "skillRelevance":
        "strong" | "likely" | "unclear" | "unrelated",
      "personAppearsToPerformWork": true | false | null,
      "visibleSignals": [],
      "concerns": [],
      "correctiveGuidance": ""
    }
  ],
  "guidance": [],
  "summary": ""
}

Use "strong_match" only when both photographs provide
clear, useful and mutually consistent evidence.

Use "likely_match" when the evidence reasonably matches
but is not conclusive.

Use "unclear" when quality, framing or visible context is
insufficient.

Use "likely_unrelated" only when the evidence is clearly
inconsistent with the declared skill.

Use "contractor_risk" only when meaningful visible signs
suggest firm, agency, contractor or labour-supply activity.

Use "human_review" when the evidence cannot safely support
another decision.
`.trim();
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session =
      getSupabaseServerClient(cookieStore);

    const {
      data: { user },
    } = await session.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Login required." },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } =
      await admin
        .from("individual_professional_profiles")
        .select(
          [
            "user_id",
            "primary_skill_key",
            "secondary_skill_keys",
            "economic_mode",
            "worker_declaration_accepted",
            "original_name_warning_accepted",
            "contractor_risk_status",
            "selfie_verification_status",
            "work_evidence_verification_status",
            "identity_name_match_status",
            "verified_selfie_json",
            "work_photo_one_json",
            "work_photo_two_json",
          ].join(",")
        )
        .eq("user_id", user.id)
        .maybeSingle<ProfessionalProfile>();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Complete your individual professional registration first.",
        },
        { status: 404 }
      );
    }

    if (
      profile.economic_mode !==
      "self_working_individual"
    ) {
      return NextResponse.json(
        {
          error:
            "This verification route is only for self-working individual professionals.",
        },
        { status: 409 }
      );
    }

    if (!profile.worker_declaration_accepted) {
      return NextResponse.json(
        {
          error:
            "Accept the self-working professional declaration first.",
        },
        { status: 409 }
      );
    }

    const workPhotoOne =
      profile.work_photo_one_json;

    const workPhotoTwo =
      profile.work_photo_two_json;

    if (
      !isTrustedLiveCameraAsset(workPhotoOne) ||
      !isTrustedLiveCameraAsset(workPhotoTwo)
    ) {
      return NextResponse.json(
        {
          error:
            "Two prepared live-camera work photographs are required.",
        },
        { status: 409 }
      );
    }

    const openAiKey =
      process.env.OPENAI_API_KEY || "";

    if (!openAiKey) {
      return NextResponse.json(
        {
          error:
            "AI verification is temporarily unavailable. Your evidence remains saved for human review.",
        },
        { status: 503 }
      );
    }

    await admin
      .from("individual_professional_profiles")
      .update({
        ai_verification_status: "analysing",
        lifetime_free_decision_status:
          "pending_ai_review",
        lifetime_free_decision_reason:
          "Work evidence is being analysed.",
      })
      .eq("user_id", user.id);

    const model =
      process.env.OPENAI_VISION_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4.1-mini";

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: buildPrompt(profile),
                },
                {
                  type: "input_image",
                  image_url: safeString(
                    workPhotoOne?.url
                  ),
                  detail: "high",
                },
                {
                  type: "input_image",
                  image_url: safeString(
                    workPhotoTwo?.url
                  ),
                  detail: "high",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();

      console.error(
        "INDIVIDUAL_PROFESSIONAL_AI_HTTP_ERROR",
        {
          userId: user.id,
          status: response.status,
          responseText: responseText.slice(
            0,
            1200
          ),
        }
      );

      await admin
        .from("individual_professional_profiles")
        .update({
          ai_verification_status: "failed",
          ai_reviewed_at:
            new Date().toISOString(),
          lifetime_free_decision_status:
            "pending_human_review",
          lifetime_free_decision_reason:
            "Automated review was unavailable. Human review is required.",
        })
        .eq("user_id", user.id);

      return NextResponse.json(
        {
          error:
            "Automated review could not be completed. Your evidence remains saved for human review.",
        },
        { status: 502 }
      );
    }

    const responseData = await response.json();
    const outputText =
      extractOutputText(responseData);
    const parsed = parseJsonLoose(outputText);

    if (!parsed) {
      throw new Error(
        "The AI response could not be interpreted."
      );
    }

    const assessment = normalizeAssessment(
      parsed,
      profile.primary_skill_key
    );

    const contractorRiskStatus =
      assessment.status === "contractor_risk" ||
      assessment.contractorRisk !==
        "not_detected"
        ? "review_required"
        : profile.contractor_risk_status ===
          "confirmed_contractor"
        ? "confirmed_contractor"
        : "not_detected";

    const projection =
      resolveIndividualProfessionalVerification({
        economicMode: profile.economic_mode,
        workerDeclarationAccepted:
          profile.worker_declaration_accepted,
        originalNameWarningAccepted:
          profile.original_name_warning_accepted,
        selfieVerificationStatus:
          profile.selfie_verification_status,
        workEvidenceVerificationStatus:
          assessment.status === "strong_match" ||
          assessment.status === "likely_match"
            ? "pending_review"
            : "needs_correction",
        identityNameMatchStatus:
          profile.identity_name_match_status,
        contractorRiskStatus,
        aiVerificationStatus:
          assessment.status,
        aiConfidence: assessment.confidence,
      });

    const reviewedAt =
      new Date().toISOString();

    const storedResult = {
      ...assessment,
      constitutionalProjection: projection,
      reviewedAt,
      model,
      advisoryOnly: true,
    };

    const { error: updateError } =
      await admin
        .from("individual_professional_profiles")
        .update({
          ai_verification_status:
            assessment.status,
          ai_confidence:
            assessment.confidence,
          ai_result_json: storedResult,
          ai_reviewed_at: reviewedAt,
          contractor_risk_status:
            contractorRiskStatus,
          work_evidence_verification_status:
            assessment.status ===
              "strong_match" ||
            assessment.status ===
              "likely_match"
              ? "pending_review"
              : "needs_correction",
          lifetime_free_decision_status:
            projection.recommendedDecision,
          lifetime_free_decision_reason:
            projection.reason,
          lifetime_free_eligible: false,
        })
        .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    const { error: auditError } =
      await admin
        .from(
          "registration_verification_cases"
        )
        .insert({
          user_id: user.id,
          status: assessment.status,
          confidence: assessment.confidence,
          result_json: {
            verificationType:
              "individual_professional_work",
            ...storedResult,
          },
        });

    if (auditError) {
      console.error(
        "INDIVIDUAL_PROFESSIONAL_AI_AUDIT_FAILED",
        {
          userId: user.id,
          code: auditError.code,
          message: auditError.message,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      verification: storedResult,
      auditRecorded: !auditError,
      lifetimeFreeActivated: false,
    });
  } catch (error: any) {
    console.error(
      "INDIVIDUAL_PROFESSIONAL_AI_VERIFY_FAILED",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Individual professional verification failed.",
      },
      { status: 500 }
    );
  }
}
