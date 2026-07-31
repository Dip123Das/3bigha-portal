import type {
  VendorWorkspaceNavigationGroup,
  VendorWorkspaceProjection,
} from "@/lib/3bos/vendor/resolve-vendor-workspace-projection";

type VendorWorkspaceNavigationProps = {
  projection: VendorWorkspaceProjection;
};

const groupStyles: Record<
  VendorWorkspaceNavigationGroup["key"],
  {
    border: string;
    background: string;
    accent: string;
    soft: string;
  }
> = {
  sell: {
    border: "#bbf7d0",
    background: "#f0fdf4",
    accent: "#047857",
    soft: "#dcfce7",
  },
  operate: {
    border: "#bfdbfe",
    background: "#eff6ff",
    accent: "#1d4ed8",
    soft: "#dbeafe",
  },
  grow: {
    border: "#ddd6fe",
    background: "#f5f3ff",
    accent: "#6d28d9",
    soft: "#ede9fe",
  },
  manage: {
    border: "#e2e8f0",
    background: "#f8fafc",
    accent: "#334155",
    soft: "#e2e8f0",
  },
};

export default function VendorWorkspaceNavigation({
  projection,
}: VendorWorkspaceNavigationProps) {
  const destinationCount = projection.navigation.reduce(
    (total, group) => total + group.items.length,
    0
  );

  return (
    <section
      aria-labelledby="vendor-workspace-navigation-title"
      data-v4-workspace-navigation="active"
      data-v4-navigation-group-count={projection.navigation.length}
      data-v4-navigation-destination-count={destinationCount}
      style={{
        marginBottom: 16,
        overflow: "hidden",
        border: "1px solid #cbd5e1",
        borderRadius: 24,
        background: "#ffffff",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          padding: 20,
          borderBottom: "1px solid #e2e8f0",
          background:
            "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(255,255,255,1))",
        }}
      >
        <div
          style={{
            color: "#334155",
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Workspace Navigation
        </div>

        <h2
          id="vendor-workspace-navigation-title"
          style={{
            margin: "7px 0 0",
            color: "#0f172a",
            fontSize: "clamp(22px, 2.5vw, 30px)",
            lineHeight: 1.2,
            fontWeight: 950,
          }}
        >
          Where do I go to run my business?
        </h2>

        <p
          style={{
            margin: "8px 0 0",
            maxWidth: 780,
            color: "#475569",
            fontSize: 13,
            lineHeight: 1.65,
            fontWeight: 700,
          }}
        >
          Choose the kind of work you want to perform. 3Bigha organises the
          workspace around real business activities instead of technical
          software modules.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 14,
          padding: 20,
        }}
      >
        {projection.navigation.map((group) => {
          const style = groupStyles[group.key];

          return (
            <section
              key={group.key}
              aria-labelledby={`vendor-workspace-group-${group.key}`}
              data-workspace-navigation-group={group.key}
              style={{
                minWidth: 0,
                padding: 15,
                border: `1px solid ${style.border}`,
                borderRadius: 19,
                background: style.background,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    flex: "0 0 auto",
                    borderRadius: 999,
                    background: style.accent,
                  }}
                />

                <h3
                  id={`vendor-workspace-group-${group.key}`}
                  style={{
                    margin: 0,
                    color: style.accent,
                    fontSize: 19,
                    fontWeight: 950,
                  }}
                >
                  {group.label}
                </h3>
              </div>

              <p
                style={{
                  margin: "7px 0 0",
                  minHeight: 42,
                  color: "#475569",
                  fontSize: 12,
                  lineHeight: 1.55,
                  fontWeight: 700,
                }}
              >
                {group.purpose}
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 9,
                  marginTop: 13,
                }}
              >
                {group.items.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    data-workspace-navigation-item={item.key}
                    style={{
                      display: "block",
                      minWidth: 0,
                      padding: 12,
                      border: `1px solid ${style.soft}`,
                      borderRadius: 14,
                      background: "#ffffff",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          color: "#0f172a",
                          fontSize: 13,
                          fontWeight: 950,
                        }}
                      >
                        {item.label}
                      </span>

                      <span
                        aria-hidden="true"
                        style={{
                          color: style.accent,
                          fontSize: 15,
                          fontWeight: 950,
                        }}
                      >
                        →
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        color: "#64748b",
                        fontSize: 11,
                        lineHeight: 1.5,
                        fontWeight: 700,
                      }}
                    >
                      {item.detail}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
