"use client";

import Link from "next/link";
import {
  businessOsColors,
  businessOsRadius,
  businessOsShadow,
  businessOsSpacing,
  businessOsTone,
} from "@/lib/design/business-os-tokens";
import BusinessOsMetricGrid from "./BusinessOsMetricGrid";
import BusinessOsSection from "./BusinessOsSection";
import type {
  BusinessOsAction,
  BusinessOsJourneyStage,
  BusinessOsProjection,
} from "./types";

function ActionCard({
  action,
  compact = false,
}: {
  action: BusinessOsAction;
  compact?: boolean;
}) {
  const tone = businessOsTone[action.tone ?? "neutral"];

  return (
    <Link
      href={action.href}
      style={{
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: businessOsSpacing.sm,
        padding: compact ? "12px 13px" : "15px 16px",
        border: `1px solid ${tone.border}`,
        borderRadius: businessOsRadius.card,
        background: tone.background,
        color: businessOsColors.ink,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: businessOsSpacing.sm,
        }}
      >
        {action.icon ? (
          <span
            aria-hidden="true"
            style={{
              flex: "0 0 auto",
              display: "grid",
              placeItems: "center",
              width: compact ? 30 : 36,
              height: compact ? 30 : 36,
              borderRadius: 11,
              background: businessOsColors.surface,
              color: tone.foreground,
            }}
          >
            {action.icon}
          </span>
        ) : null}

        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "block",
              color: businessOsColors.ink,
              fontSize: compact ? 13 : 14,
              lineHeight: 1.3,
              fontWeight: 900,
            }}
          >
            {action.label}
          </span>

          {action.description ? (
            <span
              style={{
                display: "block",
                marginTop: 3,
                color: businessOsColors.muted,
                fontSize: compact ? 10 : 11,
                lineHeight: 1.4,
                fontWeight: 650,
              }}
            >
              {action.description}
            </span>
          ) : null}
        </span>
      </span>

      <span
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          color: tone.foreground,
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {action.count !== undefined ? (
          <span
            style={{
              minWidth: 28,
              padding: "5px 8px",
              borderRadius: businessOsRadius.pill,
              background: businessOsColors.surface,
              textAlign: "center",
            }}
          >
            {action.count}
          </span>
        ) : null}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function JourneyStage({
  stage,
  index,
  isLast,
}: {
  stage: BusinessOsJourneyStage;
  index: number;
  isLast: boolean;
}) {
  const statusTone =
    stage.status === "complete"
      ? businessOsTone.success
      : stage.status === "current"
        ? businessOsTone.primary
        : businessOsTone.neutral;

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <Link
        href={stage.href}
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "42px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: businessOsSpacing.sm,
          padding: "12px 13px",
          border: `1px solid ${statusTone.border}`,
          borderRadius: businessOsRadius.card,
          background: statusTone.background,
          color: businessOsColors.ink,
          textDecoration: "none",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: 12,
            background: businessOsColors.surface,
            color: statusTone.foreground,
            fontSize: 13,
            fontWeight: 950,
          }}
        >
          {stage.icon ?? index + 1}
        </span>

        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, lineHeight: 1.25, fontWeight: 900 }}>
            {stage.label}
          </span>
          {stage.description ? (
            <span
              style={{
                display: "block",
                marginTop: 3,
                color: businessOsColors.muted,
                fontSize: 10,
                lineHeight: 1.4,
                fontWeight: 650,
              }}
            >
              {stage.description}
            </span>
          ) : null}
        </span>

        <span aria-hidden="true" style={{ color: statusTone.foreground, fontWeight: 950 }}>
          →
        </span>
      </Link>

      {!isLast ? (
        <div
          aria-hidden="true"
          style={{
            width: 2,
            height: 10,
            margin: "0 0 0 31px",
            background: businessOsColors.line,
          }}
        />
      ) : null}
    </div>
  );
}

