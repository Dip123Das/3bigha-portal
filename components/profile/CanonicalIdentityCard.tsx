"use client";

import Link from "next/link";
import type { CanonicalIdentityProjection } from "@/lib/identity/resolveCanonicalIdentity";

type CanonicalIdentityCardProps = {
  identity: CanonicalIdentityProjection;
  subscriptionPlan?: string;
  showActions?: boolean;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function planLabel(value: unknown) {
  const normalized = clean(value || "free")
    .toLowerCase()
    .replace(/_vendor$/, "")
    .replace(/_/g, " ");

  return (
    normalized.replace(/\\b\\w/g, (letter) => letter.toUpperCase()) ||
    "Free"
  );
}

export default function CanonicalIdentityCard({
  identity,
  subscriptionPlan = "free",
  showActions = true,
}: CanonicalIdentityCardProps) {
  const photo =
    identity.verifiedSelfie && identity.verifiedSelfieUrl
      ? identity.verifiedSelfieUrl
      : "";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg">
            {photo ? (
              <img
                src={photo}
                alt={`${identity.registeredName} verified live selfie`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-black text-slate-500">
                {(identity.registeredName || identity.email || "3")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              My 3Bigha Identity
            </div>

            <h1 className="mt-1 text-2xl font-black text-slate-950">
              {identity.registeredName || "3Bigha Member"}
            </h1>

            <div className="mt-1 text-sm font-bold text-slate-600">
              {identity.primaryRole}
              {identity.businessName
                ? ` · ${identity.businessName}`
                : ""}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {planLabel(subscriptionPlan)} Plan
              </span>

              <span
                className={
                  identity.verifiedSelfie
                    ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                    : "inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                }
              >
                {identity.verifiedSelfie
                  ? "Verified Live Selfie"
                  : "Live Selfie Required"}
              </span>

              {identity.verifiedBusiness ? (
                <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                  Verified Business
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/onboarding/business"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800"
            >
              Edit Business Profile
            </Link>

            <Link
              href="/onboarding/business#sec-selfie"
              className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800"
            >
              Retake Verified Live Selfie
            </Link>

            <Link
              href="/dashboard/subscription?source=settings&return=/settings"
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white"
            >
              Upgrade Plan
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
