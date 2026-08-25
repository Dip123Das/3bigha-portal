// app/property/builder/projects/add/page.tsx
"use client";

import AddressEngine, { type AddressEngineValue } from "@/components/geography/AddressEngine";
import { addressEngineToBuilderProjectPayload } from "@/lib/geography/addressAdapters";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  loadVendorListingMemory,
  saveVendorListingMemory,
  type VendorListingMemoryRow,
} from "@/lib/vendors/vendorListingMemory";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";

type BuilderProfileRow = {
  id: string;
  owner_user_id?: string | null;
  brand_name?: string | null;
  legal_name?: string | null;
  status?: string | null;
};

type BuilderProjectInsert = {
  builder_profile_id: string;
  name: string;
  slug: string;
  investment_plan_master_id?: string | null;

  project_kind?: string | null;
  description?: string | null;

  address_line?: string | null;
  locality?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;

  geo_state_id?: string | null;
  geo_district_id?: string | null;
  geo_subdivision_id?: string | null;
  geo_block_id?: string | null;
  geo_place_id?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  rera_id?: string | null;
  launch_date?: string | null; // YYYY-MM-DD
  possession_date?: string | null; // YYYY-MM-DD

  status?: string | null;
};

function slugify(input: string): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function friendlyDbError(err: any): string {
  return String(err?.message ?? err?.hint ?? err?.details ?? err ?? "Unknown error");
}

