import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import IndividualProfessionalReviewActions from "./IndividualProfessionalReviewActions";

export const dynamic = "force-dynamic";

type Params = Record<
  string,
  string | string[] | undefined
>;

type MediaAsset = {
  url?: string;
  name?: string;
  captureSource?: string;
  captureTimestamp?: string;
  preparedBeforeUpload?: boolean;
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value)
    ? value[0] || ""
    : value || "";
}

function displayDate(value: unknown) {
  const date = new Date(String(value || ""));

  if (!Number.isFinite(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function safeObject(value: unknown) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function mediaAsset(value: unknown): MediaAsset {
  return safeObject(value) as MediaAsset;
}

function statusStyle(value: string) {
  if (
    [
      "verified",
      "approved",
      "strong_match",
      "likely_match",
      "cleared",
      "not_detected",
    ].includes(value)
  ) {
    return {
      border: "#86efac",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (
    [
      "rejected",
      "not_eligible",
      "confirmed_contractor",
      "likely_unrelated",
      "reclassified_as_business",
    ].includes(value)
  ) {
    return {
      border: "#fca5a5",
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  return {
    border: "#fdba74",
    background: "#fff7ed",
    color: "#9a3412",
  };
}

function StatusBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const style = statusStyle(value);

  return (
    <div
      style={{
        padding: "8px 10px",
        border: `1px solid ${style.border}`,
        borderRadius: 10,
        background: style.background,
        color: style.color,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          fontWeight: 900,
        }}
      >
        {(value || "not available").replaceAll("_", " ")}
      </div>
    </div>
  );
}

function EvidenceImage({
  title,
  description,
  asset,
}: {
  title: string;
  description: string;
  asset: MediaAsset;
}) {
  const url = String(asset.url || "");

  return (
    <article style={evidenceCardStyle}>
      <strong>{title}</strong>

      <p style={smallTextStyle}>{description}</p>

      {url ? (
        <>
          <img
            src={url}
            alt={title}
            style={{
              display: "block",
              width: "100%",
              maxHeight: 420,
              objectFit: "contain",
              borderRadius: 11,
              border: "1px solid #dbe4ef",
              background: "#f1f5f9",
            }}
          />

          <div style={metadataStyle}>
            <div>
              Source:{" "}
              <strong>
                {asset.captureSource || "unknown"}
              </strong>
            </div>

            <div>
              Prepared before upload:{" "}
              <strong>
                {asset.preparedBeforeUpload
                  ? "Yes"
                  : "No"}
              </strong>
            </div>

            <div>
              Captured:{" "}
              <strong>
                {displayDate(asset.captureTimestamp)}
              </strong>
            </div>
          </div>
        </>
      ) : (
        <div style={missingStyle}>
          Evidence photograph is not available.
        </div>
      )}
    </article>
  );
}

export default async function IndividualProfessionalReviewsPage({
  searchParams,
}: {
  searchParams?: Params;
}) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) {
      redirect(
        "/login?next=/admin/individual-professional-reviews"
      );
    }

    return (
      <main style={{ padding: 24 }}>
        Access denied
      </main>
    );
  }

  const { admin } = access;

  const statusFilter = one(searchParams?.status);
  const query = one(searchParams?.q)
    .trim()
    .toLowerCase();
  const selectedUserId = one(searchParams?.user);

  let professionalQuery = admin
    .from("individual_professional_profiles")
    .select(
      [
        "user_id",
        "primary_skill_key",
        "secondary_skill_keys",
        "economic_mode",
        "years_experience",
        "availability_status",
        "worker_declaration_accepted",
        "original_name_declared",
        "original_name_warning_accepted",
        "contractor_risk_status",
        "verification_status",
        "identity_document_type",
        "identity_document_masked_reference",
        "identity_document_verification_status",
        "identity_name_extracted",
        "identity_name_match_status",
        "verified_selfie_json",
        "work_photo_one_json",
        "work_photo_two_json",
        "selfie_verification_status",
        "work_evidence_verification_status",
        "ai_verification_status",
        "ai_confidence",
        "ai_result_json",
        "ai_reviewed_at",
        "lifetime_free_eligible",
        "lifetime_free_decision_status",
        "lifetime_free_decision_reason",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .order("updated_at", {
      ascending: false,
    })
    .limit(300);

  if (statusFilter) {
    professionalQuery = professionalQuery.eq(
      "lifetime_free_decision_status",
      statusFilter
    );
  }

  const professionalResult =
    await professionalQuery;

  if (professionalResult.error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Skilled Professional Reviews</h1>
        <pre>{professionalResult.error.message}</pre>
      </main>
    );
  }

  const records = (
    professionalResult.data || []
  ) as unknown as Array<Record<string, any>>;

  const userIds = records
    .map((item: any) => item.user_id)
    .filter(Boolean);

  const [profilesResult, historyResult] =
    userIds.length
      ? await Promise.all([
          admin
            .from("profiles")
            .select(
              "id,email,full_name,phone,role,role_display_label,approval_status"
            )
            .in("id", userIds),
          admin
            .from(
              "individual_professional_review_history"
            )
            .select(
              "id,user_id,reviewer_id,decision,reason,reviewer_notes,previous_verification_status,next_verification_status,previous_decision_status,next_decision_status,previous_contractor_risk_status,next_contractor_risk_status,created_at"
            )
            .in("user_id", userIds)
            .order("created_at", {
              ascending: false,
            }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  const loadError =
    profilesResult.error || historyResult.error;

  if (loadError) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Skilled Professional Reviews</h1>
        <pre>{loadError.message}</pre>
      </main>
    );
  }

  const profiles = new Map(
    (profilesResult.data || []).map(
      (profile: any) => [profile.id, profile]
    )
  );

  const queue = records.filter((item: any) => {
    if (!query) return true;

    const profile: any =
      profiles.get(item.user_id) || {};

    const searchable = [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.role_display_label,
      item.original_name_declared,
      item.primary_skill_key,
      item.verification_status,
      item.lifetime_free_decision_status,
      item.contractor_risk_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  const selected =
    records.find(
      (item: any) =>
        item.user_id === selectedUserId
    ) ||
    queue[0] ||
    null;

  const selectedProfile: any = selected
    ? profiles.get(selected.user_id) || {}
    : {};

  const selectedHistory = selected
    ? (historyResult.data || []).filter(
        (item: any) =>
          item.user_id === selected.user_id
      )
    : [];

  const aiResult = safeObject(
    selected?.ai_result_json
  );

  const photoAssessments = Array.isArray(
    aiResult.photoAssessments
  )
    ? aiResult.photoAssessments
    : [];

  const approvalFailures: string[] = [];

  if (selected) {
    if (
      selected.economic_mode !==
      "self_working_individual"
    ) {
      approvalFailures.push(
        "Applicant is not classified as a self-working individual."
      );
    }

    if (!selected.worker_declaration_accepted) {
      approvalFailures.push(
        "Self-working declaration is incomplete."
      );
    }

    if (
      !selected.original_name_warning_accepted
    ) {
      approvalFailures.push(
        "Original-name declaration is incomplete."
      );
    }

    if (
      selected.selfie_verification_status !==
      "verified"
    ) {
      approvalFailures.push(
        "Live selfie has not been human-verified."
      );
    }

    if (
      selected.work_evidence_verification_status !==
      "verified"
    ) {
      approvalFailures.push(
        "Work evidence has not been human-verified."
      );
    }

    if (
      !["not_detected", "cleared"].includes(
        selected.contractor_risk_status
      )
    ) {
      approvalFailures.push(
        "Contractor risk has not been cleared."
      );
    }

    if (
      selected.identity_name_match_status ===
      "mismatch"
    ) {
      approvalFailures.push(
        "Identity-name mismatch remains unresolved."
      );
    }
  }

  return (
    <main
      style={{
        width: "100%",
        padding: 24,
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <header style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>
            Constitutional Human Review
          </div>

          <h1
            style={{
              margin: "6px 0 7px",
              fontSize: 30,
            }}
          >
            Skilled Professional Reviews
          </h1>

          <p style={introStyle}>
            Review genuine self-working professionals before
            granting lifetime-free access. AI assists, but an
            authorised human makes every final decision.
          </p>
        </div>

        <div style={headerLinksStyle}>
          <Link
            href="/admin"
            style={linkButtonStyle}
          >
            Admin Dashboard
          </Link>

          <Link
            href="/admin/verification-reviews"
            style={linkButtonStyle}
          >
            Business Proof Reviews
          </Link>
        </div>
      </header>

      <form method="get" style={filterStyle}>
        <input
          name="q"
          defaultValue={one(searchParams?.q)}
          placeholder="Search name, email, phone or skill"
          style={{
            ...fieldStyle,
            flex: "1 1 280px",
          }}
        />

        <select
          name="status"
          defaultValue={statusFilter}
          style={fieldStyle}
        >
          <option value="">
            All lifetime-free decisions
          </option>
          <option value="not_evaluated">
            Not evaluated
          </option>
          <option value="pending_ai_review">
            Pending AI review
          </option>
          <option value="pending_human_review">
            Pending human review
          </option>
          <option value="eligible_after_human_approval">
            Ready for human approval
          </option>
          <option value="approved">
            Approved
          </option>
          <option value="not_eligible">
            Not eligible
          </option>
          <option value="reclassified_as_business">
            Reclassified as business
          </option>
        </select>

        <button type="submit" style={fieldStyle}>
          Apply filters
        </button>

        <Link
          href="/admin/individual-professional-reviews"
          style={{
            ...fieldStyle,
            color: "#0f172a",
            textDecoration: "none",
          }}
        >
          Clear
        </Link>
      </form>

      <div style={workspaceStyle}>
        <aside style={queueStyle}>
          <strong>
            {queue.length} application
            {queue.length === 1 ? "" : "s"}
          </strong>

          {queue.map((item: any) => {
            const profile: any =
              profiles.get(item.user_id) || {};
            const active =
              item.user_id === selected?.user_id;
            const tone = statusStyle(
              item.lifetime_free_decision_status
            );

            return (
              <Link
                key={item.user_id}
                href={{
                  pathname:
                    "/admin/individual-professional-reviews",
                  query: {
                    ...(statusFilter
                      ? { status: statusFilter }
                      : {}),
                    ...(query ? { q: query } : {}),
                    user: item.user_id,
                  },
                }}
                style={{
                  padding: 13,
                  border: active
                    ? "2px solid #2563eb"
                    : "1px solid #dbe4ef",
                  borderRadius: 12,
                  background: "white",
                  color: "#0f172a",
                  textDecoration: "none",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  {profile.full_name ||
                    item.original_name_declared ||
                    "Unnamed applicant"}
                </div>

                <div style={queueMetaStyle}>
                  {item.primary_skill_key.replaceAll(
                    "_",
                    " "
                  )}
                </div>

                <div style={queueMetaStyle}>
                  {profile.email || "No email"}
                </div>

                <div
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    padding: "5px 8px",
                    border: `1px solid ${tone.border}`,
                    borderRadius: 999,
                    background: tone.background,
                    color: tone.color,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {item.lifetime_free_decision_status.replaceAll(
                    "_",
                    " "
                  )}
                </div>
              </Link>
            );
          })}
        </aside>

        <section>
          {!selected ? (
            <div style={emptyStyle}>
              No skilled-professional applications match the
              selected filters.
            </div>
          ) : (
            <div style={detailGridStyle}>
              <section style={panelStyle}>
                <div style={identityHeaderStyle}>
                  <div>
                    <div style={eyebrowStyle}>
                      Applicant identity
                    </div>

                    <h2
                      style={{
                        margin: "5px 0",
                        fontSize: 25,
                      }}
                    >
                      {selectedProfile.full_name ||
                        selected.original_name_declared ||
                        "Unnamed applicant"}
                    </h2>

                    <div style={introStyle}>
                      {selectedProfile.email ||
                        "No email recorded"}
                    </div>

                    <div style={introStyle}>
                      {selectedProfile.phone ||
                        "No phone recorded"}
                    </div>
                  </div>

                  <div style={identitySummaryStyle}>
                    <div>
                      Skill:{" "}
                      <strong>
                        {selected.primary_skill_key.replaceAll(
                          "_",
                          " "
                        )}
                      </strong>
                    </div>

                    <div>
                      Experience:{" "}
                      <strong>
                        {selected.years_experience ??
                          "Not stated"}
                      </strong>
                    </div>

                    <div>
                      Availability:{" "}
                      <strong>
                        {selected.availability_status.replaceAll(
                          "_",
                          " "
                        )}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={statusGridStyle}>
                  <StatusBadge
                    label="Verification"
                    value={selected.verification_status}
                  />

                  <StatusBadge
                    label="Selfie"
                    value={
                      selected.selfie_verification_status
                    }
                  />

                  <StatusBadge
                    label="Work evidence"
                    value={
                      selected.work_evidence_verification_status
                    }
                  />

                  <StatusBadge
                    label="Identity name"
                    value={
                      selected.identity_name_match_status
                    }
                  />

                  <StatusBadge
                    label="Contractor risk"
                    value={
                      selected.contractor_risk_status
                    }
                  />

                  <StatusBadge
                    label="AI assessment"
                    value={
                      selected.ai_verification_status
                    }
                  />

                  <StatusBadge
                    label="Lifetime-free"
                    value={
                      selected.lifetime_free_decision_status
                    }
                  />
                </div>
              </section>

              <section style={panelStyle}>
                <div style={eyebrowStyle}>
                  Original identity
                </div>

                <h2 style={sectionHeadingStyle}>
                  Name and document state
                </h2>

                <div style={informationGridStyle}>
                  <InformationRow
                    label="Profile name"
                    value={
                      selectedProfile.full_name ||
                      "Not recorded"
                    }
                  />

                  <InformationRow
                    label="Declared original name"
                    value={
                      selected.original_name_declared ||
                      "Not recorded"
                    }
                  />

                  <InformationRow
                    label="Extracted document name"
                    value={
                      selected.identity_name_extracted ||
                      "Not extracted"
                    }
                  />

                  <InformationRow
                    label="Document type"
                    value={
                      selected.identity_document_type ||
                      "Not submitted"
                    }
                  />

                  <InformationRow
                    label="Masked reference"
                    value={
                      selected.identity_document_masked_reference ||
                      "Not submitted"
                    }
                  />

                  <InformationRow
                    label="Document verification"
                    value={
                      selected.identity_document_verification_status
                    }
                  />
                </div>
              </section>

              <section style={panelStyle}>
                <div style={eyebrowStyle}>
                  Mandatory live evidence
                </div>

                <h2 style={sectionHeadingStyle}>
                  Selfie and work photographs
                </h2>

                <div style={evidenceGridStyle}>
                  <EvidenceImage
                    title="Verified Live Selfie"
                    description="The mandatory live-camera profile photograph."
                    asset={mediaAsset(
                      selected.verified_selfie_json
                    )}
                  />

                  <EvidenceImage
                    title="Live Work Photo 1"
                    description="The applicant personally performing or demonstrating the declared skill."
                    asset={mediaAsset(
                      selected.work_photo_one_json
                    )}
                  />

                  <EvidenceImage
                    title="Live Work Photo 2"
                    description="Tools, materials, workplace or completed work associated with the declared skill."
                    asset={mediaAsset(
                      selected.work_photo_two_json
                    )}
                  />
                </div>
              </section>

              <section style={panelStyle}>
                <div style={eyebrowStyle}>
                  Advisory AI review
                </div>

                <h2 style={sectionHeadingStyle}>
                  Work-evidence observations
                </h2>

                <div style={aiSummaryStyle}>
                  <div>
                    Status:{" "}
                    <strong>
                      {selected.ai_verification_status.replaceAll(
                        "_",
                        " "
                      )}
                    </strong>
                  </div>

                  <div>
                    Confidence:{" "}
                    <strong>
                      {selected.ai_confidence == null
                        ? "Not available"
                        : `${Math.round(
                            Number(
                              selected.ai_confidence
                            ) * 100
                          )}%`}
                    </strong>
                  </div>

                  <div>
                    Reviewed:{" "}
                    <strong>
                      {displayDate(
                        selected.ai_reviewed_at
                      )}
                    </strong>
                  </div>
                </div>

                {aiResult.summary ? (
                  <p style={introStyle}>
                    {String(aiResult.summary)}
                  </p>
                ) : null}

                {aiResult.skillMatchSummary ? (
                  <p style={introStyle}>
                    <strong>Skill match:</strong>{" "}
                    {String(
                      aiResult.skillMatchSummary
                    )}
                  </p>
                ) : null}

                {Array.isArray(
                  aiResult.contractorIndicators
                ) &&
                aiResult.contractorIndicators.length ? (
                  <div style={riskStyle}>
                    <strong>
                      Possible contractor indicators
                    </strong>

                    <ul style={{ marginBottom: 0 }}>
                      {aiResult.contractorIndicators.map(
                        (indicator: unknown) => (
                          <li key={String(indicator)}>
                            {String(indicator)}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                ) : null}

                <div style={assessmentGridStyle}>
                  {photoAssessments.map(
                    (
                      assessment: any,
                      index: number
                    ) => (
                      <article
                        key={`${assessment.photo}-${index}`}
                        style={assessmentStyle}
                      >
                        <strong>
                          {assessment.photo ===
                          "work_photo_two"
                            ? "Second work photo"
                            : "First work photo"}
                        </strong>

                        <InformationRow
                          label="Quality"
                          value={
                            assessment.quality ||
                            "Not assessed"
                          }
                        />

                        <InformationRow
                          label="Skill relevance"
                          value={
                            assessment.skillRelevance ||
                            "Not assessed"
                          }
                        />

                        <InformationRow
                          label="Personally performing work"
                          value={
                            assessment.personAppearsToPerformWork ===
                            true
                              ? "Likely visible"
                              : assessment.personAppearsToPerformWork ===
                                false
                              ? "Not clearly visible"
                              : "Unclear"
                          }
                        />

                        {Array.isArray(
                          assessment.visibleSignals
                        ) &&
                        assessment.visibleSignals.length ? (
                          <div style={smallTextStyle}>
                            <strong>
                              Visible signals:
                            </strong>{" "}
                            {assessment.visibleSignals.join(
                              ", "
                            )}
                          </div>
                        ) : null}

                        {Array.isArray(
                          assessment.concerns
                        ) &&
                        assessment.concerns.length ? (
                          <div style={riskStyle}>
                            {assessment.concerns.join(
                              " "
                            )}
                          </div>
                        ) : null}

                        {assessment.correctiveGuidance ? (
                          <div style={guidanceStyle}>
                            <strong>
                              Corrective guidance:
                            </strong>{" "}
                            {
                              assessment.correctiveGuidance
                            }
                          </div>
                        ) : null}
                      </article>
                    )
                  )}
                </div>

                <div style={advisoryStyle}>
                  AI is advisory only. It cannot grant
                  lifetime-free eligibility, suspend the
                  applicant or make the final classification.
                </div>
              </section>

              <IndividualProfessionalReviewActions
                userId={selected.user_id}
                verificationStatus={
                  selected.verification_status
                }
                lifetimeFreeDecisionStatus={
                  selected.lifetime_free_decision_status
                }
                approvalFailures={approvalFailures}
              />

              <section style={panelStyle}>
                <div style={eyebrowStyle}>
                  Immutable audit history
                </div>

                <h2 style={sectionHeadingStyle}>
                  Previous human decisions
                </h2>

                {selectedHistory.length ? (
                  <div style={historyGridStyle}>
                    {selectedHistory.map(
                      (item: any) => (
                        <article
                          key={item.id}
                          style={historyCardStyle}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                            }}
                          >
                            {item.decision.replaceAll(
                              "_",
                              " "
                            )}
                          </div>

                          <div style={queueMetaStyle}>
                            {displayDate(
                              item.created_at
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.reason}
                          </div>

                          {item.reviewer_notes ? (
                            <div style={guidanceStyle}>
                              <strong>
                                Internal notes:
                              </strong>{" "}
                              {item.reviewer_notes}
                            </div>
                          ) : null}

                          <div style={historyTransitionStyle}>
                            Verification:{" "}
                            {String(
                              item.previous_verification_status ||
                                "none"
                            ).replaceAll("_", " ")}
                            {" → "}
                            {String(
                              item.next_verification_status
                            ).replaceAll("_", " ")}
                          </div>

                          <div style={historyTransitionStyle}>
                            Lifetime-free:{" "}
                            {String(
                              item.previous_decision_status ||
                                "none"
                            ).replaceAll("_", " ")}
                            {" → "}
                            {String(
                              item.next_decision_status
                            ).replaceAll("_", " ")}
                          </div>
                        </article>
                      )
                    )}
                  </div>
                ) : (
                  <div style={emptyStyle}>
                    No authorised human decision has been
                    recorded yet.
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InformationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={informationRowStyle}>
      <div style={informationLabelStyle}>
        {label}
      </div>
      <div style={{ fontWeight: 800 }}>
        {value.replaceAll("_", " ")}
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 18,
};

const headerLinksStyle: React.CSSProperties = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".07em",
};

const introStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
};

const linkButtonStyle: React.CSSProperties = {
  padding: "9px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 800,
};

const filterStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  padding: 14,
  border: "1px solid #dbe4ef",
  borderRadius: 13,
  background: "white",
};

const fieldStyle: React.CSSProperties = {
  padding: "10px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  background: "white",
};

const workspaceStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(270px, .72fr) minmax(0, 2.28fr)",
  gap: 18,
  marginTop: 18,
  alignItems: "start",
};

const queueStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  position: "sticky",
  top: 16,
};

const queueMetaStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
};

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  padding: 18,
  border: "1px solid #dbe4ef",
  borderRadius: 16,
  background: "white",
};

const identityHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const identitySummaryStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  border: "1px solid #dbe4ef",
  borderRadius: 11,
  background: "#f8fafc",
};

const statusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(150px,1fr))",
  gap: 9,
  marginTop: 16,
};

const sectionHeadingStyle: React.CSSProperties = {
  margin: "5px 0 14px",
  fontSize: 20,
};

const informationGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: 9,
};

const informationRowStyle: React.CSSProperties = {
  padding: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#f8fafc",
};

const informationLabelStyle: React.CSSProperties = {
  marginBottom: 3,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
};

const evidenceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(260px,1fr))",
  gap: 12,
};

const evidenceCardStyle: React.CSSProperties = {
  minWidth: 0,
  padding: 13,
  border: "1px solid #dbe4ef",
  borderRadius: 13,
  background: "#f8fafc",
};

const smallTextStyle: React.CSSProperties = {
  margin: "6px 0 10px",
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.45,
};

const metadataStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  marginTop: 9,
  color: "#475569",
  fontSize: 12,
};

const missingStyle: React.CSSProperties = {
  padding: 20,
  border: "1px dashed #fca5a5",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
};

const aiSummaryStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(170px,1fr))",
  gap: 9,
  padding: 12,
  border: "1px solid #c7d2fe",
  borderRadius: 11,
  background: "#eef2ff",
};

const assessmentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(250px,1fr))",
  gap: 10,
  marginTop: 12,
};

const assessmentStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #dbe4ef",
  borderRadius: 12,
  background: "#f8fafc",
};

const riskStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  border: "1px solid #fca5a5",
  borderRadius: 9,
  background: "#fef2f2",
  color: "#991b1b",
  lineHeight: 1.45,
};

const guidanceStyle: React.CSSProperties = {
  marginTop: 9,
  padding: 9,
  border: "1px solid #bfdbfe",
  borderRadius: 9,
  background: "#eff6ff",
  color: "#1e3a8a",
  lineHeight: 1.45,
};

const advisoryStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  border: "1px solid #fde68a",
  borderRadius: 9,
  background: "#fffbeb",
  color: "#92400e",
  fontWeight: 800,
};

const historyGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const historyCardStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #dbe4ef",
  borderRadius: 11,
  background: "#f8fafc",
};

const historyTransitionStyle: React.CSSProperties = {
  marginTop: 7,
  color: "#475569",
  fontSize: 13,
};

const emptyStyle: React.CSSProperties = {
  padding: 22,
  border: "1px solid #dbe4ef",
  borderRadius: 14,
  background: "white",
  color: "#475569",
};
