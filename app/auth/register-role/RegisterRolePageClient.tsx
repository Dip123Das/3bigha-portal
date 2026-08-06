"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type RegistrationPath =
  | "customer"
  | "business"
  | "individual_professional";

type RegistrationChoice = {
  key: RegistrationPath;
  eyebrow: string;
  title: string;
  summary: string;
  whoShouldChoose: string;
  examples: string[];
  buttonLabel: string;
  note: string;
};

const REGISTRATION_CHOICES: RegistrationChoice[] = [
  {
    key: "customer",
    eyebrow: "Buy, hire or enquire",
    title: "Customer / Buyer",
    summary:
      "Choose this when you mainly want to buy products, hire people, rent equipment, find property or submit an RFQ.",
    whoShouldChoose:
      "Home owners, families, farmers, buyers, property seekers and organisations purchasing goods or services.",
    examples: [
      "Buy building materials",
      "Find a mason or plumber",
      "Rent machinery",
      "Search property",
      "Submit an RFQ",
    ],
    buttonLabel: "Continue as Customer",
    note:
      "Quick registration only. No business proof, work photographs or professional verification.",
  },
  {
    key: "business",
    eyebrow: "Sell, operate or represent",
    title: "Business / Organisation",
    summary:
      "Choose this when you own, operate or officially represent a business, office, shop, firm, company or organisation.",
    whoShouldChoose:
      "Proprietors, partnerships, companies, dealers, suppliers, manufacturers, builders, contractors, consultants and organisations.",
    examples: [
      "Shop, dealer or distributor",
      "Manufacturer or supplier",
      "Builder or contractor",
      "Equipment rental business",
      "Architect, engineer or consultant",
      "Surveyor (Amin) or valuer",
    ],
    buttonLabel: "Register My Business",
    note:
      "Business constitution, sectors, verification, address and profile will be completed in the Business Registration shown on the next page.",
  },
  {
    key: "individual_professional",
    eyebrow: "Personally perform skilled work",
    title: "Individual Skilled Professional",
    summary:
      "Choose this only when you personally perform skilled work and earn mainly through your own labour—not through a contractor firm or labour-supply business.",
    whoShouldChoose:
      "Self-working tradespeople seeking direct work opportunities.",
    examples: [
      "Mason (Rajmistri)",
      "Carpenter",
      "Painter / Polisher",
      "Electrician",
      "Plumber",
      "Welder / Fabricator",
      "Tile / Marble Installer",
      "Driver or Machine Operator",
    ],
    buttonLabel: "Register as Skilled Professional",
    note:
      "May qualify for Lifetime Free access after live evidence, AI assistance and authorised human verification.",
  },
];

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "";
  }

  return raw;
}

