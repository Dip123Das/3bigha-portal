import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { MobileEvidenceAsset, MobileOnboardingPath, MobileOnboardingState } from "@/lib/mobile/contracts/v1";
import { resolveLocation } from "@/lib/geography/resolveLocation";

const PROTECTED_KEYS = /(?:approval|verified|verification|grant|role|subscription|dashboard|eligible|score|confidence|decision)/i;

export class MobileOnboardingError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "MobileOnboardingError";
  }
}

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function assertNoProtectedInput(value: unknown) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PROTECTED_KEYS.test(key)) throw new MobileOnboardingError(400, "PROTECTED_FIELD", `The field ${key} is server controlled.`);
    assertNoProtectedInput(child);
  }
}

async function catalogue(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("identity_master")
    .select("identity_key,label,local_label,identity_family,description,requires_business_onboarding,requires_verification,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => !["master_admin", "multi_business_operator"].includes(clean(row.identity_key)))
    .map((row: any) => ({
      key: clean(row.identity_key), label: clean(row.label), localLabel: clean(row.local_label) || null,
      family: clean(row.identity_family || "individual"), description: clean(row.description, 500) || null,
      requiresBusinessOnboarding: row.requires_business_onboarding === true,
      requiresVerification: row.requires_verification === true,
    }));
}

export async function loadMobileOnboarding(supabase: SupabaseClient, user: User): Promise<MobileOnboardingState> {
  const [{ data: profile }, { data: business }, { data: professional }, options] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,state,city,pincode,onboarding_completed,onboarding_version").eq("id", user.id).maybeSingle(),
    supabase.from("business_profiles").select("business_name,business_type,nature_of_business,state,district,city,pincode,location_verification_status,approval_status,registration_complete,business_media_json,selfie_media_json,automated_verification_json").eq("user_id", user.id).maybeSingle(),
    supabase.from("individual_professional_profiles").select("primary_skill_key,verified_selfie_json,work_photo_one_json,work_photo_two_json,verification_status,ai_result_json").eq("user_id", user.id).maybeSingle(),
    catalogue(supabase),
  ]);
  const meta = user.user_metadata ?? {};
  const selected = Array.isArray(meta.human_identities) ? meta.human_identities.map(String) : [];
  const businessMedia = Array.isArray((business as any)?.business_media_json) ? (business as any).business_media_json : [];
  const auto = ((business as any)?.automated_verification_json ?? (professional as any)?.ai_result_json ?? {}) as any;
  return {
    path: (["customer", "business", "individual_professional"] as const).includes(meta.registration_path) ? meta.registration_path : null,
    identityOptions: options,
    selectedIdentityKeys: selected,
    primaryIdentityKey: clean(meta.primary_human_identity || (professional as any)?.primary_skill_key) || null,
    profile: { fullName: clean((profile as any)?.full_name), phone: clean((profile as any)?.phone), state: clean((profile as any)?.state), district: clean((profile as any)?.city), pincode: clean((profile as any)?.pincode) },
    business: {
      businessName: clean((business as any)?.business_name), businessType: clean((business as any)?.business_type),
      natureOfBusiness: Array.isArray((business as any)?.nature_of_business) ? (business as any).nature_of_business.map(String) : [],
      state: clean((business as any)?.state), district: clean((business as any)?.district), city: clean((business as any)?.city), pincode: clean((business as any)?.pincode),
      locationStatus: clean((business as any)?.location_verification_status || "not_started"), approvalStatus: clean((business as any)?.approval_status || "pending"),
      registrationComplete: (business as any)?.registration_complete === true,
    },
    evidence: {
      selfieCaptured: Boolean((business as any)?.selfie_media_json || (professional as any)?.verified_selfie_json),
      workPhotoCount: [(professional as any)?.work_photo_one_json, (professional as any)?.work_photo_two_json].filter(Boolean).length,
      documentCount: businessMedia.filter((item: any) => item?.kind === "document").length,
    },
    verification: { status: clean(auto.status || (professional as any)?.verification_status || "incomplete"), reasons: Array.isArray(auto.reasons) ? auto.reasons.map(String) : [], canActivateDashboard: auto.can_activate_dashboard === true },
  };
}