function parseNumber(input: string): number | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseDateYYYYMMDD(input: string): string | null {
  const s = String(input ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function parseGoogleMapsLinkToLatLng(url: string): { lat: number; lng: number } | null {
  const s = String(url ?? "").trim();
  if (!s) return null;

  // Pattern: .../@lat,lng,...
  const atMatch = s.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
  if (atMatch) {
    const lat = Number(atMatch[1]);
    const lng = Number(atMatch[3]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  // Pattern: ...?q=lat,lng or ...?query=lat,lng
  const qMatch = s.match(/[?&](q|query)=(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
  if (qMatch) {
    const lat = Number(qMatch[2]);
    const lng = Number(qMatch[4]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

type Flash = { kind: "success" | "error"; message: string } | null;

type AmenityRow = { id: string; name: string; slug: string; category: string | null; sort_order?: number | null };

type InvestmentPlanRow = {
  id: string;
  title: string;
  category: "cash_investment" | "joint_venture_land" | "hybrid";
  public_label: string | null;
  highlight_text: string | null;
  roi_summary: string | null;
  risk_level: "low" | "moderate" | "high";
  status: "draft" | "active" | "inactive";
};

export default function BuilderAddProjectPage() {
  const router = useRouter();

  // Fix TS2589 (keep as in your project)
  const supabase: any = useMemo(() => {
    const factory: any = getSupabaseBrowser as any;
    return factory();
  }, []);

  const [loading, setLoading] = useState(true);
  const [addressEngineValue, setAddressEngineValue] = useState<AddressEngineValue>({});
  const [globalError, setGlobalError] = useState("");

  const [flash, setFlash] = useState<Flash>(null);
  function flashSuccess(message: string) {
    setFlash({ kind: "success", message });
    if (typeof window !== "undefined") window.setTimeout(() => setFlash(null), 4000);
  }
  function flashError(message: string) {
    setFlash({ kind: "error", message });
    if (typeof window !== "undefined") window.setTimeout(() => setFlash(null), 7000);
  }

  const [userId, setUserId] = useState<string>("");
  const [builder, setBuilder] = useState<BuilderProfileRow | null>(null);

  const [recentProjectMemory, setRecentProjectMemory] = useState<
    VendorListingMemoryRow[]
  >([]);

  // form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [projectKind, setProjectKind] = useState<string>("residential");

  // ✅ moved to bottom UI, but state stays here
  const [description, setDescription] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [addressLine, setAddressLine] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [mapLink, setMapLink] = useState<string>("");

  // ✅ human-friendly location description + preview link
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [mapsPreviewUrl, setMapsPreviewUrl] = useState<string>("");

  const [reraId, setReraId] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [possessionDate, setPossessionDate] = useState("");

  // ✅ project media inputs
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);

  // ✅ amenities master + selected
  const [amenities, setAmenities] = useState<AmenityRow[]>([]);
  const [selectedProjectAmenityIds, setSelectedProjectAmenityIds] = useState<string[]>([]);
  const [showAmenities, setShowAmenities] = useState(false);

  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlanRow[]>([]);
  const [selectedInvestmentPlanId, setSelectedInvestmentPlanId] = useState<string>("");

  // (kept from your file, not used for DB now)
  const [amenitiesText, setAmenitiesText] = useState<string>("");
  const [amenitiesStatusNote, setAmenitiesStatusNote] = useState<string>("");

  // ✅ NEW: Nearby highlights (text)
  const [nearbyHighlights, setNearbyHighlights] = useState<string>("");

  const [saving, setSaving] = useState(false);

  // ✅ Gate AI button only after basic + amenities + location
  const readyForAi = useMemo(() => {
    const hasBasics = Boolean(name.trim() && (projectKind || "").trim());
    const hasAmenities = selectedProjectAmenityIds.length > 0;

    const hasLocationText = Boolean(city.trim() || locality.trim() || district.trim() || stateName.trim());
    const hasLatLng = Boolean(latitude.trim() && longitude.trim());

    return hasBasics && hasAmenities && (hasLocationText || hasLatLng);
  }, [name, projectKind, selectedProjectAmenityIds, city, locality, district, stateName, latitude, longitude]);

    async function loadInvestmentPlans() {
    const { data, error } = await supabase
      .from("investment_plan_master")
      .select("id,title,category,public_label,highlight_text,roi_summary,risk_level,status")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    setInvestmentPlans((data ?? []) as InvestmentPlanRow[]);
    return data ?? [];
  }

  async function loadAmenitiesMaster() {
    const { data, error } = await supabase
      .from("amenities_master")
      .select("id,name,slug,category,sort_order")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    setAmenities((data ?? []) as any);

    // default: select all amenities (only if user hasn't manually changed)
    setSelectedProjectAmenityIds((prev) => {
      if (prev.length > 0) return prev;
      return (data ?? []).map((r: any) => String(r.id));
    });
  }

  function toggleProjectAmenity(id: string) {
    setSelectedProjectAmenityIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }


  useEffect(() => {
    let alive = true;

    async function loadRecentProjectMemory() {
      if (!userId) return;

      const rows = await loadVendorListingMemory({
        userId,
        module: "property",
        memoryType: "workflow",
        limit: 8,
      });

      if (!alive) return;

      setRecentProjectMemory(rows);
    }

    loadRecentProjectMemory();

    return () => {
      alive = false;
    };
  }, [userId]);


  function applyProjectMemory(memory: VendorListingMemoryRow) {
    const payload = memory.payload ?? {};

    setProjectKind(payload.project_kind ?? "residential");

    setAddressLine(payload.address_line ?? "");
    setLocality(payload.locality ?? "");
    setCity(payload.city ?? "");
    setDistrict(payload.district ?? "");
    setStateName(payload.state ?? "");
    setPincode(payload.pincode ?? "");

    setReraId(payload.rera_id ?? "");

    setNearbyHighlights(payload.nearby_highlights ?? "");

    if (payload.description_template) {
      setDescription(payload.description_template);
    }

    if (Array.isArray(payload.amenity_ids)) {
      setSelectedProjectAmenityIds(payload.amenity_ids);
    }

    if (payload.investment_plan_master_id) {
      setSelectedInvestmentPlanId(payload.investment_plan_master_id);
    }
  }

  // bootstrap
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setGlobalError("");

      try {
        const uRes = await supabase.auth.getUser();
        const uid = String(uRes?.data?.user?.id ?? "");

        if (!uid) {
          if (!cancelled) {
            setUserId("");
            setBuilder(null);
            setGlobalError("You are not logged in.");
          }
          return;
        }

        const bpRes = await supabase
          .from("business_profiles")
          .select("user_id,is_complete,business_name")
          .eq("user_id", uid)
          .maybeSingle();

        if (bpRes.error) {
          if (!cancelled) {
            setUserId(uid);
            setBuilder(null);
            setGlobalError(friendlyDbError(bpRes.error));
          }
          return;
        }

        const bp = bpRes.data as any;
        const isComplete = !!bp?.is_complete;

        if (!isComplete) {
          const returnTo = "/property/builder/projects/add";
          router.replace(`/onboarding/business?returnTo=${encodeURIComponent(returnTo)}`);
          return;
        }

        const ensureRes = await supabase.rpc("ensure_builder_profile");
        if (ensureRes.error) {
          if (!cancelled) {
            setUserId(uid);
            setBuilder(null);
            setGlobalError(`Could not ensure builder profile — ${friendlyDbError(ensureRes.error)}`);
          }
          return;
        }

        const bRes = await supabase
          .from("builder_profiles")
          .select("id,owner_user_id,brand_name,legal_name,status")
          .eq("owner_user_id", uid)
          .maybeSingle();

        if (bRes.error) {
          if (!cancelled) {
            setUserId(uid);
            setBuilder(null);
            setGlobalError(friendlyDbError(bRes.error));
          }
          return;
        }

        if (!cancelled) {
          setUserId(uid);
          setBuilder((bRes.data ?? null) as BuilderProfileRow | null);

          const results = await Promise.allSettled([
            loadAmenitiesMaster(),
            loadInvestmentPlans(),
          ]);

          const amenityResult = results[0];
          const planResult = results[1];

          if (amenityResult.status === "rejected") {
            setGlobalError((prev) =>
              prev
                ? `${prev}\nCould not load amenities — ${friendlyDbError(amenityResult.reason)}`
                : `Could not load amenities — ${friendlyDbError(amenityResult.reason)}`
            );
          }

          if (planResult.status === "rejected") {
            setGlobalError((prev) =>
              prev
                ? `${prev}\nCould not load investment plans — ${friendlyDbError(planResult.reason)}`
                : `Could not load investment plans — ${friendlyDbError(planResult.reason)}`
            );
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setGlobalError(friendlyDbError(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  // auto-slug from name (if slug empty)
  useEffect(() => {
    if (!name.trim()) return;
    if (slug.trim()) return;
    setSlug(slugify(name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  function setLatLngAndPreview(lat: number, lng: number) {
    setLatitude(String(lat));
    setLongitude(String(lng));
    setMapsPreviewUrl(`https://www.google.com/maps?q=${lat},${lng}`);
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      setLocationLabel("Looking up place…");
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`;

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Reverse geocode failed");

      const data: any = await res.json();
      const label = String(data?.display_name ?? "").trim();
      setLocationLabel(label || "Location set (no label returned). Please confirm on map preview.");
    } catch {
      setLocationLabel("Location set, but address lookup failed. Please confirm on map preview.");
    }
  }

  function applyMapLink() {
    const parsed = parseGoogleMapsLinkToLatLng(mapLink);
    if (!parsed) {
      flashError("Could not parse lat/lng from the map link. Paste a link containing @lat,lng.");
      return;
    }
    setLatLngAndPreview(parsed.lat, parsed.lng);
    reverseGeocode(parsed.lat, parsed.lng);
    flashSuccess("Location extracted from map link.");
  }

  async function useMyLocation() {
    setGlobalError("");
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      flashError("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setLatLngAndPreview(lat, lng);
        reverseGeocode(lat, lng);

        flashSuccess("Location set from your device. Please confirm below.");
      },
      (err) => {
        const msg =
          err?.code === 1
            ? "Location permission denied. Allow location OR paste a Google Maps link."
            : err?.code === 2
              ? "Location unavailable. Try again or paste a Google Maps link."
              : "Location request timed out. Try again or paste a Google Maps link.";
        flashError(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function saveProjectMediaRows(projectId: string) {
    if (!mediaAssets.length) return;

    const rows = mediaAssets.map((asset, index) => ({
      project_id: projectId,
      media_url: asset.url,
      media_kind: asset.kind === "video" ? "video" : "image",
      sort_order: index,
      caption: asset.name || null,
    }));

    const ins = await supabase.from("builder_project_media").insert(rows);
    if (ins.error) throw ins.error;
  }

  async function saveProjectAmenities(projectId: string, amenityIds: string[]) {
    const del = await supabase.from("builder_project_amenities").delete().eq("project_id", projectId);
    if (del.error) throw del.error;

    if (!amenityIds.length) return;

    const rows = amenityIds.map((amenity_id) => ({ project_id: projectId, amenity_id }));
    const ins = await supabase.from("builder_project_amenities").insert(rows);
    if (ins.error) throw ins.error;
  }

  // Dummy AI (template-based) project description generator (uses all data)
  function buildDummyAiProjectDescription() {
    const nameText = name.trim() || "This project";
    const kindText = (projectKind || "residential").trim();

    const locationParts = [addressLine, locality, city, district, stateName, pincode]
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    const locationText = locationLabel.trim()
      ? locationLabel.trim()
      : locationParts.length
        ? locationParts.join(", ")
        : "a well-connected location";

    const reraText = reraId.trim() ? `RERA: ${reraId.trim()}. ` : "";

    const idSet = new Set(selectedProjectAmenityIds.map(String));
    const topAmenityNames = amenities
      .filter((a) => idSet.has(String(a.id)))
      .map((a) => String(a.name || "").trim())
      .filter(Boolean)
      .slice(0, 10);

    const amenityText =
      selectedProjectAmenityIds.length > 0
        ? topAmenityNames.length
          ? `Amenities: ${topAmenityNames.join(", ")}. `
          : `Amenities: ${selectedProjectAmenityIds.length}+ provided. `
        : "";

    const mediaText =
      mediaAssets.length > 0
        ? `Project media: ${mediaAssets.filter((x) => x.kind === "image").length} photo(s) + ${mediaAssets.filter((x) => x.kind === "video").length} video(s). `
        : "";

    const launchText = launchDate ? `Launch: ${launchDate}. ` : "";
    const possessionText = possessionDate ? `Possession: ${possessionDate}. ` : "";

    const nearbyText = nearbyHighlights.trim() ? `Nearby & connectivity: ${nearbyHighlights.trim()}. ` : "";

    const latLngText =
      latitude.trim() && longitude.trim() ? `Coordinates: ${latitude.trim()}, ${longitude.trim()}. ` : "";

    return (
      `${nameText} is a ${kindText} project in ${locationText}. ` +
      reraText +
      amenityText +
      nearbyText +
      mediaText +
      launchText +
      possessionText +
      latLngText +
      `It is thoughtfully planned with quality construction, daily convenience, and long-term value for residents and investors.`
    ).trim();
  }

  async function generateDummyAiDescription() {
    setAiGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const text = buildDummyAiProjectDescription();
      setDescription(text);
    } finally {
      setAiGenerating(false);
    }
  }

  async function createProject() {
    setGlobalError("");
    setSaving(true);

    try {
      if (!userId) {
        const msg = "Not logged in.";
        setGlobalError(msg);
        flashError(msg);
        return;
      }
      if (!builder?.id) {
        const msg = "No builder profile found.";
        setGlobalError(msg);
        flashError(msg);
        return;
      }

      const projectName = name.trim();
      if (!projectName) {
        const msg = "Project name is required.";
        setGlobalError(msg);
        flashError(msg);
        return;
      }

      const baseSlug = slugify(slug.trim() ? slug.trim() : projectName);
      if (!baseSlug) {
        const msg = "Slug is invalid/empty.";
        setGlobalError(msg);
        flashError(msg);
        return;
      }

      const lat = parseNumber(latitude);
      const lng = parseNumber(longitude);

      // ✅ Compose final description (append nearby highlights for saving)
      const baseDesc = description.trim();
      const nearbyDesc = nearbyHighlights.trim();
      const finalDesc =
        nearbyDesc && !baseDesc.toLowerCase().includes(nearbyDesc.toLowerCase())
          ? baseDesc
            ? `${baseDesc}\n\nNearby & connectivity: ${nearbyDesc}`
            : `Nearby & connectivity: ${nearbyDesc}`
          : baseDesc;

      const addressPayload = addressEngineToBuilderProjectPayload(addressEngineValue);

      const payloadBase: BuilderProjectInsert = {
        builder_profile_id: builder.id,
        name: projectName,
        slug: baseSlug,
        investment_plan_master_id: selectedInvestmentPlanId.trim()
          ? selectedInvestmentPlanId.trim()
          : null,

        project_kind: projectKind || null,
        description: finalDesc ? finalDesc : null,

        address_line: addressPayload.address_line || (addressLine.trim() ? addressLine.trim() : null),
        locality: addressPayload.locality || (locality.trim() ? locality.trim() : null),
        city: addressPayload.city || (city.trim() ? city.trim() : null),
        district: addressPayload.district || (district.trim() ? district.trim() : null),
        state: addressPayload.state || (stateName.trim() ? stateName.trim() : null),
        pincode: addressPayload.pincode || (pincode.trim() ? pincode.trim() : null),

        geo_state_id: addressPayload.geo_state_id || null,
        geo_district_id: addressPayload.geo_district_id || null,
        geo_subdivision_id: addressPayload.geo_subdivision_id || null,
        geo_block_id: addressPayload.geo_block_id || null,
        geo_place_id: addressPayload.geo_place_id || null,

        latitude: lat,
        longitude: lng,

        rera_id: reraId.trim() ? reraId.trim() : null,
        launch_date: parseDateYYYYMMDD(launchDate) ?? null,
        possession_date: parseDateYYYYMMDD(possessionDate) ?? null,

        status: "draft",
      };

      // retry slug on unique violation
      let attempt = 0;
      let lastErr: any = null;

      while (attempt < 5) {
        const slugTry =
          attempt === 0 ? payloadBase.slug : `${payloadBase.slug}-${Math.random().toString(36).slice(2, 6)}`;

        const insPayload = { ...payloadBase, slug: slugTry };

        const insRes = await supabase.from("builder_projects").insert(insPayload).select("id,slug,name").maybeSingle();

        if (!insRes.error && insRes.data?.id) {
          const projectId = String(insRes.data.id);

          // best-effort: save amenities
          try {
            await saveProjectAmenities(projectId, selectedProjectAmenityIds);
          } catch (e: any) {
            flashError(`Project created, but amenities save failed — ${friendlyDbError(e)}`);
          }

          // save media rows (files already uploaded by UniversalMediaUploader)
          try {
            if (mediaAssets.length > 0) {
              await saveProjectMediaRows(projectId);
              flashSuccess("Project created + media attached.");
            } else {
              flashSuccess(`Project created: ${insRes.data.name}`);
            }
          } catch (e: any) {
            flashError(`Project created but media save failed — ${friendlyDbError(e)}`);
          }

          try {
            await saveVendorListingMemory({
              userId,
              module: "property",
              memoryType: "workflow",

              title: projectName,

              payload: {
                project_kind: projectKind,

                address_line: addressLine,
                locality,
                city,
                district,
                state: stateName,
                pincode,

                rera_id: reraId,

                nearby_highlights: nearbyHighlights,

                description_template: description,

                amenity_ids: selectedProjectAmenityIds,

                investment_plan_master_id:
                  selectedInvestmentPlanId || null,

                saved_from: "builder_project_add_page",
                saved_at: new Date().toISOString(),
              },
            });
          } catch (memoryErr) {
            console.error("Builder project memory save failed", memoryErr);
          }

          router.push(`/property/builder/projects?created=${encodeURIComponent(projectId)}`);
          return;
        }

        lastErr = insRes.error;
        const msg = String(insRes.error?.message ?? "");
        const code = String((insRes.error as any)?.code ?? "");
        if (code === "23505" || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
          attempt += 1;
          continue;
        }
        break;
      }

      const msg = `Create failed — ${friendlyDbError(lastErr)}`;
      setGlobalError(msg);
      flashError(msg);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!builder?.id && !!name.trim() && !saving;

  const amenitiesByCategory = useMemo(() => {
    const map = new Map<string, AmenityRow[]>();
    for (const a of amenities) {
      const key = (a.category || "other").toLowerCase();
      map.set(key, [...(map.get(key) || []), a]);
    }
    return Array.from(map.entries());
  }, [amenities]);

  return (
    <Container>
      <SectionHeader
        title="Builder • Add Project"
        subtitle="Create a builder project. Next, we will add inventory via the wizard (plots/towers) and generate listings per unit."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/property/builder">
              <ActionButton variant="secondary">Builder Home</ActionButton>
            </Link>
            <Link href="/property">
              <ActionButton variant="secondary">Public Property</ActionButton>
            </Link>
          </div>
        }
      />

      {flash ? (
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 20,
            marginTop: 10,
            marginBottom: 12,
            border:
              flash.kind === "success" ? "1px solid rgba(46, 160, 67, 0.25)" : "1px solid rgba(220, 53, 69, 0.25)",
            background: flash.kind === "success" ? "rgba(46, 160, 67, 0.08)" : "rgba(220, 53, 69, 0.08)",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 700,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: flash.kind === "success" ? "rgba(46, 160, 67, 0.9)" : "rgba(220, 53, 69, 0.9)",
              display: "inline-block",
            }}
          />
          {flash.message}
        </div>
      ) : null}

      {loading ? (
        <Card>
          <CardBody>Loading…</CardBody>
        </Card>
      ) : globalError ? (
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Error</div>
            <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{globalError}</div>
            <div style={{ marginTop: 10 }}>
              <ActionButton onClick={() => router.refresh()}>Refresh</ActionButton>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge>Builder: {builder?.brand_name ?? builder?.legal_name ?? builder?.id?.slice(0, 8)}</Badge>
              {builder?.status ? <Badge>status: {builder.status}</Badge> : null}
              <Badge>Plans loaded: {investmentPlans.length}</Badge>
            </div>

            <div style={{ height: 14 }} />

            {recentProjectMemory.length > 0 ? (
              <div
                style={{
                  marginBottom: 14,
                  border: "1px solid #dbeafe",
                  background: "#f8fbff",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    marginBottom: 8,
                    color: "#1d4ed8",
                  }}
                >
                  Recently Used Project Setups
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {recentProjectMemory.map((memory) => (
                    <button
                      key={memory.id}
                      type="button"
                      onClick={() => applyProjectMemory(memory)}
                      style={{
                        border: "1px solid #bfdbfe",
                        background: "#fff",
                        borderRadius: 999,
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {memory.title}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.72,
                  }}
                >
                  Quickly reuse your previously used builder project setup.
                </div>
              </div>
            ) : null}

            <div style={{ fontWeight: 900, marginBottom: 10 }}>Project basics</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Project name *</div>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug.trim()) setSlug("");
                  }}
                  placeholder="e.g. Swarnabhumi Residency Phase-1"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  disabled={saving}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Slug *</div>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated from name"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  disabled={saving}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>We auto-fix duplicates by appending a suffix.</div>
              </div>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Project kind</div>
                <select
                  value={projectKind}
                  onChange={(e) => setProjectKind(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  disabled={saving}
                >
                  <option value="residential">residential</option>
                  <option value="commercial">commercial</option>
                  <option value="mixed">mixed</option>
                  <option value="plotted">plotted</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>RERA ID (optional)</div>
                <input
                  value={reraId}
                  onChange={(e) => setReraId(e.target.value)}
                  placeholder="e.g. WBRERA/P/NOR/2026/000123"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  disabled={saving}
                />
              </div>
            </div>

            <div style={{ height: 18 }} />
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Investment plan (optional now, project-level)</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                  Select approved investment plan
                </div>

                <select
                  value={selectedInvestmentPlanId}
                  onChange={(e) => setSelectedInvestmentPlanId(e.target.value)}
                  disabled={saving}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                >
                  <option value="">No investment plan attached</option>
                  {investmentPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} [{p.category}]
                    </option>
                  ))}
                </select>

                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  This attaches one approved admin-created participation plan to the whole project.
                </div>
              </div>

              {selectedInvestmentPlanId ? (
                (() => {
                  const selectedPlan = investmentPlans.find((p) => p.id === selectedInvestmentPlanId);
                  if (!selectedPlan) return null;

                  return (
                    <div
                      style={{
                        padding: 12,
                        border: "1px solid #eee",
                        borderRadius: 12,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{selectedPlan.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                        Category: <b>{selectedPlan.category}</b> • Risk: <b>{selectedPlan.risk_level}</b>
                      </div>
                      {selectedPlan.public_label ? (
                        <div style={{ marginBottom: 6 }}>
                          <b>Public label:</b> {selectedPlan.public_label}
                        </div>
                      ) : null}
                      {selectedPlan.highlight_text ? (
                        <div style={{ marginBottom: 6 }}>
                          <b>Highlight:</b> {selectedPlan.highlight_text}
                        </div>
                      ) : null}
                      {selectedPlan.roi_summary ? (
                        <div>
                          <b>ROI summary:</b> {selectedPlan.roi_summary}
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : null}
            </div>

            <div style={{ height: 18 }} />
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Project amenities (defaults for all listings)</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <ActionButton
                variant="secondary"
                onClick={() => setSelectedProjectAmenityIds(amenities.map((a) => a.id))}
                disabled={saving || amenities.length === 0}
              >
                Select All
              </ActionButton>

              <ActionButton
                variant="secondary"
                onClick={() => setSelectedProjectAmenityIds([])}
                disabled={saving || amenities.length === 0}
              >
                Clear All
              </ActionButton>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <ActionButton variant="secondary" onClick={() => setShowAmenities((v) => !v)} disabled={amenities.length === 0}>
                {showAmenities ? "Hide Amenities" : "Show Amenities"}
              </ActionButton>

              <ActionButton
                variant="secondary"
                onClick={() => setSelectedProjectAmenityIds(amenities.map((a) => a.id))}
                disabled={saving || amenities.length === 0}
              >
                Select All
              </ActionButton>

              <ActionButton
                variant="secondary"
                onClick={() => setSelectedProjectAmenityIds([])}
                disabled={saving || amenities.length === 0}
              >
                Clear All
              </ActionButton>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Selected: <b>{selectedProjectAmenityIds.length}</b> / {amenities.length}
              </div>
            </div>

            {amenities.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>No amenities loaded yet. (If this persists, check RLS on amenities_master.)</div>
            ) : !showAmenities ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Amenities are hidden. Click <b>Show Amenities</b> to review and uncheck unwanted items.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {amenitiesByCategory.map(([cat, items]) => (
                  <div key={cat} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
                    <div style={{ fontWeight: 800, marginBottom: 10, textTransform: "capitalize" }}>{cat.replace(/_/g, " ")}</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {items.map((a) => (
                        <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedProjectAmenityIds.includes(a.id)}
                            onChange={() => toggleProjectAmenity(a.id)}
                            disabled={saving}
                          />
                          <span>{a.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              These will be used as defaults when creating multiple listings under this project.
            </div>

            <div style={{ height: 18 }} />
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Project media / gallery</div>

            <UniversalMediaUploader
              module="project"
              value={mediaAssets}
              onChange={setMediaAssets}
              label="Project photos / videos / brochure"
              helperText="Upload project gallery photos, construction progress images, aerial views, entrance photos, site videos, floorplan images, brochure PDFs or approval documents."
              allowImages
              allowVideos
              allowDocuments
              maxFiles={20}
            
                  uploadStrategy="trusted"

                  mandatoryTrustedCaptures={2}

                  inlineCamera

                  cameraFacing="environment"

                  cameraOnly={false}
/>

            <div style={{ height: 18 }} />
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Location & address</div>

            <AddressEngine
              value={{
                ...addressEngineValue,
                house_flat_plot_no: addressLine || addressEngineValue.house_flat_plot_no || "",
                street_road_locality: locality || addressEngineValue.street_road_locality || "",
                landmark: addressEngineValue.landmark || "",
              }}
              disabled={saving}
              onChange={(nextAddress) => {
                setAddressEngineValue(nextAddress);

                const mapped = addressEngineToBuilderProjectPayload(nextAddress);

                setAddressLine(mapped.address_line || "");
                setLocality(mapped.locality || "");
                setCity(mapped.city || "");
                setDistrict(mapped.district || "");
                setStateName(mapped.state || "");
                setPincode(mapped.pincode || "");
              }}
            />

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Latitude</div>
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  disabled={saving}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Longitude</div>
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  disabled={saving}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionButton variant="secondary" onClick={useMyLocation} disabled={saving}>
                Use My Location
              </ActionButton>
            </div>

            {latitude.trim() && longitude.trim() ? (
              <div style={{ marginTop: 10, padding: "10px 12px", border: "1px solid #eee", borderRadius: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Location confirmation</div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{locationLabel ? locationLabel : "Lat/Lng set. Please confirm."}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  Lat: <b>{latitude}</b> • Lng: <b>{longitude}</b>
                </div>
                {mapsPreviewUrl ? (
                  <a href={mapsPreviewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, textDecoration: "underline" }}>
                    Open in Google Maps
                  </a>
                ) : null}
              </div>
            ) : null}

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Paste Google Maps link (optional)</div>
                <input
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder="Paste a Google Maps link containing @lat,lng"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                  disabled={saving}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>We extract lat/lng from the link (no IP-based guesses).</div>
              </div>
              <ActionButton variant="secondary" onClick={applyMapLink} disabled={saving || !mapLink.trim()}>
                Apply Link
              </ActionButton>
            </div>

            <div style={{ height: 18 }} />
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Timeline (optional)</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Launch date</div>
                <input
                  type="date"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                  disabled={saving}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Possession date</div>
                <input
                  type="date"
                  value={possessionDate}
                  onChange={(e) => setPossessionDate(e.target.value)}
                  disabled={saving}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
                />
              </div>
            </div>

            {/* ✅ NEW: Nearby + About Project (AI demo) at LAST */}
            <div style={{ height: 18 }} />
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Nearby / Landmark Highlights (optional)</div>

            <textarea
              value={nearbyHighlights}
              onChange={(e) => setNearbyHighlights(e.target.value)}
              placeholder="Example: MJN Medical College just 500 mtr away, Manindra Nath High School 100 mtr away, Big Bazaar 1 km away, Temple 100 mtr away…"
              style={{
                width: "100%",
                minHeight: 90,
                borderRadius: 12,
                border: "1px solid #ddd",
                padding: "10px 12px",
                resize: "vertical",
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              Write nearby institutions / facilities to make the project more attractive (distance + name).
            </div>

            <div style={{ height: 18 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>About Project (AI demo)</div>

              {readyForAi ? (
                <button
                  type="button"
                  onClick={generateDummyAiDescription}
                  disabled={aiGenerating}
                  style={{
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: aiGenerating ? "#f3f4f6" : "white",
                    cursor: aiGenerating ? "not-allowed" : "pointer",
                    fontWeight: 900,
                  }}
                >
                  {aiGenerating ? "Generating…" : "✨ Generate About Project (AI demo)"}
                </button>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>
                  Fill Project name + kind + location + amenities to enable AI.
                </div>
              )}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="About the project… (AI can generate after you fill all details)"
              style={{
                width: "100%",
                minHeight: 140,
                borderRadius: 12,
                border: "1px solid #ddd",
                padding: "10px 12px",
                marginTop: 8,
                resize: "vertical",
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
              AI demo uses: location, RERA, amenities, aerial media, timelines, and nearby highlights. You can edit anytime.
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ActionButton onClick={createProject} disabled={!canSubmit}>
                {saving ? "Creating…" : "Create Project"}
              </ActionButton>
              <Link href="/property/builder/projects">
                <ActionButton variant="secondary" disabled={saving}>
                  Back to Projects
                </ActionButton>
              </Link>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Next step: Projects list → Units → Inventory wizard (plots/towers).
            </div>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
