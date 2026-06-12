// app/rentals/add/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import {
  loadVendorListingMemory,
  saveVendorListingMemory,
  type VendorListingMemoryRow,
} from "@/lib/vendors/vendorListingMemory";
import {
  buildVendorSmartSuggestions,
} from "@/lib/vendors/vendorSmartSuggestions";
import {
  loadVendorTaxonomyExtensions,
  type VendorExtensionRow,
} from "@/lib/vendors/loadVendorTaxonomyExtensions";
import { ensureBusinessProfileComplete } from "@/lib/ensureBusinessProfileComplete";
import UniversalMediaUploader from "@/app/components/media/UniversalMediaUploader";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";

type Cat = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_system_others: boolean;
};

type Sub = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_system_others: boolean;
};

type Eq = {
  id: string;
  subcategory_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_system_others: boolean;
};

type PricingUnit = "hour" | "day" | "week" | "month" | "job";

function isNonEmpty(s: string) {
  return s.trim().length > 0;
}

function toNumberOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function safeJsonPhotosFromText(input: string): any[] {
  const parts = input
    .split(/[\n,]+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const urls = parts.filter((u) => /^https?:\/\/.+/i.test(u));
  return urls.map((url) => ({ url }));
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((p) => String(p ?? "").trim()).filter(Boolean).join(", ");
}

function buildRentalSmartFill(input: {
  categoryName: string;
  subcategoryName: string;
  equipmentName: string;
  city: string;
  locality: string;
  pricingUnit: PricingUnit;
  rate: string;
}) {
  const equipment = input.equipmentName || input.subcategoryName || input.categoryName || "Rental equipment";
  const group = compactText([input.subcategoryName, input.categoryName]);
  const place = compactText([input.locality, input.city]);

  const title = `${equipment} on rent${place ? ` in ${place}` : ""}`;

  const priceLine = input.rate.trim()
    ? `Rental rate starts from ₹${input.rate.trim()} per ${input.pricingUnit}.`
    : `Rental rate can be discussed based on duration, location and availability.`;

  const description = [
    `${equipment} available on rent${group ? ` under ${group}` : ""}${place ? ` at ${place}` : ""}.`,
    priceLine,
    `Suitable for construction, project, site work, shifting, maintenance or local rental requirements depending on the selected equipment.`,
    `Please send an enquiry to confirm availability, operator requirement, transport charge, security deposit and final rental terms.`,
  ].join(" ");

  return { title, description };
}

export default function AddRentalPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const router = useRouter();

  // Auth
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Profile completion banner (no auto redirect)
  const [profileComplete, setProfileComplete] = useState<boolean>(false);

  // Master data
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterErr, setMasterErr] = useState<string | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [eqs, setEqs] = useState<Eq[]>([]);
  const [vendorExtensions, setVendorExtensions] = useState<VendorExtensionRow[]>([]);

  // Form fields
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [equipmentId, setEquipmentId] = useState<string>("");

  const [otherCategoryText, setOtherCategoryText] = useState("");
  const [otherSubcategoryText, setOtherSubcategoryText] = useState("");
  const [otherEquipmentText, setOtherEquipmentText] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [pricingUnit, setPricingUnit] = useState<PricingUnit>("day");
  const [rate, setRate] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");

  const [stateName, setStateName] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");

  const [photosText, setPhotosText] = useState("");
  const [mediaAssets, setMediaAssets] = useState<UploadedMediaAsset[]>([]);

  // UX
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const [recentRentalMemory, setRecentRentalMemory] = useState<
    VendorListingMemoryRow[]
  >([]);

  const smartRentalSuggestions = buildVendorSmartSuggestions(
    recentRentalMemory,
    4
  );

  // Expand/collapse
  const [openTaxonomy, setOpenTaxonomy] = useState(true);
  const [openDetails, setOpenDetails] = useState(true);
  const [openPricing, setOpenPricing] = useState(true);
  const [openLocation, setOpenLocation] = useState(true);
  const [openPhotos, setOpenPhotos] = useState(false);

  // ---------- LOGIN GUARD ----------
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      setAuthLoading(true);

      try {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;

        const uid = data?.user?.id ?? null;

        if (error || !uid) {
          setUserId(null);
          setAuthLoading(false);
          router.replace(`/login?next=${encodeURIComponent("/rentals/add")}`);
          return;
        }

        setUserId(uid);
        setAuthLoading(false);
      } catch {
        if (cancelled) return;
        setUserId(null);
        setAuthLoading(false);
        router.replace(`/login?next=${encodeURIComponent("/rentals/add")}`);
      }
    }

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, router]);

  // ---------- Profile completion banner (no redirect) ----------
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    (async () => {
      const { data: bp, error } = await supabase
        .from("business_profiles")
        .select("is_complete")
        .eq("user_id", userId)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error(error);
        setProfileComplete(false);
        return;
      }

      setProfileComplete(!!bp?.is_complete);
    })();

    return () => {
      alive = false;
    };
  }, [supabase, userId]);

  // ---------- Load vendor-private rental options ----------
  useEffect(() => {
    if (!userId) return;

    let alive = true;

    async function loadVendorRentalOptions() {
      const uid = userId;
      if (!uid) return;

      const rows = await loadVendorTaxonomyExtensions({
        module: "rentals",
        userId: uid,
      });

      if (!alive) return;

      setVendorExtensions(rows);
    }

    loadVendorRentalOptions();

    return () => {
      alive = false;
    };
  }, [userId]);

  // ---------- Load master taxonomy once authenticated ----------
  useEffect(() => {
    if (authLoading) return;
    if (!userId) return;

    let alive = true;

    async function loadMaster() {
      setLoadingMaster(true);
      setMasterErr(null);

      const [cRes, sRes, eRes] = await Promise.all([
        supabase
          .from("rental_categories")
          .select("id,name,slug,sort_order,is_system_others")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("rental_subcategories")
          .select("id,category_id,name,slug,sort_order,is_system_others")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("rental_equipment")
          .select("id,subcategory_id,name,slug,sort_order,is_system_others")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (!alive) return;

      if (cRes.error || sRes.error || eRes.error) {
        setMasterErr(
          cRes.error?.message ||
            sRes.error?.message ||
            eRes.error?.message ||
            "Failed to load master data"
        );
        setCats([]);
        setSubs([]);
        setEqs([]);
        setLoadingMaster(false);
        return;
      }

      const catsData = (cRes.data ?? []) as Cat[];
      const subsData = (sRes.data ?? []) as Sub[];
      const eqsData = (eRes.data ?? []) as Eq[];

      setCats(catsData);
      setSubs(subsData);
      setEqs(eqsData);

      // Defaults
      const firstCat =
        catsData.find((c) => !c.is_system_others && c.slug !== "others") ?? catsData[0];

      if (firstCat) {
        setCategoryId(firstCat.id);

        const subList = subsData.filter((s) => s.category_id === firstCat.id);
        const firstSub =
          subList.find((s) => !s.is_system_others && s.slug !== "others") ?? subList[0];

        if (firstSub) {
          setSubcategoryId(firstSub.id);

          const eqList = eqsData.filter((e) => e.subcategory_id === firstSub.id);
          const firstEq =
            eqList.find((e) => !e.is_system_others && e.slug !== "others") ?? eqList[0];

          setEquipmentId(firstEq?.id ?? "");
        }
      }

      setLoadingMaster(false);
    }

    loadMaster();
    return () => {
      alive = false;
    };
  }, [supabase, authLoading, userId]);

  const mergedCats = useMemo<Cat[]>(() => {
    const vendorCats: Cat[] = vendorExtensions
      .filter((x) => x.level === "category")
      .map((x) => ({
        id: `vendor-${x.id}`,
        name: x.label,
        slug: x.value || x.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sort_order: 999999,
        is_system_others: false,
      }));

    return [...cats, ...vendorCats].sort((a, b) => {
      const sa = a.sort_order ?? 999999;
      const sb = b.sort_order ?? 999999;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [cats, vendorExtensions]);

  const mergedSubs = useMemo<Sub[]>(() => {
    const vendorSubs: Sub[] = vendorExtensions
      .filter((x) => x.level === "subcategory" && x.parent_id === categoryId)
      .map((x) => ({
        id: `vendor-${x.id}`,
        category_id: categoryId,
        name: x.label,
        slug: x.value || x.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sort_order: 999999,
        is_system_others: false,
      }));

    return [
      ...subs.filter((s: Sub) => s.category_id === categoryId),
      ...vendorSubs,
    ].sort((a, b) => {
      const sa = a.sort_order ?? 999999;
      const sb = b.sort_order ?? 999999;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [subs, vendorExtensions, categoryId]);

  const mergedEqs = useMemo<Eq[]>(() => {
    const vendorEqs: Eq[] = vendorExtensions
      .filter((x) => x.level === "equipment" && x.parent_id === subcategoryId)
      .map((x) => ({
        id: `vendor-${x.id}`,
        subcategory_id: subcategoryId,
        name: x.label,
        slug: x.value || x.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sort_order: 999999,
        is_system_others: false,
      }));

    return [
      ...eqs.filter((e: Eq) => e.subcategory_id === subcategoryId),
      ...vendorEqs,
    ].sort((a, b) => {
      const sa = a.sort_order ?? 999999;
      const sb = b.sort_order ?? 999999;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }, [eqs, vendorExtensions, subcategoryId]);

  const selectedCat = useMemo(
    () => mergedCats.find((c: Cat) => c.id === categoryId) ?? null,
    [mergedCats, categoryId]
  );

  const catSubs = useMemo(
    () => mergedSubs,
    [mergedSubs]
  );

  const selectedSub = useMemo(
    () => mergedSubs.find((s: Sub) => s.id === subcategoryId) ?? null,
    [mergedSubs, subcategoryId]
  );

  const subEqs = useMemo(
    () => mergedEqs,
    [mergedEqs]
  );

  const selectedEq = useMemo(
    () => mergedEqs.find((e: Eq) => e.id === equipmentId) ?? null,
    [mergedEqs, equipmentId]
  );

  // Reset cascade when category changes
  useEffect(() => {
    if (!categoryId) return;

    const list = mergedSubs;
    const firstSub = list.find((s) => !s.is_system_others && s.slug !== "others") ?? list[0];

    setSubcategoryId(firstSub?.id ?? "");
    setEquipmentId("");

    setOtherSubcategoryText("");
    setOtherEquipmentText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  // Reset cascade when subcategory changes
  useEffect(() => {
    if (!subcategoryId) return;

    const list = mergedEqs;
    const firstEq = list.find((e) => !e.is_system_others && e.slug !== "others") ?? list[0];

    setEquipmentId(firstEq?.id ?? "");
    setOtherEquipmentText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategoryId]);

  function validate(): string[] {
    const errors: string[] = [];

    if (!categoryId) errors.push("Category is required.");
    if (!subcategoryId) errors.push("Subcategory is required.");
    if (subEqs.length > 0 && !equipmentId) errors.push("Equipment is required.");

    if (!isNonEmpty(title)) errors.push("Title is required.");

    const r = toNumberOrNull(rate);
    if (r !== null && r < 0) errors.push("Rate cannot be negative.");

    const d = toNumberOrNull(securityDeposit);
    if (d !== null && d < 0) errors.push("Security deposit cannot be negative.");

    if (selectedCat?.is_system_others || selectedCat?.slug === "others") {
      if (!isNonEmpty(otherCategoryText)) errors.push("Please specify the category (Others).");
    }
    if (selectedSub?.is_system_others || selectedSub?.slug === "others") {
      if (!isNonEmpty(otherSubcategoryText)) errors.push("Please specify the subcategory (Others).");
    }
    if (selectedEq && (selectedEq.is_system_others || selectedEq.slug === "others")) {
      if (!isNonEmpty(otherEquipmentText)) errors.push("Please specify the equipment (Others).");
    }

    if (isNonEmpty(pincode) && !/^\d{6}$/.test(pincode.trim())) {
      errors.push("Pincode should be 6 digits (or leave blank).");
    }

    return errors;
  }

  function onSmartFillRentalDetails() {
    const categoryName =
      selectedCat && (selectedCat.is_system_others || selectedCat.slug === "others")
        ? otherCategoryText
        : selectedCat?.name ?? "";

    const subcategoryName =
      selectedSub && (selectedSub.is_system_others || selectedSub.slug === "others")
        ? otherSubcategoryText
        : selectedSub?.name ?? "";

    const equipmentName =
      selectedEq && (selectedEq.is_system_others || selectedEq.slug === "others")
        ? otherEquipmentText
        : selectedEq?.name ?? "";

    const smart = buildRentalSmartFill({
      categoryName,
      subcategoryName,
      equipmentName,
      city,
      locality,
      pricingUnit,
      rate,
    });

    if (!title.trim()) setTitle(smart.title);
    setDescription(smart.description);
  }


  function applyRentalMemory(memory: VendorListingMemoryRow) {
    const payload = memory.payload ?? {};

    if (payload.category_id) {
      setCategoryId(payload.category_id);
    }

    if (payload.subcategory_id) {
      setSubcategoryId(payload.subcategory_id);
    }

    if (payload.equipment_id) {
      setEquipmentId(payload.equipment_id);
    }

    setPricingUnit(payload.pricing_unit ?? "");
    setRate(payload.rate != null ? String(payload.rate) : "");
    setSecurityDeposit(
      payload.security_deposit != null
        ? String(payload.security_deposit)
        : ""
    );

    setStateName(payload.state ?? "");
    setDistrict(payload.district ?? "");
    setCity(payload.city ?? "");
    setLocality(payload.locality ?? "");
    setPincode(payload.pincode ?? "");

    if (payload.description_template) {
      setDescription(payload.description_template);
    }
  }

  async function insertDraft(): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
    setSaveOk(null);
    setSaveErr(null);

    const errs = validate();
    if (errs.length) return { ok: false, message: errs.join(" ") };

    if (!userId) {
      router.replace(`/login?next=${encodeURIComponent("/rentals/add")}`);
      return { ok: false, message: "You must be logged in to add a rental listing." };
    }

    const payload = {
      owner_id: userId,

      category_id: categoryId,
      subcategory_id: subcategoryId,
      equipment_id: equipmentId.startsWith("vendor-") ? null : equipmentId || null,

      other_category_text:
        selectedCat?.is_system_others || selectedCat?.slug === "others"
          ? otherCategoryText.trim()
          : null,
      other_subcategory_text:
        selectedSub?.is_system_others || selectedSub?.slug === "others"
          ? otherSubcategoryText.trim()
          : null,
      other_equipment_text:
        selectedEq && (selectedEq.is_system_others || selectedEq.slug === "others")
          ? otherEquipmentText.trim()
          : null,

      title: title.trim(),
      description:
        description.trim() ||
        buildRentalSmartFill({
          categoryName:
            selectedCat && (selectedCat.is_system_others || selectedCat.slug === "others")
              ? otherCategoryText
              : selectedCat?.name ?? "",
          subcategoryName:
            selectedSub && (selectedSub.is_system_others || selectedSub.slug === "others")
              ? otherSubcategoryText
              : selectedSub?.name ?? "",
          equipmentName:
            selectedEq && (selectedEq.is_system_others || selectedEq.slug === "others")
              ? otherEquipmentText
              : selectedEq?.name ?? "",
          city,
          locality,
          pricingUnit,
          rate,
        }).description,

      pricing_unit: pricingUnit,
      rate: toNumberOrNull(rate),
      rate_unit_label: null,
      security_deposit: toNumberOrNull(securityDeposit),

      country: "India",
      state: stateName.trim() || null,
      district: district.trim() || null,
      city: city.trim() || null,
      locality: locality.trim() || null,
      pincode: pincode.trim() || null,

      photos: [
        ...mediaAssets.map((asset) => ({
          url: asset.url,
          kind: asset.kind,
          bucket: asset.bucket,
          path: asset.path,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType,
        })),
        ...safeJsonPhotosFromText(photosText),
      ],

      status: "draft",
      is_active: true,
    };

    const { count: existingRentalCount } = await supabase
      .from("rental_listings")
      .select("id", { count: "exact", head: true })
      .eq("vendor_user_id", userId);

    const { data, error } = await supabase
      .from("rental_listings")
      .insert(payload)
      .select("id")
      .single();

    if (error) return { ok: false, message: error.message };

    const id = (data as any)?.id as string | undefined;
    if (!id) return { ok: false, message: "Saved but could not read new listing ID." };

    if (Number(existingRentalCount || 0) === 0) {
      trackVendorConversionClient({
        eventType: "first_listing_created",
        module: "rentals",
        listingId: id,
        source: "rentals_add_page",
        label: "First Rental Listing Created",
        metadata: {
          title: title.trim(),
          categoryId,
          subcategoryId,
          equipmentId,
        },
      });
    }

    try {
      await saveVendorListingMemory({
        userId,

        module: "rentals",
        memoryType: "workflow",

        title:
          title.trim() ||
          selectedEq?.name ||
          selectedSub?.name ||
          selectedCat?.name ||
          "Rental Setup",

        payload: {
          category_id: categoryId,
          subcategory_id: subcategoryId,
          equipment_id: equipmentId,

          pricing_unit: pricingUnit,
          rate: toNumberOrNull(rate),
          security_deposit: toNumberOrNull(securityDeposit),

          state: stateName.trim(),
          district: district.trim(),
          city: city.trim(),
          locality: locality.trim(),
          pincode: pincode.trim(),

          description_template: description.trim(),

          saved_from: "rentals_add_page",
          saved_at: new Date().toISOString(),
        },
      });
    } catch (memoryErr) {
      console.error("Rental memory save failed", memoryErr);
    }

    return { ok: true, id };
  }

  // Gate ONLY on save
  async function onSaveDraftGated() {
    const gate = await ensureBusinessProfileComplete("/rentals/add");
    if (!gate.ok) {
      router.push(gate.redirectTo);
      return;
    }

    setSaving(true);
    const res = await insertDraft();
    setSaving(false);

    if (!res.ok) {
      setSaveErr(res.message);
      return;
    }

    setSaveOk("Saved! Your rental listing is created as Draft.");

    // reset some inputs (keep taxonomy as is)
    setTitle("");
    setDescription("");
    setRate("");
    setSecurityDeposit("");
    setPhotosText("");
    setMediaAssets([]);

    // FINAL STAGE: subscription page
    const returnTo = "/rentals/my";
    router.push(
      `/dashboard/subscription?source=rentals&listingId=${encodeURIComponent(res.id)}&return=${encodeURIComponent(
        returnTo
      )}`
    );
  }

  // ---------- UI ----------
  if (authLoading) {
    return (
      <main className="rentalAdd">
        <div className="wrap">
          <div className="state">Checking login…</div>
        </div>
        <Style />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="rentalAdd">
        <div className="wrap">
          <div className="state">
            Login required. Redirecting to <span className="mono">/login</span>…
          </div>
        </div>
        <Style />
      </main>
    );
  }

  return (
    <main className="rentalAdd">
      <div className="wrap">
        <div className="top">
          <div>
            <div className="kicker">Rentals</div>
            <h1 className="h1">Add Rental Listing</h1>
            <p className="p">
              Vendors can add and manage their rental listings. Public users browse without login.
            </p>
          </div>

          <div className="topRight">
            <Link className="btn btnOutline" href="/rentals">
              ← Back to Rentals
            </Link>
          </div>
        </div>

        {/* Profile banner only (no auto redirect) */}
        {!profileComplete ? (
          <div className="banner">
            <div className="bannerTitle">Complete your Business / Author Profile to save drafts</div>
            <div className="bannerText">
              You can fill the form now, but “Save Draft” will redirect you to profile completion.
            </div>
            <div className="bannerActions">
              <Link
                className="btn btnPrimary"
                href={`/onboarding/business?returnTo=${encodeURIComponent("/rentals/add")}`}
              >
                Complete Profile →
              </Link>
            </div>
          </div>
        ) : null}

        {loadingMaster ? <div className="state">Loading rental master data…</div> : null}

        {!loadingMaster && masterErr ? (
          <div className="state stateErr">
            <div className="stateTitle">Master data error</div>
            <div className="mono">{masterErr}</div>
            <div className="stateHint">
              Ensure RLS allows SELECT for authenticated on rental_categories / rental_subcategories /
              rental_equipment.
            </div>
          </div>
        ) : null}

        {!loadingMaster && !masterErr ? (
          <>
            {saveErr ? (
              <div className="alert alertErr">
                <b>Error:</b> {saveErr}
              </div>
            ) : null}
            {saveOk ? (
              <div className="alert alertOk">
                <b>Success:</b> {saveOk}
              </div>
            ) : null}

            {recentRentalMemory.length > 0 ? (
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
                  Suggested For You
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {smartRentalSuggestions.map((suggestion) => {
                    const memory = suggestion.memory;

                    return (
                      <button
                        key={suggestion.key}
                        type="button"
                        onClick={() => applyRentalMemory(memory)}
                        style={{
                          border: "1px solid #bfdbfe",
                          background: "#fff",
                          borderRadius: 999,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {suggestion.title}
                        </div>

                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 10,
                            opacity: 0.72,
                            fontWeight: 600,
                          }}
                        >
                          {suggestion.reason}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.72,
                  }}
                >
                  Smart suggestions based on your frequently reused rental pricing, location and equipment workflows.
                </div>
              </div>
            ) : null}

            <Section
              title="1) Category → Subcategory → Equipment"
              open={openTaxonomy}
              setOpen={setOpenTaxonomy}
            >
              <div className="grid2">
                <div className="field">
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setOtherCategoryText("");
                    }}
                  >
                    {mergedCats.map((c: Cat) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      {String(c.id).startsWith("vendor-") ? " • My Added Option" : ""}
                      </option>
                    ))}
                  </select>

                  {selectedCat && (selectedCat.is_system_others || selectedCat.slug === "others") ? (
                    <div className="mt8">
                      <label className="label">Others (specify category)</label>
                      <input
                        className="input"
                        value={otherCategoryText}
                        onChange={(e) => setOtherCategoryText(e.target.value)}
                        placeholder="e.g., House/Flat/Room Rent"
                      />
                      <div className="hint">Required when Category is “Others (specify)”.</div>
                    </div>
                  ) : null}
                </div>

                <div className="field">
                  <label className="label">Subcategory</label>
                  <select
                    className="input"
                    value={subcategoryId}
                    onChange={(e) => {
                      setSubcategoryId(e.target.value);
                      setOtherSubcategoryText("");
                    }}
                    disabled={!categoryId}
                  >
                    {catSubs.map((s: Sub) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      {String(s.id).startsWith("vendor-") ? " • My Added Option" : ""}
                      </option>
                    ))}
                  </select>

                  {selectedSub && (selectedSub.is_system_others || selectedSub.slug === "others") ? (
                    <div className="mt8">
                      <label className="label">Others (specify subcategory)</label>
                      <input
                        className="input"
                        value={otherSubcategoryText}
                        onChange={(e) => setOtherSubcategoryText(e.target.value)}
                        placeholder="e.g., Shop/Commercial Space Rent"
                      />
                      <div className="hint">Required when Subcategory is “Others (specify)”.</div>
                    </div>
                  ) : null}
                </div>

                <div className="field">
                  <label className="label">Equipment</label>
                  <select
                    className="input"
                    value={equipmentId}
                    onChange={(e) => {
                      setEquipmentId(e.target.value);
                      setOtherEquipmentText("");
                    }}
                    disabled={!subcategoryId || subEqs.length === 0}
                  >
                    {subEqs.length === 0 ? (
                      <option value="">No equipment in this subcategory</option>
                    ) : (
                      subEqs.map((eq: Eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name}
                          {String(eq.id).startsWith("vendor-") ? " • My Added Option" : ""}
                        </option>
                      ))
                    )}
                  </select>

                  {selectedEq && (selectedEq.is_system_others || selectedEq.slug === "others") ? (
                    <div className="mt8">
                      <label className="label">Others (specify equipment)</label>
                      <input
                        className="input"
                        value={otherEquipmentText}
                        onChange={(e) => setOtherEquipmentText(e.target.value)}
                        placeholder="e.g., Custom Machine Name"
                      />
                      <div className="hint">Required when Equipment is “Others (specify)”.</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="hint2">
                <b>Note:</b> “Others (specify)” exists at every level. If selected, the corresponding
                text is mandatory.
              </div>
            </Section>

            <Section title="2) Listing details" open={openDetails} setOpen={setOpenDetails}>
              <div className="aiBox">
                <div>
                  <div className="aiTitle">AI Smart-Fill for Rentals</div>
                  <div className="aiText">
                    Generates title and description based on selected rental equipment, category,
                    location and rate.
                  </div>
                </div>
                <button type="button" className="btn btnOutline" onClick={onSmartFillRentalDetails}>
                  ✨ AI Smart-Fill
                </button>
              </div>

              <div className="grid2">
                <div className="field">
                  <label className="label">Title *</label>
                  <input
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., JCB Backhoe Loader on rent in Cooch Behar"
                  />
                  <div className="hint">This will be shown publicly (without owner details).</div>
                </div>

                <div className="field">
                  <label className="label">Description</label>
                  <textarea
                    className="input textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Usage, condition, operator availability, minimum hours/days, etc."
                  />
                </div>
              </div>
            </Section>

            <Section title="3) Pricing" open={openPricing} setOpen={setOpenPricing}>
              <div className="grid2">
                <div className="field">
                  <label className="label">Pricing unit</label>
                  <select
                    className="input"
                    value={pricingUnit}
                    onChange={(e) => setPricingUnit(e.target.value as PricingUnit)}
                  >
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="job">Job</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Rate</label>
                  <input
                    className="input"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g., 1200"
                    inputMode="decimal"
                  />
                  <div className="hint">Optional now. Can be added later anytime.</div>
                </div>

                <div className="field">
                  <label className="label">Security deposit</label>
                  <input
                    className="input"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    placeholder="e.g., 5000"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </Section>

            <Section title="4) Location" open={openLocation} setOpen={setOpenLocation}>
              <div className="grid2">
                <div className="field">
                  <label className="label">State</label>
                  <input
                    className="input"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="West Bengal"
                  />
                </div>
                <div className="field">
                  <label className="label">District</label>
                  <input
                    className="input"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Cooch Behar"
                  />
                </div>
                <div className="field">
                  <label className="label">City / Town</label>
                  <input
                    className="input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cooch Behar"
                  />
                </div>
                <div className="field">
                  <label className="label">Locality</label>
                  <input
                    className="input"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="Khagrabari / Mahishbathan etc."
                  />
                </div>
                <div className="field">
                  <label className="label">Pincode</label>
                  <input
                    className="input"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="6 digits"
                    inputMode="numeric"
                  />
                </div>
              </div>
            </Section>

            <Section title="5) Photos / Videos (optional)" open={openPhotos} setOpen={setOpenPhotos}>
              <UniversalMediaUploader
                module="rentals"
                value={mediaAssets}
                onChange={setMediaAssets}
                label="Rental item photos / videos"
                helperText="Take equipment, room, vehicle, machine, property or site photos. You can also record a short video showing condition and availability."
                allowImages
                allowVideos
                allowDocuments={false}
                maxFiles={12}
              />

              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 900, color: "#374151" }}>
                  Advanced: paste existing photo URLs
                </summary>

                <div className="field" style={{ marginTop: 10 }}>
                  <label className="label">Photo URLs</label>
                  <textarea
                    className="input textarea"
                    value={photosText}
                    onChange={(e) => setPhotosText(e.target.value)}
                    placeholder={`Optional. Paste image URLs (http/https). Separate by comma or new lines.\nExample:\nhttps://...jpg\nhttps://...png`}
                  />
                  <div className="hint">Direct upload is recommended. URL paste is kept only for old/existing media.</div>
                </div>
              </details>
            </Section>

            <div className="footerBar">
              <button className="btn btnPrimary" onClick={onSaveDraftGated} disabled={saving}>
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <span className="tiny">After save, you’ll be sent to the subscription final stage.</span>
            </div>
          </>
        ) : null}
      </div>

      <Style />
    </main>
  );
}

function Section(props: {
  title: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const { title, open, setOpen, children } = props;
  return (
    <section className="section">
      <button type="button" className="sectionHead" onClick={() => setOpen(!open)}>
        <span className="sectionTitle">{title}</span>
        <span className="sectionToggle">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="sectionBody">{children}</div> : null}
    </section>
  );
}

function Style() {
  return (
    <style jsx global>{`
      .rentalAdd {
        padding: 26px 0 64px;
        background: #fff;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      }

      .rentalAdd .wrap {
        width: min(1120px, 92vw);
        margin: 0 auto;
      }

      .rentalAdd .top {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }

      .rentalAdd .kicker {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 8px;
      }

      .rentalAdd .h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1.1;
        letter-spacing: -0.3px;
      }

      .rentalAdd .p {
        margin: 10px 0 0;
        color: #6b7280;
        font-size: 14px;
        max-width: 80ch;
      }

      .rentalAdd .banner {
        margin-top: 14px;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 14px;
        background: #fff;
      }
      .rentalAdd .bannerTitle {
        font-weight: 900;
        margin-bottom: 6px;
      }
      .rentalAdd .bannerText {
        color: #6b7280;
        font-size: 13px;
        margin-bottom: 10px;
      }
      .rentalAdd .bannerActions {
        display: flex;
        justify-content: flex-end;
      }

      .rentalAdd .section {
        margin-top: 16px;
        border: 1px solid #eee;
        border-radius: 16px;
        overflow: hidden;
        background: #fff;
      }

      .rentalAdd .sectionHead {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 14px;
        border: 0;
        background: #fafafa;
        cursor: pointer;
        text-align: left;
      }

      .rentalAdd .sectionTitle {
        font-weight: 800;
        font-size: 14px;
      }

      .rentalAdd .sectionToggle {
        font-size: 18px;
        line-height: 1;
        color: #111827;
      }

      .rentalAdd .sectionBody {
        padding: 14px;
      }

      .rentalAdd .aiBox {
        margin-bottom: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 12px;
        background: #f9fafb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .rentalAdd .aiTitle {
        font-size: 13px;
        font-weight: 900;
        color: #111827;
      }

      .rentalAdd .aiText {
        margin-top: 3px;
        font-size: 12px;
        color: #6b7280;
      }

      .rentalAdd .grid2 {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      @media (max-width: 860px) {
        .rentalAdd .grid2 {
          grid-template-columns: 1fr;
        }
      }

      .rentalAdd .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .rentalAdd .label {
        font-size: 12px;
        color: #4b5563;
        font-weight: 800;
      }

      .rentalAdd .input {
        border: 1px solid #e6e6e6;
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        outline: none;
        background: #fff;
      }

      .rentalAdd .input:focus {
        border-color: #111827;
        box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.12);
      }

      .rentalAdd .textarea {
        min-height: 92px;
        resize: vertical;
      }

      .rentalAdd .hint {
        font-size: 12px;
        color: #6b7280;
      }

      .rentalAdd .hint2 {
        margin-top: 10px;
        font-size: 12px;
        color: #374151;
        background: #f9fafb;
        border: 1px dashed #d1d5db;
        border-radius: 12px;
        padding: 10px;
      }

      .rentalAdd .mt8 {
        margin-top: 8px;
      }

      .rentalAdd .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 13px;
        text-decoration: none;
        border: 1px solid transparent;
        user-select: none;
        cursor: pointer;
      }

      .rentalAdd .btnOutline {
        background: #fff;
        color: #111;
        border-color: #e5e7eb;
      }

      .rentalAdd .btnOutline:hover {
        background: #f9fafb;
      }

      .rentalAdd .btnPrimary {
        background: #111;
        color: #fff;
        border-color: #111;
        font-weight: 800;
      }

      .rentalAdd .btnPrimary:hover {
        opacity: 0.92;
      }

      .rentalAdd .btnPrimary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .rentalAdd .alert {
        margin-top: 14px;
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 13px;
        border: 1px solid #eee;
      }

      .rentalAdd .alertErr {
        border-color: #f2b8b8;
        background: #fff5f5;
        color: #7a1b1b;
      }

      .rentalAdd .alertOk {
        border-color: #bfe7c9;
        background: #f3fff6;
        color: #165a2b;
      }

      .rentalAdd .state {
        margin-top: 18px;
        border: 1px solid #eeeeee;
        border-radius: 14px;
        padding: 14px;
        color: #555;
        font-size: 13px;
        background: #fff;
      }

      .rentalAdd .stateErr {
        border-color: #f2b8b8;
        background: #fff5f5;
        color: #7a1b1b;
      }

      .rentalAdd .stateTitle {
        font-weight: 800;
        margin-bottom: 8px;
      }

      .rentalAdd .stateHint {
        margin-top: 8px;
        color: #7a1b1b;
        font-size: 12px;
      }

      .rentalAdd .footerBar {
        margin-top: 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .rentalAdd .tiny {
        font-size: 12px;
        color: #6b7280;
      }

      .rentalAdd .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
          "Courier New", monospace;
      }
    `}</style>
  );
}
