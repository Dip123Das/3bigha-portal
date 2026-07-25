"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import styles from "./BusinessIdentityCenter.module.css";

type BusinessProfileSnapshot = {
  user_id?: string | null;
  business_name?: string | null;
  business_type?: string | null;
  nature_of_business?: string[] | null;

  contact_person?: string | null;
  author_display_name?: string | null;

  phone_primary?: string | null;
  email_business?: string | null;

  address_line1?: string | null;
  address_line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;

  verified_locality?: string | null;
  verified_district?: string | null;
  verified_state?: string | null;
  verified_postcode?: string | null;
  location_verification_status?: string | null;

  is_complete?: boolean | null;
  completion_score?: number | string | null;
  missing_fields?: string[] | null;

  business_media_json?: unknown;
  vendor_document_verification_json?: unknown;
};

type BusinessIdentityCenterProps = {
  compact?: boolean;
  onboardingHref?: string;
};

function text(value: unknown) {
  return String(value || "").trim();
}

function safeStringArray(
  value: unknown
): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => text(item))
        .filter(Boolean)
    : [];
}

function clampPercent(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(parsed))
  );
}

function activityLabel(value: string) {
  const labels: Record<string, string> = {
    property: "Property",
    materials: "Materials",
    services: "Services",
    rentals: "Rentals",
    blog: "Blog and knowledge",
  };

  return (
    labels[value] ||
    value
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function businessIdentityLabel(
  profile: BusinessProfileSnapshot
) {
  const activities = safeStringArray(
    profile.nature_of_business
  );

  if (
    ["property", "materials", "services", "rentals"]
      .every((item) => activities.includes(item))
  ) {
    return "Vendor Hub";
  }

  if (
    activities.includes("property") &&
    activities.length === 1
  ) {
    return "Property Business";
  }

  if (
    activities.includes("materials") &&
    activities.length === 1
  ) {
    return "Materials Business";
  }

  if (
    activities.includes("services") &&
    activities.length === 1
  ) {
    return "Service Business";
  }

  if (
    activities.includes("rentals") &&
    activities.length === 1
  ) {
    return "Rental Business";
  }

  if (
    activities.includes("blog") &&
    activities.length === 1
  ) {
    return "Author / Knowledge Contributor";
  }

  if (activities.length > 1) {
    return "Multi-activity Business";
  }

  const explicitType = text(
    profile.business_type
  );

  return explicitType
    ? activityLabel(explicitType)
    : "3Bigha Business Member";
}

function resolvedLocation(
  profile: BusinessProfileSnapshot
) {
  const parts = [
    profile.verified_locality ||
      profile.city,
    profile.verified_district ||
      profile.district,
    profile.verified_state ||
      profile.state,
    profile.verified_postcode ||
      profile.pincode,
  ]
    .map(text)
    .filter(
      (item, index, collection) =>
        item &&
        collection.indexOf(item) === index
    );

  return parts.join(", ");
}

function humanName(
  profile: BusinessProfileSnapshot,
  fallbackEmail: string
) {
  return (
    text(profile.contact_person) ||
    text(profile.author_display_name) ||
    fallbackEmail ||
    "3Bigha member"
  );
}

function businessName(
  profile: BusinessProfileSnapshot
) {
  return (
    text(profile.business_name) ||
    text(profile.author_display_name) ||
    "Your business identity"
  );
}

function readableMissingField(
  value: string
) {
  const labels: Record<string, string> = {
    business_name: "business name",
    contact_person: "contact person",
    phone_primary: "primary phone",
    email_business: "business email",
    address_line1: "business address",
    nature_of_business:
      "business activities",
    about_person: "information about you",
    about_business:
      "information about the business",
    business_media_json:
      "business photographs and proof",
  };

  return (
    labels[value] ||
    value
      .replace(/[_-]+/g, " ")
      .toLowerCase()
  );
}

export default function BusinessIdentityCenter({
  compact = false,
  onboardingHref =
    "/onboarding/business?returnTo=/dashboard/workspace",
}: BusinessIdentityCenterProps) {
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  const [loading, setLoading] =
    useState(true);
  const [profile, setProfile] =
    useState<BusinessProfileSnapshot | null>(
      null
    );
  const [accountEmail, setAccountEmail] =
    useState("");
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadIdentity() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: userData,
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        const user = userData.user;

        if (!user?.id) {
          if (active) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        if (active) {
          setAccountEmail(
            text(user.email)
          );
        }

        const {
          data,
          error: profileError,
        } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!active) return;

        setProfile(
          (data as BusinessProfileSnapshot | null) ??
            null
        );
      } catch (loadError: any) {
        if (!active) return;

        setError(
          loadError?.message ||
            "Your business identity could not be loaded."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadIdentity();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <section
        className={styles.center}
        aria-label="Loading business identity"
      >
        <div className={styles.loadingHeader}>
          <div
            className={styles.loadingAvatar}
          />
          <div className={styles.loadingLines}>
            <span />
            <span />
          </div>
        </div>

        <div className={styles.loadingGrid}>
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={`${styles.center} ${styles.notice}`}
        aria-label="Business identity"
      >
        <div>
          <span className={styles.eyebrow}>
            My Business Identity
          </span>
          <h2>
            Your identity needs attention
          </h2>
          <p>{error}</p>
        </div>

        <Link
          href={onboardingHref}
          className={styles.primaryAction}
        >
          Review business profile
        </Link>
      </section>
    );
  }

  if (!profile) {
    return (
      <section
        className={`${styles.center} ${styles.notice}`}
        aria-label="Business identity"
      >
        <div>
          <span className={styles.eyebrow}>
            My Business Identity
          </span>
          <h2>
            Introduce your business to
            3Bigha
          </h2>
          <p>
            Add truthful information about
            yourself, your business and the
            work you provide. You remain in
            control of every declaration.
          </p>
        </div>

        <Link
          href={onboardingHref}
          className={styles.primaryAction}
        >
          Create business identity
        </Link>
      </section>
    );
  }

  const activities = safeStringArray(
    profile.nature_of_business
  );

  const completion = clampPercent(
    profile.completion_score
  );

  const missingFields = safeStringArray(
    profile.missing_fields
  );

  const location = resolvedLocation(
    profile
  );

  const locationVerified =
    text(
      profile.location_verification_status
    ).toLowerCase() === "verified";

  const displayHumanName = humanName(
    profile,
    accountEmail
  );

  const displayBusinessName =
    businessName(profile);

  const initials = displayBusinessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");

  return (
    <section
      className={`${styles.center} ${
        compact ? styles.compact : ""
      }`}
      aria-labelledby="business-identity-title"
    >
      <header className={styles.header}>
        <div className={styles.identitySummary}>
          <div
            className={styles.identityMark}
            aria-hidden="true"
          >
            {initials || "3B"}
          </div>

          <div className={styles.identityText}>
            <span className={styles.eyebrow}>
              My Business Identity
            </span>

            <h2 id="business-identity-title">
              {displayBusinessName}
            </h2>

            <p>
              Represented by{" "}
              <strong>
                {displayHumanName}
              </strong>
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <span
            className={
              locationVerified
                ? styles.verifiedBadge
                : styles.pendingBadge
            }
          >
            {locationVerified
              ? "Location verified"
              : "Location pending"}
          </span>

          <Link
            href={onboardingHref}
            className={styles.primaryAction}
          >
            Improve business profile
          </Link>
        </div>
      </header>

      <div className={styles.identityGrid}>
        <article className={styles.factCard}>
          <span>Business identity</span>
          <strong>
            {businessIdentityLabel(
              profile
            )}
          </strong>
          <small>
            Based on your own declared
            activities
          </small>
        </article>

        <article className={styles.factCard}>
          <span>Official location</span>
          <strong>
            {location ||
              "Location not completed"}
          </strong>
          <small>
            {locationVerified
              ? "Verified through the location journey"
              : "Complete location verification"}
          </small>
        </article>

        <article className={styles.factCard}>
          <span>Business contact</span>
          <strong>
            {text(profile.phone_primary) ||
              text(
                profile.email_business
              ) ||
              accountEmail ||
              "Contact not completed"}
          </strong>
          <small>
            Used for legitimate business
            communication
          </small>
        </article>
      </div>

      <div className={styles.lowerGrid}>
        <article
          className={styles.activitiesCard}
        >
          <div>
            <span className={styles.cardLabel}>
              What this business does
            </span>
            <h3>
              Declared business activities
            </h3>
          </div>

          {activities.length ? (
            <div
              className={styles.activityList}
            >
              {activities.map((activity) => (
                <span key={activity}>
                  {activityLabel(activity)}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>
              No business activity has been
              declared yet.
            </p>
          )}
        </article>

        <article
          className={styles.completionCard}
        >
          <div
            className={styles.completionHeader}
          >
            <div>
              <span
                className={styles.cardLabel}
              >
                Profile readiness
              </span>
              <h3>
                {completion}% complete
              </h3>
            </div>

            <strong
              aria-label={`${completion} percent complete`}
            >
              {completion}%
            </strong>
          </div>

          <div
            className={styles.progressTrack}
            aria-hidden="true"
          >
            <span
              style={{
                width: `${completion}%`,
              }}
            />
          </div>

          {missingFields.length ? (
            <p className={styles.missingText}>
              Next:{" "}
              {missingFields
                .slice(0, 2)
                .map(readableMissingField)
                .join(" and ")}
              {missingFields.length > 2
                ? ` and ${
                    missingFields.length - 2
                  } more`
                : ""}
              .
            </p>
          ) : (
            <p className={styles.readyText}>
              Your core business profile is
              complete.
            </p>
          )}
        </article>
      </div>

      <footer className={styles.footer}>
        <p>
          This identity is built from
          information you provided. 3Bigha
          does not invent or silently change
          your business identity.
        </p>

        <Link href={onboardingHref}>
          Review all identity details
          <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </section>
  );
}