export async function declareMobileIdentity(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const path = clean(input.path) as MobileOnboardingPath;
  const keys = Array.isArray(input.identityKeys) ? input.identityKeys.map((v: unknown) => clean(v)).filter(Boolean) : [];
  const primary = clean(input.primaryIdentityKey);
  if (!(["customer", "business", "individual_professional"] as const).includes(path) || !primary || !keys.includes(primary)) throw new MobileOnboardingError(400, "INVALID_DECLARATION", "Choose one supported registration pathway and identity.");
  const options = await catalogue(supabase);
  const selected = options.filter((item) => keys.includes(item.key));
  if (selected.length !== keys.length) throw new MobileOnboardingError(400, "INVALID_IDENTITY", "Choose identities from the current 3Bigha identity catalogue.");
  if (path === "business" && selected.some((item) => item.family === "individual" && !item.requiresBusinessOnboarding)) throw new MobileOnboardingError(400, "PATH_MISMATCH", "Individual skilled identities must use the self-working professional pathway.");
  if (path === "individual_professional" && selected.some((item) => item.requiresBusinessOnboarding)) throw new MobileOnboardingError(400, "PATH_MISMATCH", "Business identities must use business onboarding.");
  const { error } = await supabase.rpc("declare_operating_profile", { p_operating_profile: path === "business" ? "business_operator" : "individual_professional", p_identity_keys: keys, p_primary_identity_key: primary });
  if (error) throw error;
  const { error: grantError } = await supabase.rpc("sync_member_module_grants");
  if (grantError) throw grantError;
  const label = selected.find((item) => item.key === primary)?.label || primary;
  const { error: metaError } = await supabase.auth.updateUser({ data: { ...user.user_metadata, registration_path: path, member_identity_status: "declared", operating_profile: path === "business" ? "business_operator" : "individual_professional", primary_human_identity: primary, human_identities: keys, human_identity_label: label, human_identity_declared_at: new Date().toISOString() } });
  if (metaError) throw metaError;
  if (path === "individual_professional") {
    const { error: professionalError } = await supabase.from("individual_professional_profiles").upsert({
      user_id: user.id,
      primary_skill_key: primary,
      secondary_skill_keys: [],
      economic_mode: "self_working_individual",
      work_preferences: { daily_wage: true, hourly_work: false, per_job_work: true, takes_complete_contracts: false, supplies_worker_teams: false, operates_firm_or_agency: false, primarily_supervises: false },
      availability_status: "available",
      worker_declaration_accepted: true,
      worker_declaration_at: new Date().toISOString(),
      contractor_risk_status: "not_detected",
      verification_status: "incomplete",
      lifetime_free_eligible: false,
    }, { onConflict: "user_id" });
    if (professionalError) throw professionalError;
  }
}

export async function saveMobileProfile(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const fullName = clean(input.fullName), phone = clean(input.phone), state = clean(input.state), district = clean(input.district), pincode = clean(input.pincode, 6);
  if (!fullName || !phone || !state || !district || (pincode && !/^\d{6}$/.test(pincode))) throw new MobileOnboardingError(400, "INVALID_PROFILE", "Enter your original name, mobile number, State, District/City and a valid six-digit PIN.");
  const path = clean(input.path) as MobileOnboardingPath;
  const { error } = await supabase.from("profiles").upsert({ id: user.id, email: user.email || null, full_name: fullName, phone, state, city: district, pincode: pincode || null, role_display_label: clean(input.identityLabel), onboarding_version: 4, onboarding_completed: path === "customer" }, { onConflict: "id" });
  if (error) throw error;
}

