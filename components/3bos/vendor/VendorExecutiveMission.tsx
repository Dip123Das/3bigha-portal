import type {
  VendorWorkspaceProjection,
} from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorExecutiveMissionProps = {
  projection: VendorWorkspaceProjection;
};

export default function VendorExecutiveMission({
  projection,
}: VendorExecutiveMissionProps) {


  return (
    <section
      aria-labelledby="vendor-executive-mission-title"
      data-v1c-executive-mission="active"
      style={{
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid #bfdbfe",
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(255,255,255,0.98) 55%, rgba(238,242,255,0.96))",
        boxShadow: "0 14px 34px rgba(37,99,235,0.09)",
      }}
    >
      <div
        style={{
          padding: 20,
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 420px" }}>
            <div
              style={{
                color: "#1d4ed8",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Executive Mission
            </div>

            <h1
              id="vendor-executive-mission-title"
              style={{
                margin: "7px 0 0",
                color: "#0f172a",
                fontSize: "clamp(24px, 3vw, 34px)",
                lineHeight: 1.15,
                fontWeight: 950,
              }}
            >
              Run today&apos;s business from one clear place
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                maxWidth: 760,
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.65,
                fontWeight: 650,
              }}
            >
              Review the work that needs human attention first. Business
              signals and AI guidance remain available to support your final
              decision.
            </p>
          </div>

          <div
            style={{
              flex: "0 1 280px",
              minWidth: 230,
              padding: 14,
              border: "1px solid #bbf7d0",
              borderRadius: 18,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Business readiness
            </div>

            <div
              style={{
                marginTop: 5,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <strong
                style={{
                  color: "#047857",
                  fontSize: 28,
                  lineHeight: 1,
                  fontWeight: 950,
                }}
              >
                {projection.readiness.score}/100
              </strong>

              <span
                style={{
                  color: "#047857",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {projection.readiness.label}
              </span>
            </div>

            <div
              aria-hidden="true"
              style={{
                marginTop: 10,
                height: 7,
                overflow: "hidden",
                borderRadius: 999,
                background: "#dcfce7",
              }}
            >
              <div
                style={{
                  width: `${projection.readiness.score}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "#10b981",
                }}
              />
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#475569",
                fontSize: 12,
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              {projection.identity.title} ·{" "}
              {projection.identity.capabilityCount} active business{" "}
              {projection.identity.capabilityCount === 1
                ? "segment"
                : "segments"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
          padding: 20,
        }}
      >
        <div>
          <div
            style={{
              marginTop: 10,
              padding: 13,
              border: "1px solid #ddd6fe",
              borderRadius: 16,
              background: "#f5f3ff",
            }}
          >
            <div
              style={{
                color: "#6d28d9",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Business guidance
            </div>

            <div
              style={{
                marginTop: 5,
                color: "#4c1d95",
                fontSize: 12,
                lineHeight: 1.55,
                fontWeight: 750,
              }}
            >
              {projection.growth.guidance}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
