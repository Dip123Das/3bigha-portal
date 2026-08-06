"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  resolveCanonicalIdentity,
  type CanonicalIdentityProjection,
} from "@/lib/identity/resolveCanonicalIdentity";
import CanonicalIdentityCard from "@/components/profile/CanonicalIdentityCard";

type EditableProfileState = {
  display_name: string;
  phone_number: string;
  email: string;
  subscription_plan: string;
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

export default function UnifiedProfileSettings() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [identity, setIdentity] =
    useState<CanonicalIdentityProjection | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState<EditableProfileState>({
    display_name: "",
    phone_number: "",
    email: "",
    subscription_plan: "free",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setMessage("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user?.id) {
        window.location.href =
          `/login?next=${encodeURIComponent("/settings")}`;
        return;
      }

      const canonical = await resolveCanonicalIdentity(supabase, user);

      if (!alive) return;

      const publicProfile =
        canonical.profile as Record<string, unknown>;
      const metadata =
        (user.user_metadata || {}) as Record<string, unknown>;

      setIdentity(canonical);
      setUserId(user.id);
      setProfile({
        display_name: canonical.registeredName,
        phone_number:
          clean(publicProfile.phone_number) ||
          clean(metadata.phone),
        email: clean(user.email),
        subscription_plan: clean(
          canonical.businessProfile.subscription_plan || "free"
        ),
      });
      setLoading(false);
    }

    void load();

    return () => {
      alive = false;
    };
  }, [supabase]);

  async function savePersonalDetails() {
    if (!userId || saving) return;

    setSaving(true);
    setMessage("");

    const displayName = clean(profile.display_name);
    const phoneNumber = clean(profile.phone_number);

    if (!displayName) {
      setMessage("Please enter your name.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        phone_number: phoneNumber || null,
      })
      .eq("id", userId);

    if (error) {
      setMessage(error.message || "Profile could not be saved.");
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: displayName,
        phone: phoneNumber || null,
      },
    });

    if (authError) {
      setMessage(
        authError.message ||
          "Profile was saved, but authentication metadata could not be updated."
      );
      setSaving(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (user?.id) {
      const refreshed = await resolveCanonicalIdentity(
        supabase,
        user
      );
      setIdentity(refreshed);
    }

    setMessage("Profile details saved.");
    window.dispatchEvent(
      new Event("threebigha-profile-updated")
    );
    setSaving(false);
  }

  if (loading || !identity) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="font-black text-slate-900">
          Loading your profile…
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <CanonicalIdentityCard
        identity={identity}
        subscriptionPlan={profile.subscription_plan}
      />

      <section
        id="personal"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Personal Profile
        </div>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Your name and contact details
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            Display name
            <input
              value={profile.display_name}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  display_name: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700">
            Phone number
            <input
              value={profile.phone_number}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  phone_number: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-blue-600"
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
            Login email
            <input
              value={profile.email}
              disabled
              className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-semibold text-slate-500"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => void savePersonalDetails()}
          disabled={saving}
          className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Personal Details"}
        </button>
      </section>

      <section
        id="photo"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Verified Profile Photograph
        </div>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Your live verification selfie is your profile photograph
        </h2>

        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          For trust and consistency, 3Bigha uses only the verified
          live-camera onboarding selfie across the portal. Gallery
          photographs cannot be used as profile photographs.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/onboarding/business#sec-selfie"
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
          >
            Retake Verified Live Selfie
          </Link>

          <span
            className={
              identity.verifiedSelfie
                ? "inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800"
                : "inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800"
            }
          >
            {identity.verifiedSelfie
              ? "Current selfie verified"
              : "Verified live selfie required"}
          </span>
        </div>
      </section>

      <section
        id="plan"
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Subscription & Growth
        </div>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Current plan: {planLabel(profile.subscription_plan)}
        </h2>

        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Review plan benefits, business visibility and available
          upgrade options.
        </p>

        <Link
          href="/dashboard/subscription?source=settings&return=/settings"
          className="mt-4 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
        >
          View Subscription & Upgrade
        </Link>
      </section>

      {message ? (
        <div
          role="status"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-black text-blue-900"
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