export default function RegisterRolePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  const next = safeNextPath(
    searchParams.get("next")
  );

  const requestedRole = String(
    searchParams.get("role") || ""
  ).toLowerCase();

  const [selectedPath, setSelectedPath] =
    useState<RegistrationPath | null>(null);

  const [continuing, setContinuing] =
    useState(false);

  const [message, setMessage] = useState("");

  if (requestedRole === "master_admin") {
    return (
      <main style={pageStyle}>
        <section style={simplePanelStyle}>
          <strong style={{ fontSize: 19 }}>
            Master Admin access is already configured.
          </strong>

          <button
            type="button"
            onClick={() =>
              router.replace("/admin/dashboard")
            }
            style={primaryButtonStyle}
          >
            Open Master Admin Workspace
          </button>
        </section>
      </main>
    );
  }

  async function continueRegistration() {
    if (!selectedPath) {
      setMessage(
        "Choose how you want to use 3Bigha."
      );
      return;
    }

    setContinuing(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        const returnPath =
          "/auth/register-role" +
          (next
            ? `?next=${encodeURIComponent(next)}`
            : "");

        router.replace(
          `/login?next=${encodeURIComponent(
            returnPath
          )}`
        );
        return;
      }

      const declaredAt =
        new Date().toISOString();

      void supabase.auth
        .updateUser({
          data: {
            ...(session.user.user_metadata || {}),
            registration_path: selectedPath,
            registration_path_declared_at:
              declaredAt,
          },
        })
        .then(({ error }) => {
          if (error) {
            console.error(
              "REGISTRATION_PATH_METADATA_UPDATE_FAILED",
              error
            );
          }
        })
        .catch((error) => {
          console.error(
            "REGISTRATION_PATH_METADATA_UPDATE_FAILED",
            error
          );
        });

      if (selectedPath === "customer") {
        setContinuing(false);
        router.replace(
          "/onboarding/customer" +
            (next
              ? `?returnTo=${encodeURIComponent(
                  next
                )}`
              : "")
        );
        return;
      }

      if (selectedPath === "business") {
        setContinuing(false);
        router.replace(
          "/onboarding/business?registration=1" +
            `&registrationPath=business` +
            `&returnTo=${encodeURIComponent(
              next || "/dashboard"
            )}`
        );
        return;
      }

      setContinuing(false);
      router.replace(
        "/onboarding/individual-professional" +
          `?registrationPath=individual_professional` +
          `&returnTo=${encodeURIComponent(
            next || "/dashboard"
          )}`
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Registration could not continue. Please try again."
      );
      setContinuing(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div style={eyebrowStyle}>
            One account · One clear pathway
          </div>

          <h1 style={headingStyle}>
            How would you like to use 3Bigha?
          </h1>

          <p style={introStyle}>
            Choose the option that best describes why you
            are joining. You can add another authorised
            identity later without creating a second
            account.
          </p>
        </header>

        <div style={choiceGridStyle}>
          {REGISTRATION_CHOICES.map((choice) => {
            const selected =
              choice.key === selectedPath;

            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => {
                  setSelectedPath(choice.key);
                  setMessage("");
                }}
                aria-pressed={selected}
                style={{
                  ...choiceCardStyle,
                  border: selected
                    ? "2px solid #2563eb"
                    : "1px solid #dbe4ef",
                  background: selected
                    ? "#eff6ff"
                    : "white",
                  boxShadow: selected
                    ? "0 12px 30px rgba(37,99,235,.12)"
                    : "none",
                }}
              >
                <div style={choiceEyebrowStyle}>
                  {choice.eyebrow}
                </div>

                <h2 style={choiceTitleStyle}>
                  {choice.title}
                </h2>

                <p style={choiceSummaryStyle}>
                  {choice.summary}
                </p>

                <div style={whoStyle}>
                  <strong>
                    Who should choose this?
                  </strong>

                  <div style={{ marginTop: 5 }}>
                    {choice.whoShouldChoose}
                  </div>
                </div>

                <ul style={exampleListStyle}>
                  {choice.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>

                <div style={noteStyle}>
                  {choice.note}
                </div>

                <div
                  style={{
                    ...choiceButtonStyle,
                    background: selected
                      ? "#1d4ed8"
                      : "#e2e8f0",
                    color: selected
                      ? "white"
                      : "#334155",
                  }}
                >
                  {choice.buttonLabel}
                </div>
              </button>
            );
          })}
        </div>

        <section style={clarificationStyle}>
          <strong>
            Business or Individual Skilled Professional?
          </strong>

          <p style={{ margin: "7px 0 0" }}>
            Contractors, builders, labour suppliers,
            architects, engineers, Surveyors (Amin),
            valuers, consultants, firms and organised
            service providers must use{" "}
            <strong>
              Business / Organisation
            </strong>
            . The Individual Skilled Professional pathway
            is reserved for self-working tradespeople who
            personally perform the declared work.
          </p>
        </section>

        {message ? (
          <div role="alert" style={messageStyle}>
            {message}
          </div>
        ) : null}

        <footer style={footerStyle}>
          <div style={footerTextStyle}>
            Human First. AI Second. Precision Always.
          </div>

          <button
            type="button"
            onClick={continueRegistration}
            disabled={continuing || !selectedPath}
            style={{
              ...primaryButtonStyle,
              opacity:
                continuing || !selectedPath
                  ? 0.55
                  : 1,
            }}
          >
            {continuing
              ? "Opening your registration…"
              : selectedPath
              ? REGISTRATION_CHOICES.find(
                  (choice) =>
                    choice.key === selectedPath
                )?.buttonLabel
              : "Choose a registration pathway"}
          </button>
        </footer>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "36px 18px",
  background: "#f8fafc",
};

const shellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
  padding: 22,
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  background: "white",
  boxShadow:
    "0 18px 48px rgba(15,23,42,.07)",
};

const simplePanelStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  display: "grid",
  gap: 16,
  padding: 24,
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  background: "white",
};

const headerStyle: React.CSSProperties = {
  maxWidth: 820,
  marginBottom: 22,
};

const eyebrowStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".07em",
  textTransform: "uppercase",
};

const headingStyle: React.CSSProperties = {
  margin: "7px 0 8px",
  fontSize: "clamp(27px,4vw,40px)",
  lineHeight: 1.12,
};

const introStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: 16,
  lineHeight: 1.6,
};

const choiceGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(280px,1fr))",
  gap: 14,
};

const choiceCardStyle: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  padding: 18,
  borderRadius: 16,
  textAlign: "left",
  cursor: "pointer",
  font: "inherit",
};

const choiceEyebrowStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".06em",
  textTransform: "uppercase",
};

const choiceTitleStyle: React.CSSProperties = {
  margin: "7px 0",
  color: "#0f172a",
  fontSize: 22,
};

const choiceSummaryStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
};

const whoStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 11,
  borderRadius: 10,
  background: "#f8fafc",
  color: "#334155",
  lineHeight: 1.45,
};

const exampleListStyle: React.CSSProperties = {
  margin: "13px 0",
  paddingLeft: 19,
  color: "#334155",
  lineHeight: 1.55,
};

const noteStyle: React.CSSProperties = {
  marginTop: "auto",
  padding: 10,
  border: "1px solid #fde68a",
  borderRadius: 9,
  background: "#fffbeb",
  color: "#92400e",
  fontSize: 13,
  lineHeight: 1.45,
};

const choiceButtonStyle: React.CSSProperties = {
  marginTop: 13,
  padding: "11px 13px",
  borderRadius: 10,
  textAlign: "center",
  fontWeight: 900,
};

const clarificationStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  border: "1px solid #bfdbfe",
  borderRadius: 12,
  background: "#eff6ff",
  color: "#1e3a8a",
  lineHeight: 1.55,
};

const messageStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: "1px solid #fca5a5",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
  fontWeight: 800,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid #e2e8f0",
};

const footerTextStyle: React.CSSProperties = {
  color: "#475569",
  fontWeight: 800,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  border: 0,
  borderRadius: 11,
  background: "#1d4ed8",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
