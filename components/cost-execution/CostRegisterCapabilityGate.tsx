"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useMemberOperatingCapabilityProjection } from "@/lib/identity/useMemberOperatingCapabilityProjection";

export default function CostRegisterCapabilityGate({
  children,
  requestedMode,
}: {
  children: ReactNode;
  requestedMode: "product" | "project" | null;
}) {
  const {
    loading,
    error,
    hasCapability,
  } = useMemberOperatingCapabilityProjection();

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        Checking your 3BOS operating capability…
      </div>
    );
  }

  if (error) {
    return (
      <div style={noticeStyle}>
        <strong>Cost Register is temporarily unavailable.</strong>
        <span>{error}</span>
      </div>
    );
  }

  const canProduct = hasCapability("product_costing");
  const canProject = hasCapability("project_costing");

  const requestedAllowed =
    requestedMode === "product"
      ? canProduct
      : requestedMode === "project"
        ? canProject
        : canProduct || canProject;

  if (!requestedAllowed) {
    return (
      <div style={noticeStyle}>
        <strong>
          Cost Register is not active for your current business identity.
        </strong>
        <span>
          Operating capabilities are controlled from the canonical Identity
          Master. If your business work changes, use the appropriate verified
          identity rather than a different account role.
        </span>
        <Link href="/dashboard/workspace">
          Return to My 3BOS Workspace
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

const noticeStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 24,
  padding: 18,
  border: "1px solid #cbd5e1",
  borderRadius: 16,
  background: "#fff",
};