export default function BusinessOsRenderer({
  projection,
}: {
  projection: BusinessOsProjection;
}) {
  const { identity } = projection;

  return (
    <div
      data-business-os-renderer="true"
      style={{
        display: "grid",
        gap: businessOsSpacing.md,
        minWidth: 0,
        paddingBottom: projection.mobileNavigation?.length ? 86 : 0,
      }}
    >
      <section
        style={{
          minWidth: 0,
          border: "1px solid #bfdbfe",
          borderRadius: businessOsRadius.panel,
          background:
            "linear-gradient(135deg, rgba(239,246,255,1) 0%, rgba(219,234,254,1) 58%, rgba(224,231,255,1) 100%)",
          boxShadow: businessOsShadow.card,
          padding: businessOsSpacing.lg,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: identity.imageUrl ? "64px minmax(0, 1fr)" : "minmax(0, 1fr)",
            gap: businessOsSpacing.md,
            alignItems: "center",
          }}
        >
          {identity.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={identity.imageUrl}
              alt=""
              width={64}
              height={64}
              style={{
                width: 64,
                height: 64,
                objectFit: "cover",
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.9)",
                boxShadow: "0 0 0 2px rgba(217,119,6,0.45)",
              }}
            />
          ) : null}

          <div style={{ minWidth: 0 }}>
            {identity.eyebrow ? (
              <div
                style={{
                  color: businessOsColors.primary,
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {identity.eyebrow}
              </div>
            ) : null}

            <h1
              style={{
                margin: identity.eyebrow ? "5px 0 0" : 0,
                color: businessOsColors.ink,
                fontSize: "clamp(24px, 4vw, 34px)",
                lineHeight: 1.1,
                fontWeight: 950,
              }}
            >
              {identity.title}
            </h1>

            {identity.subtitle ? (
              <p
                style={{
                  margin: "5px 0 0",
                  color: businessOsColors.muted,
                  fontSize: 12,
                  lineHeight: 1.5,
                  fontWeight: 700,
                }}
              >
                {identity.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {identity.trustLabels?.length ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              marginTop: businessOsSpacing.md,
            }}
          >
            {identity.trustLabels.map((label) => (
              <span
                key={label}
                style={{
                  padding: "6px 9px",
                  border: "1px solid #bbf7d0",
                  borderRadius: businessOsRadius.pill,
                  background: "rgba(240,253,244,0.92)",
                  color: businessOsColors.success,
                  fontSize: 10,
                  fontWeight: 900,
                }}
              >
                ✓ {label}
              </span>
            ))}
          </div>
        ) : null}

        {projection.primaryAction ? (
          <Link
            href={projection.primaryAction.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: businessOsSpacing.sm,
              marginTop: businessOsSpacing.md,
              padding: "14px 16px",
              borderRadius: businessOsRadius.control,
              background: businessOsColors.primary,
              boxShadow: "0 8px 20px rgba(23,103,239,0.24)",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 950,
            }}
          >
            <span>{projection.primaryAction.label}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </section>

      <BusinessOsSection eyebrow="Work now" title="Run your business">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: businessOsSpacing.sm,
          }}
        >
          {projection.workNow.map((action) => (
            <ActionCard key={action.key} action={action} />
          ))}
        </div>
      </BusinessOsSection>

      <BusinessOsSection
        eyebrow="Business lifecycle"
        title="Move work towards completion"
        description="Follow each stage from opportunity to payment."
      >
        <div>
          {projection.journey.map((stage, index) => (
            <JourneyStage
              key={stage.key}
              stage={stage}
              index={index}
              isLast={index === projection.journey.length - 1}
            />
          ))}
        </div>
      </BusinessOsSection>

      <BusinessOsSection eyebrow="Human-first work" title="Today's priorities">
        <div style={{ display: "grid", gap: businessOsSpacing.sm }}>
          {projection.priorities.map((action) => (
            <ActionCard key={action.key} action={action} compact />
          ))}
        </div>
      </BusinessOsSection>

      <BusinessOsSection eyebrow="Business pulse" title="Business activity">
        <BusinessOsMetricGrid items={projection.pulse} />
      </BusinessOsSection>

      {projection.assistance ? (
        <section
          style={{
            minWidth: 0,
            border: "1px solid #bbf7d0",
            borderRadius: businessOsRadius.panel,
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            boxShadow: businessOsShadow.card,
            padding: businessOsSpacing.lg,
          }}
        >
          <div
            style={{
              color: businessOsColors.success,
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {projection.assistance.eyebrow ?? "3BOS assistance"}
          </div>
          <h2
            style={{
              margin: "5px 0 0",
              color: businessOsColors.ink,
              fontSize: 20,
              lineHeight: 1.25,
              fontWeight: 900,
            }}
          >
            {projection.assistance.title}
          </h2>
          {projection.assistance.description ? (
            <p
              style={{
                margin: "6px 0 0",
                color: businessOsColors.muted,
                fontSize: 12,
                lineHeight: 1.5,
                fontWeight: 650,
              }}
            >
              {projection.assistance.description}
            </p>
          ) : null}
          {projection.assistance.action ? (
            <Link
              href={projection.assistance.action.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: businessOsSpacing.sm,
                color: businessOsColors.ink,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {projection.assistance.action.label} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </section>
      ) : null}

      {projection.mobileNavigation?.length ? (
        <nav
          aria-label="Business workspace"
          style={{
            position: "fixed",
            zIndex: 80,
            left: "max(12px, env(safe-area-inset-left))",
            right: "max(12px, env(safe-area-inset-right))",
            bottom: "max(12px, env(safe-area-inset-bottom))",
            display: "grid",
            gridTemplateColumns: `repeat(${projection.mobileNavigation.length}, minmax(0, 1fr))`,
            gap: 5,
            maxWidth: 560,
            margin: "0 auto",
            padding: "9px 8px",
            border: `1px solid ${businessOsColors.line}`,
            borderRadius: 20,
            background: "rgba(255,255,255,0.96)",
            boxShadow: businessOsShadow.floating,
            backdropFilter: "blur(14px)",
          }}
        >
          {projection.mobileNavigation.map((action) => (
            <Link
              key={action.key}
              href={action.href}
              style={{
                minWidth: 0,
                display: "grid",
                placeItems: "center",
                gap: 3,
                padding: "5px 3px",
                color: businessOsColors.ink,
                textDecoration: "none",
                fontSize: 9,
                lineHeight: 1.2,
                fontWeight: 850,
                textAlign: "center",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 15 }}>
                {action.icon ?? "•"}
              </span>
              <span>{action.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