export async function saveMobileBusiness(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const businessName = clean(input.businessName), state = clean(input.state), district = clean(input.district), city = clean(input.city), pincode = clean(input.pincode, 6);
  if (!businessName || !state || !district || !city) throw new MobileOnboardingError(400, "INVALID_BUSINESS", "Enter the business name and complete operating address.");
  const geography = await resolveLocation({ state, district, city, locality: city, pincode });
  const payload = { user_id: user.id, business_name: businessName, company_name: businessName, business_type: clean(input.businessType), nature_of_business: Array.isArray(input.natureOfBusiness) ? input.natureOfBusiness.map((v: unknown) => clean(v)).filter(Boolean) : [], contact_person: clean(input.contactPerson), phone_primary: clean(input.phone), state, district, city, pincode: pincode || null, geo_state_id: geography.geo_state_id || null, geo_district_id: geography.geo_district_id || null, geo_subdivision_id: geography.geo_subdivision_id || null, geo_block_id: geography.geo_block_id || null, geo_place_id: geography.geo_place_id || null };
  const { error } = await supabase.from("business_profiles").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function verifyMobileLocation(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const lat = Number(input.latitude), lng = Number(input.longitude), accuracy = Number(input.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new MobileOnboardingError(400, "INVALID_LOCATION", "A valid live-device location is required.");
  const { error } = await supabase.from("business_profiles").update({ verified_lat: lat, verified_lng: lng, verified_accuracy_m: Number.isFinite(accuracy) ? accuracy : null, verified_source: "native_device_geolocation", verified_at: new Date().toISOString(), location_verification_status: "verified" }).eq("user_id", user.id);
  if (error) throw error;
}

export async function uploadMobileEvidence(supabase: SupabaseClient, user: User, input: any): Promise<MobileEvidenceAsset> {
  assertNoProtectedInput(input);
  const category = clean(input.category);
  if (!["selfie", "work_photo_one", "work_photo_two", "business_document"].includes(category)) throw new MobileOnboardingError(400, "INVALID_EVIDENCE", "Unsupported evidence category.");
  if (category !== "business_document" && input.captureSource !== "live_camera") throw new MobileOnboardingError(400, "LIVE_CAMERA_REQUIRED", "Selfie and work photographs must be captured with the live camera.");
  const match = clean(input.dataUrl, 15_000_000).match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new MobileOnboardingError(400, "INVALID_FILE", "The selected evidence file could not be read.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new MobileOnboardingError(413, "FILE_SIZE", "Evidence files must be no larger than 8 MB.");
  const mimeType = match[1];
  if (category === "business_document" ? !["application/pdf", "image/jpeg", "image/png"].includes(mimeType) : !mimeType.startsWith("image/")) throw new MobileOnboardingError(400, "FILE_TYPE", "Use a supported image or PDF document.");
  const ext = mimeType === "application/pdf" ? "pdf" : mimeType.includes("png") ? "png" : "jpg";
  const path = `${user.id}/registration/${category}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("vendor-media").upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("vendor-media").getPublicUrl(path);
  return { id: crypto.randomUUID(), bucket: "vendor-media", path, url: data.publicUrl, name: clean(input.name) || `${category}.${ext}`, size: bytes.length, mimeType, kind: category === "business_document" ? "document" : "image", captureSource: category === "business_document" ? "file_upload" : "live_camera", captureTimestamp: new Date().toISOString(), evidenceCategory: category };
}

export async function attachMobileEvidence(supabase: SupabaseClient, user: User, asset: MobileEvidenceAsset) {
  const category = asset.evidenceCategory;
  if (category === "selfie") {
    if (user.user_metadata?.registration_path === "individual_professional") {
      const { error } = await supabase.from("individual_professional_profiles").upsert({ user_id: user.id, verified_selfie_json: asset, selfie_verification_status: "captured" }, { onConflict: "user_id" }); if (error) throw error;
    } else {
      const { error } = await supabase.from("business_profiles").update({ selfie_media_json: asset, selfie_capture_status: "captured" }).eq("user_id", user.id); if (error) throw error;
    }
  } else if (category === "business_document") {
    const { data } = await supabase.from("business_profiles").select("business_media_json").eq("user_id", user.id).maybeSingle();
    const current = Array.isArray((data as any)?.business_media_json) ? (data as any).business_media_json : [];
    const { error } = await supabase.from("business_profiles").update({ business_media_json: [...current, asset] }).eq("user_id", user.id); if (error) throw error;
  } else {
    const column = category === "work_photo_one" ? "work_photo_one_json" : "work_photo_two_json";
    const { error } = await supabase.from("individual_professional_profiles").upsert({ user_id: user.id, [column]: asset, ...(category === "work_photo_two" ? { work_evidence_verification_status: "pending_review" } : {}) }, { onConflict: "user_id" }); if (error) throw error;
  }
}

export async function evaluateMobileRegistration(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("evaluate_automated_registration_verification");
  if (error) throw error;
  return data;
}
