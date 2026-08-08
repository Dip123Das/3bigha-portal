"use client";

import Link from "next/link";

import { useMemberOperatingCapabilityProjection } from "@/lib/identity/useMemberOperatingCapabilityProjection";

export default function OperatingCostWorkspacePanel() {
  const {
    loading,
    error,
    hasCapability,
  } = useMemberOperatingCapabilityProjection();

  const productCosting = hasCapability("product_costing");
  const projectCosting = hasCapability("project_costing");

  if (loading) {
    return (
      <section style={panelStyle}>
        <div style={eyebrowStyle}>Cost & Execution</div>
        <h2 style={titleStyle}>Checking your operating tools</h2>
        <p style={descriptionStyle}>
          Loading the capabilities assigned to your business identity.
        </p>
      </section>
    );
  }

  if (error || (!productCosting && !projectCosting)) {
    return null;
  }

  return (
    <section style={panelStyle} aria-labelledby="cost-execution-title">
      <div style={eyebrowStyle}>
        3BOS Operating Capability
      </div>

      <h2 id="cost-execution-title" style={titleStyle}>
        Cost & Execution
      </h2>

      <p style={descriptionStyle}>
        Keep actual production or project expenses before finished goods or
        property units move into your existing inventory.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 10,
          marginTop: 14,
        }}
      >
        {productCosting ? (
          <Link
            href="/dashboard/cost-register?mode=product"
            style={actionStyle}
          >
            <span>
              <strong style={actionTitleStyle}>
                Production Cost Register
              </strong>
              <small style={smallStyle}>
                Raw material, wages, electricity and every manufacturing cost.
              </small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}

        {projectCosting ? (
          <Link
            href="/dashboard/cost-register?mode=project"
            style={actionStyle}
          >
            <span>
              <strong style={actionTitleStyle}>
                Project Cost Register
              </strong>
              <small style={smallStyle}>
                BOQ, procurement, labour and actual construction expenditure.
              </small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}

        {projectCosting ? (
          <Link
            href="/construction-cost"
            style={actionStyle}
          >
            <span>
              <strong style={actionTitleStyle}>
                Estimate Construction
              </strong>
              <small style={smallStyle}>
                Use the existing estimate, BOQ and procurement calculator.
              </small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 18,
  border: "1px solid #c7d2fe",
  borderRadius: 20,
  background:
    "linear-gradient(135deg, #eef2ff 0%, #ffffff 62%)",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#4f46e5",
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 24,
  color: "#0f172a",
};

const descriptionStyle: React.CSSProperties = {
  margin: "7px 0 0",
  maxWidth: 760,
  color: "#475569",
  lineHeight: 1.6,
  fontWeight: 650,
};

const actionStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: 14,
  border: "1px solid #c7d2fe",
  borderRadius: 14,
  background: "#ffffff",
  textDecoration: "none",
  color: "#0f172a",
};

const actionTitleStyle: React.CSSProperties = {
  display: "block",
  fontSize: 15,
};

const smallStyle: React.CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "#64748b",
  lineHeight: 1.45,
};
