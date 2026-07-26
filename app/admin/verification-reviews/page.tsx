import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
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
              "id,email,full_name,role,requested_role,approval_status"
            )
            .in("id", userIds),
          admin
            .from("business_profiles")
            .select(
              "user_id,business_name,subscription_plan,subscription_status"
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
          Read-only review stage:
        </strong>{" "}
        secure certificate viewing has not
        yet been connected to the canonical
        business-proof storage source.
        Human approval is intentionally
        disabled until that evidence can be
        opened securely.
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
