import type { VendorWorkspaceProjection } from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorUnifiedGrowthCentreProps = {
  projection: VendorWorkspaceProjection;
};

type GrowthRoute = {
  key: string;
  label: string;
  detail: string;
  href: string;
  priority: "primary" | "supporting";
};

function normalizePlanLabel(value: string) {
  const normalized = String(value || "free")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!normalized) return "Free";

  return normalized.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function resolveGrowthRoutes(
  projection: VendorWorkspaceProjection
): GrowthRoute[] {
  const routes: GrowthRoute[] = [];

  if (!projection.identity.profileComplete) {
    routes.push({
      key: "complete-profile",
      label: "Strengthen your business profile",
      detail:
        "Complete essential business information before spending on promotion or expansion.",
      href: "/onboarding/business",
      priority: "primary",
    });
  }

  if (projection.performance.replyRate < 80) {
    routes.push({
      key: "improve-response",
      label: "Improve buyer response",
      detail:
        "Faster and clearer replies can strengthen trust and improve deal progress.",
      href: "/dashboard/vendor/inbox",
      priority: "primary",
    });
  }

  if (projection.performance.visibilityScore < 80) {
    routes.push({
      key: "improve-visibility",
      label: "Improve marketplace visibility",
      detail:
        "Keep your profile, capabilities, prices and business activity current.",
      href: "/dashboard/vendor/workspace",
      priority: "primary",
    });
  }

  if (projection.identity.capabilityCount === 0) {
    routes.push({
      key: "add-capabilities",
      label: "Add products and capabilities",
      detail:
        "Declare what your business supplies or performs so matching can work accurately.",
      href: "/dashboard/vendor/master-data",
      priority: "primary",
    });
  }

  routes.push({
    key: "market-opportunities",
    label: "Review marketplace opportunities",
    detail:
      "Explore suitable demand around your business after completing urgent operational work.",
    href: "/vendor-opportunities",
    priority: "supporting",
  });

  routes.push({
    key: "price-updates",
    label: "Keep market prices current",
    detail:
      "Publish genuine price information that can help buyers understand your present offer.",
    href: "/vendor/price-updates/new",
    priority: "supporting",
  });

  routes.push({
    key: "growth-plan",
    label: "Review your present Growth Plan",
    detail:
      "Consider paid support only when it solves a real and measurable business need.",
    href: "/dashboard/subscription",
    priority: "supporting",
  });

  return routes.slice(0, 6);
}

function GrowthRouteCard({
  route,
}: {
  route: GrowthRoute;
}) {
  const primary = route.priority === "primary";

  return (
    <a
      href={route.href}
      style={{
        display: "block",
        minWidth: 0,
        padding: 15,
        border: primary
          ? "1px solid #c4b5fd"
          : "1px solid #e2e8f0",
        borderRadius: 16,
        background: primary ? "#ffffff" : "#fafafa",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          color: primary ? "#6d28d9" : "#475569",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {primary ? "Priority growth step" : "Supporting route"}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#1e1b4b",
          fontSize: 15,
          lineHeight: 1.35,
          fontWeight: 950,
        }}
      >
        {route.label}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.55,
          fontWeight: 700,
        }}
      >
        {route.detail}
      </div>
    </a>
  );
}

export default function VendorUnifiedGrowthCentre({
  projection,
}: VendorUnifiedGrowthCentreProps) {
  const routes = resolveGrowthRoutes(projection);

  const primaryCount = routes.filter(
    (route) => route.priority === "primary"
  ).length;

  const planLabel = normalizePlanLabel(
    projection.growth.plan
  );

  return (
    <section
      aria-labelledby="vendor-growth-centre-title"
      data-v6-unified-growth-centre="active"
      data-v6-growth-plan={projection.growth.plan}
      data-v6-priority-count={primaryCount}
      style={{
        marginBottom: 18,
        overflow: "hidden",
        border: "1px solid #ddd6fe",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(250,245,255,0.98), rgba(255,255,255,1))",
        boxShadow: "0 12px 30px rgba(109,40,217,0.07)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.45fr) minmax(min(100%, 245px), 0.55fr)",
          gap: 18,
          padding: 20,
          borderBottom: "1px solid #ede9fe",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#7c3aed",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Business Growth Operating Centre
          </div>

          <h2
            id="vendor-growth-centre-title"
            style={{
              margin: "7px 0 0",
              color: "#2e1065",
              fontSize: "clamp(22px, 2.5vw, 30px)",
              lineHeight: 1.2,
              fontWeight: 950,
            }}
          >
            What should help my business grow next?
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              maxWidth: 780,
              color: "#5b6472",
              fontSize: 13,
              lineHeight: 1.65,
              fontWeight: 700,
            }}
          >
            Complete the strongest practical improvement first.
            Promotion, paid plans and advanced assistance should
            follow only when they solve a genuine business need.
          </p>

          <div
            style={{
              marginTop: 12,
              maxWidth: 780,
              padding: 12,
              border: "1px solid #ddd6fe",
              borderRadius: 14,
              background: "#ffffff",
              color: "#5b21b6",
              fontSize: 12,
              lineHeight: 1.6,
              fontWeight: 800,
            }}
          >
            {projection.growth.guidance}
          </div>
        </div>

        <div
          style={{
            alignSelf: "stretch",
            padding: 16,
            border: "1px solid #c4b5fd",
            borderRadius: 18,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              color: "#7c3aed",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Present growth plan
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#4c1d95",
              fontSize: 25,
              lineHeight: 1.15,
              fontWeight: 950,
            }}
          >
            {planLabel}
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#6d28d9",
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 800,
            }}
          >
            Status:{" "}
            {normalizePlanLabel(
              projection.growth.status
            )}
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#64748b",
              fontSize: 12,
              lineHeight: 1.5,
              fontWeight: 700,
            }}
          >
            {primaryCount > 0
              ? `${primaryCount} practical improvement ${
                  primaryCount === 1 ? "is" : "are"
                } identified before expansion.`
              : "Your essential growth foundation is presently stable."}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: 12,
          padding: 20,
        }}
      >
        {routes.map((route) => (
          <GrowthRouteCard
            key={route.key}
            route={route}
          />
        ))}
      </div>
    </section>
  );
}
