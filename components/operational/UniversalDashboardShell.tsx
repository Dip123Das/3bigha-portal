import React from "react";
import { Container } from "@/components/layout/Container";
import WorkflowContinuityBar from "@/components/workflow-continuity/WorkflowContinuityBar";
import OperationalEventStream from "@/components/operational-events/OperationalEventStream";

export default function UniversalDashboardShell({
  eyebrow,
  title,
  subtitle,
  children,
  workFirst = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  workFirst?: boolean;
}) {
  const header = (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 24,
        padding: 20,
        background: "linear-gradient(to bottom right,#f8fafc,#ffffff)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {eyebrow}
      </div>

      <h1
        style={{
          marginTop: 8,
          fontSize: 30,
          lineHeight: 1.15,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        {title}
      </h1>

      <p
        style={{
          marginTop: 10,
          maxWidth: 760,
          fontSize: 14,
          lineHeight: 1.7,
          color: "#475569",
          fontWeight: 650,
        }}
      >
        {subtitle}
      </p>
    </section>
  );

  return (
    <main className="w-full">
      <Container>
        {workFirst ? (
          <>
            {header}
            <WorkflowContinuityBar />
            {children}
            <OperationalEventStream title="Recent activity" limit={3} />
          </>
        ) : (
          <>
            <WorkflowContinuityBar />
            <OperationalEventStream title="Recent activity" limit={5} />
            {header}
            {children}
          </>
        )}
      </Container>
    </main>
  );
}
