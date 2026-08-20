import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import RegistrationAiReviewPanel from "./RegistrationAiReviewPanel";
import {
  buildReviewFieldRows,
  reviewStatusLabel,
  reviewStatusTone,
  reviewToneStyle,
  safeReviewText,
} from "@/lib/registration/verificationReviewPresentation";

export const dynamic = "force-dynamic";

type Params = Record<
  string,
  string | string[] | undefined
>;

function one(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0] || ""
    : value || "";
}

function displayDate(value: unknown) {
  const date = new Date(String(value || ""));

  if (!Number.isFinite(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function stateLabel(value: string) {
  if (value === "confirmed") {
    return "Confirmed";
  }

  if (value === "mismatch") {
    return "Mismatch";
  }

  if (value === "uncertain") {
    return "Needs human attention";
  }

  return "Not available";
}

type EvidenceAsset = {
  bucket?: string;
  path?: string;
  name?: string;
  mimeType?: string;
  evidenceCategory?: string;
  captureTimestamp?: string;
  evidenceBindingSha256?: string;
  captureMetadata?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  } | null;
};

function asEvidenceArray(value: unknown): EvidenceAsset[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is EvidenceAsset =>
        Boolean(item) && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    return [value as EvidenceAsset];
  }

  return [];
}

function collectEvidenceAssets(
  business: Record<string, unknown>
) {
  const unique = new Map<string, EvidenceAsset>();

  for (const asset of [
    ...asEvidenceArray(business.selfie_media_json),
    ...asEvidenceArray(business.workplace_media_json),
    ...asEvidenceArray(business.business_media_json),
  ]) {
    const path = String(asset.path || "").trim();

    if (
      asset.bucket === "registration-evidence" &&
      path
    ) {
      unique.set(path, asset);
    }
  }

  return [...unique.values()];
}

function decisionLabel(value: unknown) {
  const action = String(value || "");

  if (action === "admin_registration_approved") {
    return "Approved by administrator";
  }

  if (
    action ===
    "admin_registration_correction_requested"
  ) {
    return "Correction requested";
  }

  if (
    action ===
    "admin_registration_manual_review_required"
  ) {
    return "Manual review required";
  }

  if (action === "admin_registration_rejected") {
    return "Registration rejected";
  }

  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function trustLabel(value: string) {
  return value
    .replace(/Trust$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function evidenceLabel(asset: EvidenceAsset) {
  const category = String(
    asset.evidenceCategory || ""
  );

  if (category === "selfie") {
    return "Live business-board selfie";
  }

  if (category === "work_photo_one") {
    return "Workplace evidence 1";
  }

  if (category === "work_photo_two") {
    return "Workplace evidence 2";
  }

  if (category === "business_document") {
    return "Business registration document";
  }

  return asset.name || "Registration evidence";
}

function stateStyle(value: string) {
  if (value === "confirmed") {
    return {
      background: "#ecfdf5",
      color: "#065f46",
    };
  }

  if (value === "mismatch") {
    return {
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  if (value === "uncertain") {
    return {
      background: "#fffbeb",
      color: "#92400e",
    };
  }

  return {
    background: "#f1f5f9",
    color: "#475569",
  };
}

export default async function VerificationReviewsPage({
  searchParams,
}: {
  searchParams?: Params;
}) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    if (access.status === 401) {
      redirect(
        "/login?next=/admin/verification-reviews"
      );
    }

    return (
      <main style={{ padding: 24 }}>
        Access denied
      </main>
    );
  }

  const statusFilter = one(
    searchParams?.status
  );
  const query = one(searchParams?.q)
    .trim()
    .toLowerCase();
  const selectedCaseId = one(
    searchParams?.case
  );
  const decisionState = one(
    searchParams?.decision
  );
  const decisionMessage = one(
    searchParams?.message
  );

  const { admin } = access;

  const casesRes = await admin
    .from("registration_verification_cases")
    .select(
      "id,user_id,status,confidence,result_json,created_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(300);

  if (casesRes.error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Verification Reviews</h1>
        <p>
          Verification cases could not be
          loaded.
        </p>
        <pre>{casesRes.error.message}</pre>
      </main>
    );
  }

  const cases = casesRes.data || [];
  const userIds = [
    ...new Set(
      cases
        .map((item: any) => item.user_id)
        .filter(Boolean)
    ),
  ];

  const [profilesRes, businessRes] =
    userIds.length
      ? await Promise.all([
          admin
            .from("profiles")
            .select(
              [
                "id",
                "email",
                "full_name",
                "role",
                "requested_role",
                "approval_status",
                "registration_verification_status",
                "registration_verification_score",
                "registration_verification_reasons",
                "admin_review_reason",
                "dashboard_activation_status",
              ].join(",")
            )
            .in("id", userIds),
          admin
            .from("business_profiles")
            .select(
              [
                "user_id",
                "business_name",
                "subscription_plan",
                "subscription_status",
                "selfie_media_json",
                "workplace_media_json",
                "business_media_json",
                "automated_verification_json",
              ].join(",")
            )
            .in("user_id", userIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  const loadError =
    profilesRes.error || businessRes.error;

  if (loadError) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Verification Reviews</h1>
        <p>
          Member information could not be
          loaded.
        </p>
        <pre>{loadError.message}</pre>
      </main>
    );
  }

  const profiles = new Map(
    (profilesRes.data || []).map(
      (profile: any) => [
        profile.id,
        profile,
      ]
    )
  );

  const businesses = new Map(
    (businessRes.data || []).map(
      (business: any) => [
        business.user_id,
        business,
      ]
    )
  );

  const latestByUser = new Map<
    string,
    any
  >();

  for (const item of cases as any[]) {
    if (!latestByUser.has(item.user_id)) {
      latestByUser.set(item.user_id, item);
    }
  }

  const queue = [
    ...latestByUser.values(),
  ].filter((item: any) => {
    const profile: any =
      profiles.get(item.user_id) || {};
    const business: any =
      businesses.get(item.user_id) || {};

    if (
      statusFilter &&
      item.status !== statusFilter
    ) {
      return false;
    }

    if (query) {
      const searchable = [
        profile.full_name,
        profile.email,
        business.business_name,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const selected =
    cases.find(
      (item: any) =>
        item.id === selectedCaseId
    ) ||
    queue[0] ||
    null;

  const selectedProfile: any = selected
    ? profiles.get(selected.user_id) || {}
    : {};

  const selectedBusiness: any = selected
    ? businesses.get(selected.user_id) ||
      {}
    : {};

  const evidenceAssets =
    selected
      ? collectEvidenceAssets(
          selectedBusiness
        )
      : [];

  const trustIntelligence =
    selectedBusiness
      ?.automated_verification_json
      ?.trustIntelligence &&
    typeof selectedBusiness
      .automated_verification_json
      .trustIntelligence === "object"
      ? selectedBusiness
          .automated_verification_json
          .trustIntelligence
      : null;

  const result =
    selected?.result_json &&
    typeof selected.result_json ===
      "object"
      ? selected.result_json
      : {};

  const documents = Array.isArray(
    result.documents
  )
    ? result.documents
    : [];

  const history = selected
    ? cases.filter(
        (item: any) =>
          item.user_id ===
          selected.user_id
      )
    : [];

  const eventsRes = selected
    ? await admin
        .from(
          "registration_verification_events"
        )
        .select(
          [
            "id",
            "event_type",
            "previous_status",
            "next_status",
            "score",
            "reasons",
            "evidence_snapshot",
            "decision_source",
            "decided_by",
            "created_at",
          ].join(",")
        )
        .eq("user_id", selected.user_id)
        .order("created_at", {
          ascending: false,
        })
        .limit(100)
    : { data: [], error: null };

  const decisionEvents =
    eventsRes.data || [];

  const reviewerIds = [
    ...new Set(
      decisionEvents
        .map((event: any) =>
          String(event.decided_by || "")
        )
        .filter(Boolean)
    ),
  ];

  const reviewersRes = reviewerIds.length
    ? await admin
        .from("profiles")
        .select("id,full_name,email")
        .in("id", reviewerIds)
    : { data: [], error: null };

  const reviewers = new Map(
    (reviewersRes.data || []).map(
      (reviewer: any) => [
        reviewer.id,
        reviewer,
      ]
    )
  );

  const fieldStyle = {
    padding: "9px 11px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "white",
  } as const;

  return (
    <main
      style={{
        padding: 24,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            Business Proof Reviews
          </h1>

          <p
            style={{
              color: "#475569",
              maxWidth: 900,
            }}
          >
            Review AI-extracted business
            proof information before any
            human decision. Identity
            approval, registration
            activation and SBI subscription
            activation remain separate.
          </p>
        </div>

        <Link
          href="/admin/users"
          style={{
            ...fieldStyle,
            color: "#0f172a",
            textDecoration: "none",
          }}
        >
          Member administration
        </Link>
      </div>

      {decisionMessage ? (
        <div
          style={{
            padding: 14,
            marginBottom: 14,
            border:
              decisionState === "success"
                ? "1px solid #86efac"
                : "1px solid #fca5a5",
            borderRadius: 12,
            background:
              decisionState === "success"
                ? "#f0fdf4"
                : "#fef2f2",
            color:
              decisionState === "success"
                ? "#166534"
                : "#991b1b",
            fontWeight: 800,
          }}
        >
          {decisionMessage}
        </div>
      ) : null}

      <div
        style={{
          padding: 14,
          marginBottom: 18,
          border: "1px solid #fde68a",
          borderRadius: 12,
          background: "#fffbeb",
          color: "#92400e",
        }}
      >
        <strong>
          Secure read-only review:
        </strong>{" "}
        private registration evidence is
        opened through master-admin-only,
        short-lived signed links. Human
        approval remains intentionally
        disabled in this milestone.
      </div>

      <form
        method="get"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: 14,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#f8fafc",
        }}
      >
        <input
          name="q"
          defaultValue={one(
            searchParams?.q
          )}
          placeholder="Search member or business"
          style={{
            ...fieldStyle,
            minWidth: 250,
          }}
        />

        <select
          name="status"
          defaultValue={statusFilter}
          style={fieldStyle}
        >
          <option value="">
            All verification states
          </option>
          <option value="needs_manual_review">
            Manual review required
          </option>
          <option value="document_mismatch">
            Document mismatch
          </option>
          <option value="format_invalid">
            Invalid information
          </option>
          <option value="needs_document">
            Document required
          </option>
          <option value="verified_by_ai">
            Verified by AI
          </option>
        </select>

        <button
          type="submit"
          style={fieldStyle}
        >
          Apply filters
        </button>

        <Link
          href="/admin/verification-reviews"
          style={{
            ...fieldStyle,
            textDecoration: "none",
            color: "#0f172a",
          }}
        >
          Clear
        </Link>
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(300px, 0.8fr) minmax(0, 2.2fr)",
          gap: 18,
          marginTop: 18,
          alignItems: "start",
        }}
      >
        <aside
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <strong>
            {queue.length} member
            {queue.length === 1
              ? ""
              : "s"}{" "}
            in this view
          </strong>

          {queue.map((item: any) => {
            const profile: any =
              profiles.get(item.user_id) ||
              {};
            const business: any =
              businesses.get(
                item.user_id
              ) || {};
            const tone = reviewStatusTone(
              item.status
            );
            const active =
              item.id === selected?.id;

            return (
              <Link
                key={item.id}
                href={{
                  pathname:
                    "/admin/verification-reviews",
                  query: {
                    ...(statusFilter
                      ? {
                          status:
                            statusFilter,
                        }
                      : {}),
                    ...(query
                      ? { q: query }
                      : {}),
                    case: item.id,
                  },
                }}
                style={{
                  display: "block",
                  padding: 14,
                  border: active
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: "white",
                  color: "#0f172a",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                  }}
                >
                  {profile.full_name ||
                    business.business_name ||
                    "Unnamed member"}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  {profile.email ||
                    "No email"}
                </div>

                <div
                  style={{
                    display:
                      "inline-block",
                    marginTop: 9,
                    padding: "5px 8px",
                    border: "1px solid",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    ...reviewToneStyle(
                      tone
                    ),
                  }}
                >
                  {reviewStatusLabel(
                    item.status
                  )}{" "}
                  ·{" "}
                  {Math.round(
                    Number(
                      item.confidence || 0
                    )
                  )}
                  %
                </div>
              </Link>
            );
          })}
        </aside>

        <section>
          {!selected ? (
            <div
              style={{
                padding: 24,
                border:
                  "1px solid #e2e8f0",
                borderRadius: 14,
                background: "white",
              }}
            >
              No verification cases match
              the selected filters.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 16,
              }}
            >
              <article
                style={{
                  padding: 18,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin:
                          "0 0 6px",
                      }}
                    >
                      {selectedProfile.full_name ||
                        selectedBusiness.business_name ||
                        "Unnamed member"}
                    </h2>

                    <div>
                      {selectedProfile.email ||
                        "No email"}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#64748b",
                      }}
                    >
                      Business:{" "}
                      <strong>
                        {selectedBusiness.business_name ||
                          "Not recorded"}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        padding:
                          "7px 10px",
                        border:
                          "1px solid",
                        borderRadius: 999,
                        fontWeight: 900,
                        ...reviewToneStyle(
                          reviewStatusTone(
                            selected.status
                          )
                        ),
                      }}
                    >
                      {reviewStatusLabel(
                        selected.status
                      )}{" "}
                      ·{" "}
                      {Math.round(
                        Number(
                          selected.confidence ||
                            0
                        )
                      )}
                      %
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#64748b",
                        textAlign: "right",
                      }}
                    >
                      {displayDate(
                        selected.created_at
                      )}
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    marginBottom: 0,
                    color: "#475569",
                  }}
                >
                  {safeReviewText(
                    result.summary,
                    "No verification summary was recorded."
                  )}
                </p>
              </article>

              {trustIntelligence ? (
                <article
                  style={{
                    padding: 18,
                    border:
                      "1px solid #bfdbfe",
                    borderRadius: 14,
                    background: "#eff6ff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 14,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 6px",
                        }}
                      >
                        Business Trust Intelligence
                      </h3>
                      <div
                        style={{
                          color: "#475569",
                        }}
                      >
                        Advisory intelligence supports
                        the reviewer. The human decision
                        remains authoritative.
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 950,
                        color: "#1d4ed8",
                      }}
                    >
                      {Math.round(
                        Number(
                          trustIntelligence
                            .overallTrust || 0
                        )
                      )}
                      /100
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    {[
                      "identityTrust",
                      "locationTrust",
                      "evidenceTrust",
                      "captureIntegrityTrust",
                      "businessActivityTrust",
                    ].map((key) => (
                      <div
                        key={key}
                        style={{
                          padding: 12,
                          border:
                            "1px solid #bfdbfe",
                          borderRadius: 10,
                          background: "white",
                        }}
                      >
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {trustLabel(key)}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 22,
                            fontWeight: 950,
                          }}
                        >
                          {Math.round(
                            Number(
                              trustIntelligence[
                                key
                              ] || 0
                            )
                          )}
                          /100
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <strong>
                      Risk:{" "}
                      {String(
                        trustIntelligence.riskLevel ||
                          "Not available"
                      )}
                    </strong>
                    <strong>
                      Recommendation:{" "}
                      {String(
                        trustIntelligence
                          .recommendedAction ||
                          "Not available"
                      ).replaceAll("_", " ")}
                    </strong>
                  </div>

                  {Array.isArray(
                    trustIntelligence.explanations
                  ) ? (
                    <ul
                      style={{
                        marginBottom: 0,
                        color: "#334155",
                      }}
                    >
                      {trustIntelligence.explanations.map(
                        (
                          explanation: unknown,
                          index: number
                        ) => (
                          <li key={index}>
                            {String(explanation)}
                          </li>
                        )
                      )}
                    </ul>
                  ) : null}
                </article>
              ) : null}

              <RegistrationAiReviewPanel
                userId={selected.user_id}
                caseId={selected.id}
              />

              <article
                style={{
                  padding: 18,
                  border:
                    "1px solid #cbd5e1",
                  borderRadius: 14,
                  background: "white",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 6px",
                  }}
                >
                  Human registration decision
                </h3>

                <p
                  style={{
                    marginTop: 0,
                    color: "#64748b",
                  }}
                >
                  Review every private evidence item
                  before deciding. A reason of at
                  least 10 characters is mandatory,
                  and every action is permanently
                  recorded.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <strong>Current status</strong>
                    <div>
                      {String(
                        selectedProfile
                          .registration_verification_status ||
                          "draft"
                      ).replaceAll("_", " ")}
                    </div>
                  </div>
                  <div>
                    <strong>Approval</strong>
                    <div>
                      {String(
                        selectedProfile
                          .approval_status ||
                          "pending"
                      )}
                    </div>
                  </div>
                  <div>
                    <strong>Dashboard</strong>
                    <div>
                      {String(
                        selectedProfile
                          .dashboard_activation_status ||
                          "not_ready"
                      ).replaceAll("_", " ")}
                    </div>
                  </div>
                </div>

                <form
                  method="post"
                  action="/api/admin/registration-review/decision"
                >
                  <input
                    type="hidden"
                    name="user_id"
                    value={selected.user_id}
                  />
                  <input
                    type="hidden"
                    name="case_id"
                    value={selected.id}
                  />

                  <label
                    style={{
                      display: "grid",
                      gap: 6,
                      fontWeight: 900,
                    }}
                  >
                    Review reason
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      rows={4}
                      placeholder="Record what you verified and why this decision is appropriate."
                      style={{
                        ...fieldStyle,
                        resize: "vertical",
                        font: "inherit",
                      }}
                    />
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <button
                      type="submit"
                      name="action"
                      value="approve"
                      style={{
                        ...fieldStyle,
                        border:
                          "1px solid #16a34a",
                        background: "#16a34a",
                        color: "white",
                        fontWeight: 900,
                      }}
                    >
                      Approve registration
                    </button>

                    <button
                      type="submit"
                      name="action"
                      value="request_correction"
                      style={{
                        ...fieldStyle,
                        border:
                          "1px solid #d97706",
                        background: "#fffbeb",
                        color: "#92400e",
                        fontWeight: 900,
                      }}
                    >
                      Request correction
                    </button>

                    <button
                      type="submit"
                      name="action"
                      value="manual_review"
                      style={{
                        ...fieldStyle,
                        border:
                          "1px solid #2563eb",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontWeight: 900,
                      }}
                    >
                      Keep in manual review
                    </button>

                    <button
                      type="submit"
                      name="action"
                      value="reject"
                      style={{
                        ...fieldStyle,
                        border:
                          "1px solid #dc2626",
                        background: "#dc2626",
                        color: "white",
                        fontWeight: 900,
                      }}
                    >
                      Reject registration
                    </button>
                  </div>
                </form>
              </article>

              <article
                style={{
                  padding: 18,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: "0 0 6px",
                      }}
                    >
                      Secure registration evidence
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color: "#64748b",
                      }}
                    >
                      Each evidence link is
                      master-admin-only and expires
                      after two minutes.
                    </p>
                  </div>

                  {trustIntelligence ? (
                    <div
                      style={{
                        padding: "8px 10px",
                        border:
                          "1px solid #bfdbfe",
                        borderRadius: 10,
                        background: "#eff6ff",
                        color: "#1e3a8a",
                        fontWeight: 900,
                      }}
                    >
                      Trust score{" "}
                      {Math.round(
                        Number(
                          trustIntelligence
                            .overallTrust || 0
                        )
                      )}
                      /100
                    </div>
                  ) : null}
                </div>

                {evidenceAssets.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: 12,
                      marginTop: 16,
                    }}
                  >
                    {evidenceAssets.map(
                      (asset) => {
                        const path = String(
                          asset.path || ""
                        );
                        const href =
                          "/api/admin/registration-evidence/view" +
                          `?user_id=${encodeURIComponent(
                            selected.user_id
                          )}` +
                          `&path=${encodeURIComponent(
                            path
                          )}`;
                        const isImage =
                          String(
                            asset.mimeType || ""
                          ).startsWith("image/");

                        return (
                          <div
                            key={path}
                            style={{
                              padding: 12,
                              border:
                                "1px solid #e2e8f0",
                              borderRadius: 12,
                              background: "#f8fafc",
                            }}
                          >
                            {isImage ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={href}
                                  alt={evidenceLabel(
                                    asset
                                  )}
                                  style={{
                                    width: "100%",
                                    height: 180,
                                    objectFit:
                                      "cover",
                                    borderRadius: 9,
                                    border:
                                      "1px solid #cbd5e1",
                                    background:
                                      "white",
                                  }}
                                />
                              </a>
                            ) : (
                              <div
                                style={{
                                  minHeight: 120,
                                  display: "grid",
                                  placeItems:
                                    "center",
                                  borderRadius: 9,
                                  border:
                                    "1px solid #cbd5e1",
                                  background:
                                    "white",
                                  fontWeight: 900,
                                  color: "#475569",
                                }}
                              >
                                Secure document
                              </div>
                            )}

                            <div
                              style={{
                                marginTop: 10,
                                fontWeight: 900,
                              }}
                            >
                              {evidenceLabel(
                                asset
                              )}
                            </div>

                            <div
                              style={{
                                marginTop: 5,
                                fontSize: 13,
                                color: "#64748b",
                              }}
                            >
                              Captured:{" "}
                              {displayDate(
                                asset.captureTimestamp
                              )}
                            </div>

                            {asset.captureMetadata ? (
                              <div
                                style={{
                                  marginTop: 5,
                                  fontSize: 13,
                                  color: "#64748b",
                                }}
                              >
                                GPS:{" "}
                                {Number.isFinite(
                                  Number(
                                    asset
                                      .captureMetadata
                                      .latitude
                                  )
                                ) &&
                                Number.isFinite(
                                  Number(
                                    asset
                                      .captureMetadata
                                      .longitude
                                  )
                                )
                                  ? `${Number(
                                      asset
                                        .captureMetadata
                                        .latitude
                                    ).toFixed(
                                      6
                                    )}, ${Number(
                                      asset
                                        .captureMetadata
                                        .longitude
                                    ).toFixed(
                                      6
                                    )}`
                                  : "Not available"}
                                {" · Accuracy ±"}
                                {Math.round(
                                  Number(
                                    asset
                                      .captureMetadata
                                      .accuracy || 0
                                  )
                                )}
                                m
                              </div>
                            ) : null}

                            <div
                              style={{
                                marginTop: 5,
                                fontSize: 13,
                                color:
                                  asset.evidenceBindingSha256
                                    ? "#166534"
                                    : "#92400e",
                                fontWeight: 800,
                              }}
                            >
                              {asset.evidenceBindingSha256
                                ? "Cryptographically bound"
                                : "Legacy evidence metadata"}
                            </div>

                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display:
                                  "inline-block",
                                marginTop: 10,
                                padding:
                                  "8px 10px",
                                border:
                                  "1px solid #2563eb",
                                borderRadius: 9,
                                color: "#1d4ed8",
                                background:
                                  "white",
                                textDecoration:
                                  "none",
                                fontWeight: 900,
                              }}
                            >
                              Open securely
                            </a>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      border:
                        "1px solid #fde68a",
                      borderRadius: 10,
                      background: "#fffbeb",
                      color: "#92400e",
                    }}
                  >
                    No private REG-EV evidence
                    is attached to this case.
                  </div>
                )}
              </article>

              {documents.map(
                (
                  document: any,
                  index: number
                ) => {
                  const rows =
                    buildReviewFieldRows(
                      document
                    );

                  return (
                    <article
                      key={`${selected.id}-${index}`}
                      style={{
                        padding: 18,
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 14,
                        background: "white",
                      }}
                    >
                      <h3
                        style={{
                          margin:
                            "0 0 6px",
                        }}
                      >
                        {safeReviewText(
                          document.label,
                          `Document ${
                            index + 1
                          }`
                        )}
                      </h3>

                      <p
                        style={{
                          marginTop: 0,
                          color: "#64748b",
                        }}
                      >
                        {safeReviewText(
                          document.summary,
                          "No document summary was recorded."
                        )}
                      </p>

                      <div
                        style={{
                          overflowX: "auto",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse:
                              "collapse",
                            minWidth: 760,
                          }}
                        >
                          <thead>
                            <tr>
                              {[
                                "Field",
                                "Entered by member",
                                "Extracted by AI",
                                "Confidence",
                                "Review state",
                              ].map(
                                (heading) => (
                                  <th
                                    key={
                                      heading
                                    }
                                    style={{
                                      textAlign:
                                        "left",
                                      padding: 10,
                                      borderBottom:
                                        "1px solid #cbd5e1",
                                      background:
                                        "#f8fafc",
                                    }}
                                  >
                                    {heading}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {rows.map(
                              (row) => (
                                <tr
                                  key={
                                    row.field
                                  }
                                >
                                  <td
                                    style={{
                                      padding:
                                        10,
                                      borderBottom:
                                        "1px solid #e2e8f0",
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    {
                                      row.label
                                    }
                                    {row.severity ===
                                    "hard"
                                      ? " *"
                                      : ""}
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        10,
                                      borderBottom:
                                        "1px solid #e2e8f0",
                                    }}
                                  >
                                    {
                                      row.enteredValue
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        10,
                                      borderBottom:
                                        "1px solid #e2e8f0",
                                    }}
                                  >
                                    {
                                      row.extractedValue
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        10,
                                      borderBottom:
                                        "1px solid #e2e8f0",
                                    }}
                                  >
                                    {
                                      row.confidence
                                    }
                                    %
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        10,
                                      borderBottom:
                                        "1px solid #e2e8f0",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display:
                                          "inline-block",
                                        padding:
                                          "5px 8px",
                                        borderRadius:
                                          999,
                                        fontSize:
                                          12,
                                        fontWeight:
                                          800,
                                        ...stateStyle(
                                          row.state
                                        ),
                                      }}
                                    >
                                      {stateLabel(
                                        row.state
                                      )}
                                    </span>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>

                      {Array.isArray(
                        document.warnings
                      ) &&
                      document.warnings
                        .length ? (
                        <div
                          style={{
                            marginTop: 14,
                            padding: 12,
                            border:
                              "1px solid #fde68a",
                            borderRadius: 10,
                            background:
                              "#fffbeb",
                            color:
                              "#92400e",
                          }}
                        >
                          <strong>
                            Warnings
                          </strong>
                          <ul
                            style={{
                              marginBottom:
                                0,
                            }}
                          >
                            {document.warnings.map(
                              (
                                warning: unknown,
                                warningIndex: number
                              ) => (
                                <li
                                  key={
                                    warningIndex
                                  }
                                >
                                  {String(
                                    warning
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      ) : null}
                    </article>
                  );
                }
              )}

              <article
                style={{
                  padding: 18,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "white",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  Registration decision timeline
                </h3>

                {eventsRes.error ? (
                  <div
                    style={{
                      color: "#991b1b",
                    }}
                  >
                    Decision events could not be
                    loaded.
                  </div>
                ) : decisionEvents.length ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {decisionEvents.map(
                      (event: any) => {
                        const reviewer: any =
                          reviewers.get(
                            event.decided_by
                          ) || {};
                        const snapshot =
                          event.evidence_snapshot &&
                          typeof event
                            .evidence_snapshot ===
                            "object"
                            ? event.evidence_snapshot
                            : {};

                        return (
                          <div
                            key={event.id}
                            style={{
                              padding: 12,
                              border:
                                "1px solid #e2e8f0",
                              borderRadius: 10,
                              background: "#f8fafc",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 950,
                              }}
                            >
                              {decisionLabel(
                                event.event_type
                              )}
                            </div>

                            <div
                              style={{
                                marginTop: 4,
                                color: "#475569",
                              }}
                            >
                              {String(
                                event.previous_status ||
                                  "unknown"
                              ).replaceAll("_", " ")}
                              {" → "}
                              {String(
                                event.next_status ||
                                  "unknown"
                              ).replaceAll("_", " ")}
                            </div>

                            {snapshot.review_reason ? (
                              <div
                                style={{
                                  marginTop: 6,
                                }}
                              >
                                Reason:{" "}
                                <strong>
                                  {String(
                                    snapshot.review_reason
                                  )}
                                </strong>
                              </div>
                            ) : null}

                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 13,
                                color: "#64748b",
                              }}
                            >
                              {displayDate(
                                event.created_at
                              )}
                              {" · "}
                              {event.decided_by
                                ? reviewer.full_name ||
                                  reviewer.email ||
                                  "Master administrator"
                                : "Automated system"}
                              {" · "}
                              {String(
                                event.decision_source ||
                                  "system"
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      color: "#64748b",
                    }}
                  >
                    No registration decision events
                    have been recorded yet.
                  </div>
                )}
              </article>

              <article
                style={{
                  padding: 18,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 14,
                  background: "white",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  Verification history
                </h3>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {history.map(
                    (item: any) => (
                      <Link
                        key={item.id}
                        href={`/admin/verification-reviews?case=${item.id}`}
                        style={{
                          padding: 11,
                          border:
                            "1px solid #e2e8f0",
                          borderRadius: 10,
                          color:
                            "#0f172a",
                          textDecoration:
                            "none",
                        }}
                      >
                        <strong>
                          {reviewStatusLabel(
                            item.status
                          )}
                        </strong>{" "}
                        ·{" "}
                        {Math.round(
                          Number(
                            item.confidence ||
                              0
                          )
                        )}
                        %
                        <div
                          style={{
                            color:
                              "#64748b",
                            fontSize: 13,
                            marginTop: 3,
                          }}
                        >
                          {displayDate(
                            item.created_at
                          )}
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </article>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
