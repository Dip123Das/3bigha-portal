import type { VendorWorkspaceProjection } from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorUnifiedBusinessHealthProps = {
  projection: VendorWorkspaceProjection;
};

type HealthMetricProps = {
  label: string;
  value: string;
  detail: string;
  href?: string;
};

function HealthMetric({
  label,
  value,
  detail,
  href,
}: HealthMetricProps) {
  const content = (
    <>
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#0f172a",
          fontSize: 24,
          lineHeight: 1.1,
          fontWeight: 950,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 7,
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.55,
          fontWeight: 700,
        }}
      >
        {detail}
      </div>
    </>
  );

  const style = {
    display: "block",
    minWidth: 0,
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#ffffff",
    color: "inherit",
    textDecoration: "none",
  };

  return href ? (
    <a href={href} style={style}>
      {content}
    </a>
  ) : (
    <div style={style}>{content}</div>
  );
}

export default function VendorUnifiedBusinessHealth({
  projection,
}: VendorUnifiedBusinessHealthProps) {
  const {
    identity,
    readiness,
    performance,
  } = projection;

  const profileStatus = identity.profileComplete
    ? "Complete"
    : `${identity.profilePercent}%`;

  const healthGuidance =
    readiness.label === "Ready"
      ? "Your business foundation is ready. Maintain accurate information and consistent buyer responses."
      : readiness.label === "Needs attention"
      ? "Your business foundation is active, but profile, visibility or response performance needs attention."
      : "Complete the essential business foundation before focusing on advanced growth tools.";

  return (
    <section
      aria-labelledby="vendor-business-health-title"
      data-v5-unified-business-health="active"
      data-v5-readiness-label={readiness.label}
      style={{
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid #bae6fd",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(240,249,255,0.98), rgba(255,255,255,1))",
        boxShadow: "0 12px 30px rgba(14,116,144,0.07)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 1.4fr) minmax(min(100%, 250px), 0.6fr)",
          gap: 18,
          padding: 20,
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#0369a1",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Business Health Centre
          </div>

          <h2
            id="vendor-business-health-title"
            style={{
              margin: "7px 0 0",
              color: "#0f172a",
              fontSize: "clamp(22px, 2.5vw, 30px)",
              lineHeight: 1.2,
              fontWeight: 950,
            }}
          >
            Is my business foundation healthy?
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              maxWidth: 760,
              color: "#475569",
              fontSize: 13,
              lineHeight: 1.65,
              fontWeight: 700,
            }}
          >
            See the essential conditions that help buyers discover, trust and
            respond to your business.
          </p>

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 760,
              color: "#075985",
              fontSize: 12,
              lineHeight: 1.6,
              fontWeight: 800,
            }}
          >
            {healthGuidance}
          </p>
        </div>

        <div
          style={{
            alignSelf: "stretch",
            padding: 16,
            border: "1px solid #7dd3fc",
            borderRadius: 18,
            background: "#ffffff",
          }}
        >
          <div
            style={{
              color: "#0369a1",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Overall readiness
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#0c4a6e",
              fontSize: 34,
              lineHeight: 1,
              fontWeight: 950,
            }}
          >
            {readiness.score}%
          </div>

          <div
            style={{
              marginTop: 7,
              color: "#0369a1",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            {readiness.label}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
          gap: 12,
          padding: 20,
        }}
      >
        <HealthMetric
          label="Business profile"
          value={profileStatus}
          detail={
            identity.profileComplete
              ? "Your essential business information is complete."
              : "Complete your information to improve trust and matching."
          }
          href="/onboarding/business"
        />

        <HealthMetric
          label="Capabilities"
          value={String(identity.capabilityCount)}
          detail="Active business capabilities currently represented in your workspace."
          href="/dashboard/vendor/master-data"
        />

        <HealthMetric
          label="Marketplace visibility"
          value={`${performance.visibilityScore}%`}
          detail="How strongly your present business activity supports marketplace discovery."
          href="/dashboard/vendor/workspace"
        />

        <HealthMetric
          label="Buyer response"
          value={`${performance.replyRate}%`}
          detail="Your present response performance across buyer opportunities."
          href="/dashboard/vendor/inbox"
        />

        <HealthMetric
          label="Deal progress"
          value={`${performance.closeRate}%`}
          detail="Your present conversion performance from opportunity toward closure."
          href="/dashboard/vendor/enquiries"
        />
      </div>
    </section>
  );
}
