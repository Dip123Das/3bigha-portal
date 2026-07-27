"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";

type ProfileState = {
  display_name: string;
  phone_number: string;
  profile_photo_url: string;
  profile_photo_source: string;
  email: string;
  role: string;
  business_name: string;
  subscription_plan: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function firstSelfieUrl(value: unknown) {
  const assets = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];

  for (const asset of assets as Record<string, unknown>[]) {
    const url = clean(asset?.url || asset?.publicUrl);
    const path = clean(asset?.path);

    if (url && (!path || path.includes("/live-selfie/"))) {
      return url;
    }
  }

  return "";
}

function roleLabel(role: string) {
  const normalized = clean(role).toLowerCase().replace(/_/g, " ");

  if (!normalized) return "3Bigha Member";
  if (normalized === "hub vendor") return "Vendor Hub";
  if (normalized === "master admin") return "Master Administrator";

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function planLabel(plan: string) {
  const normalized = clean(plan || "free")
    .toLowerCase()
    .replace(/_vendor$/, "")
    .replace(/_/g, " ");

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Free";
}

type UnifiedProfileSettingsProps = {
  workspaceEmbedded?: boolean;
};

export default function UnifiedProfileSettings({
  workspaceEmbedded = false,
}: UnifiedProfileSettingsProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selfieFallback, setSelfieFallback] = useState("");
  const [photoAssets, setPhotoAssets] = useState<UploadedMediaAsset[]>([]);
  const [profile, setProfile] = useState<ProfileState>({
    display_name: "",
    phone_number: "",
    profile_photo_url: "",
    profile_photo_source: "",
    email: "",
    role: "",
    business_name: "",
    subscription_plan: "free",
  });

  const visiblePhoto =
    clean(profile.profile_photo_url) ||
    clean(photoAssets[0]?.url) ||
    selfieFallback;

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setMessage("");

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user?.id) {
        window.location.href = `/login?next=${encodeURIComponent("/settings")}`;
        return;
      }

      const [profileResult, businessResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name,phone_number,profile_photo_url,profile_photo_source,role"
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("business_profiles")
          .select(
            "business_name,selfie_media_json,subscription_plan"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!alive) return;

      const publicProfile = (profileResult.data || {}) as Record<string, any>;
      const business = (businessResult.data || {}) as Record<string, any>;
      const metadata = user.user_metadata || {};
      const fallbackName =
        clean(publicProfile.display_name) ||
        clean(metadata.full_name) ||
        clean(metadata.name) ||
        clean(business.business_name) ||
        clean(user.email?.split("@")[0]);

      setUserId(user.id);
      setSelfieFallback(firstSelfieUrl(business.selfie_media_json));
      setProfile({
        display_name: fallbackName,
        phone_number:
          clean(publicProfile.phone_number) ||
          clean(metadata.phone),
        profile_photo_url: clean(publicProfile.profile_photo_url),
        profile_photo_source: clean(publicProfile.profile_photo_source),
        email: clean(user.email),
        role: clean(publicProfile.role),
        business_name: clean(business.business_name),
        subscription_plan: clean(business.subscription_plan || "free"),
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
    } else {
      await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          phone: phoneNumber || null,
        },
      });
      setMessage("Profile details saved.");
      window.dispatchEvent(new Event("threebigha-profile-updated"));
    }

    setSaving(false);
  }

  async function handlePhotoChange(next: UploadedMediaAsset[]) {
    setPhotoAssets(next);

    const latest = next[next.length - 1];
    const url = clean(latest?.url);

    if (!userId || !url) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        profile_photo_url: url,
        profile_photo_source: "gallery_upload",
        profile_photo_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setMessage(error.message || "Profile photo could not be saved.");
      return;
    }

    setProfile((current) => ({
      ...current,
      profile_photo_url: url,
      profile_photo_source: "gallery_upload",
    }));
    setMessage("Profile photo updated. Registration evidence was not changed.");
    window.dispatchEvent(new Event("threebigha-profile-updated"));
  }

  async function useRegistrationSelfie() {
    if (!userId || !selfieFallback || saving) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        profile_photo_url: selfieFallback,
        profile_photo_source: "registration_selfie",
        profile_photo_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      setMessage(error.message || "The registration selfie could not be selected.");
    } else {
      setProfile((current) => ({
        ...current,
        profile_photo_url: selfieFallback,
        profile_photo_source: "registration_selfie",
      }));
      setMessage("Registration selfie selected as your public profile photo.");
      window.dispatchEvent(new Event("threebigha-profile-updated"));
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="font-black text-slate-900">Loading your profile…</div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {!workspaceEmbedded ? (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg">
              {visiblePhoto ? (
                <img
                  src={visiblePhoto}
                  alt={profile.display_name || "Profile photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-slate-500">
                  {(profile.display_name || profile.email || "3").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                My 3Bigha Identity
              </div>
              <h1 className="mt-1 text-2xl font-black text-slate-950">
                {profile.display_name || "3Bigha Member"}
              </h1>
              <div className="mt-1 text-sm font-bold text-slate-600">
                {roleLabel(profile.role)}
                {profile.business_name ? ` · ${profile.business_name}` : ""}
              </div>
              <div className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {planLabel(profile.subscription_plan)} Plan
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/onboarding/business"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800"
            >
              Edit Business Profile
            </Link>
            <Link
              href="/dashboard/subscription?source=settings&return=/settings"
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      </section>
      ) : null}

      <section id="workspace-personal-settings" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

      <section id="workspace-profile-photo" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Profile Photo
        </div>
        <h2 className="mt-2 text-xl font-black text-slate-950">
          Choose how people see you
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Your public profile photo is editable. Your original registration selfie
          remains preserved separately as verification evidence.
        </p>

        {selfieFallback ? (
          <button
            type="button"
            onClick={() => void useRegistrationSelfie()}
            disabled={saving}
            className="mt-4 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800"
          >
            Use My Verified Registration Selfie
          </button>
        ) : null}

        <UniversalMediaUploader
          module="vendor"
          folder={`vendor/profile-photo/${userId}/${Date.now()}`}
          value={photoAssets}
          onChange={(next) => void handlePhotoChange(next)}
          label="Upload a clear profile photo"
          helperText="Use a clear front-facing photo. This changes only the public profile picture."
          allowImages
          allowVideos={false}
          allowDocuments={false}
          maxFiles={1}
          cameraFacing="user"
          cameraGuide="face"
          cameraButtonLabel="Take Profile Photo"
        />
      </section>

      <section id="workspace-subscription" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          Subscription & Growth
        </div>
        <h2 className="mt-2 text-xl font-black text-slate-950">
          Current plan: {planLabel(profile.subscription_plan)}
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Review plan benefits, business visibility and available upgrade options.
        </p>
        <Link
          href="/dashboard/subscription?source=settings&return=/settings"
          className="mt-4 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
        >
          View Subscription & Upgrade
        </Link>
      </section>

      {message ? (
        <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-black text-blue-900">
          {message}
        </div>
      ) : null}
    </div>
  );
}
