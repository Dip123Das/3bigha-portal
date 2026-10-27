import { createHash } from "node:crypto";

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

function cleanKeys(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => clean(item)).filter(Boolean)),
  );
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
    .select("identity_key,label,family_key,description,registration_scopes,requires_business_onboarding,requires_professional_verification,lifetime_free_candidate,redirect_to_business,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => !["master_admin", "multi_business_operator"].includes(clean(row.identity_key)))
    .map((row: any) => ({
      key: clean(row.identity_key), label: clean(row.label), localLabel: null,
      family: clean(row.family_key || "individual"), description: clean(row.description, 500) || null,
      registrationScopes: Array.isArray(row.registration_scopes)
        ? row.registration_scopes.map((value: unknown) => clean(value)).filter(Boolean)
        : [],
      requiresBusinessOnboarding: row.requires_business_onboarding === true,
      requiresVerification: row.requires_professional_verification === true,
      lifetimeFreeCandidate: row.lifetime_free_candidate === true,
      redirectToBusiness: row.redirect_to_business === true,
    }));
}

async function registrationCatalogue(supabase: SupabaseClient) {
  const [legalResult, sectorResult, mappingResult] = await Promise.all([
    supabase
      .from("registration_legal_constitutions")
      .select("key,label,description,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("label"),
    supabase
      .from("registration_business_sectors")
      .select("key,title,description,symbol,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("title"),
    supabase
      .from("registration_identity_sector_map")
      .select("identity_key,sector_key,nature_modules,sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const error =
    legalResult.error ||
    sectorResult.error ||
    mappingResult.error;

  if (error) throw error;

  return {
    legalConstitutions: (legalResult.data ?? []).map((row: any) => ({
      key: clean(row.key),
      label: clean(row.label),
      description: clean(row.description, 500) || null,
    })),
    businessSectors: (sectorResult.data ?? []).map((row: any) => ({
      key: clean(row.key),
      title: clean(row.title),
      description: clean(row.description, 500) || null,
      symbol: clean(row.symbol, 40) || null,
    })),
    sectorMappings: (mappingResult.data ?? []).map((row: any) => ({
      identityKey: clean(row.identity_key),
      sectorKey: clean(row.sector_key),
      natureModules: Array.isArray(row.nature_modules)
        ? row.nature_modules
            .map((value: unknown) => clean(value))
            .filter(Boolean)
        : [],
    })),
  };
}

export async function loadMobileOnboarding(supabase: SupabaseClient, user: User): Promise<MobileOnboardingState> {
  const [{ data: profile }, { data: business }, { data: professional }, options, registration] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,state,city,pincode,onboarding_completed,onboarding_version,approval_status").eq("id", user.id).maybeSingle(),
    supabase.from("business_profiles").select("business_name,business_type,business_identities,individual_identities,nature_of_business,contact_person,phone_primary,phone_whatsapp,email_business,gstin,pan,trade_license_no,udyam_no,address_line1,address_line2,landmark,premises_type,house_plot_flat_no,building_market_name,street_road_locality,state,district,city,pincode,delivery_radius_km,preferred_service_area,statewide_service,nationwide_service,rera_registration_no,rera_state,rera_expiry_date,author_display_name,author_category,author_bio,author_portfolio_url,about_person,about_business,location_verification_status,registration_complete,business_media_json,selfie_media_json,automated_verification_json").eq("user_id", user.id).maybeSingle(),
    supabase.from("individual_professional_profiles").select("primary_skill_key,secondary_skill_keys,years_experience,availability_status,service_radius_km,worker_declaration_accepted,original_name_warning_accepted,identity_document_type,identity_document_masked_reference,work_preferences,verified_selfie_json,work_photo_one_json,work_photo_two_json,verification_status,ai_result_json").eq("user_id", user.id).maybeSingle(),
    catalogue(supabase),
    registrationCatalogue(supabase),
  ]);
  const meta = user.user_metadata ?? {};
  const selected = Array.isArray(meta.human_identities) ? meta.human_identities.map(String) : [];
  const businessMedia = Array.isArray((business as any)?.business_media_json) ? (business as any).business_media_json : [];
  const auto = ((business as any)?.automated_verification_json ?? (professional as any)?.ai_result_json ?? {}) as any;
  return {
    path: (["customer", "business", "individual_professional"] as const).includes(meta.registration_path) ? meta.registration_path : null,
    catalogue: registration,
    identityOptions: options,
    selectedIdentityKeys: selected,
    primaryIdentityKey: clean(meta.primary_human_identity || (professional as any)?.primary_skill_key) || null,
    profile: { fullName: clean((profile as any)?.full_name), phone: clean((profile as any)?.phone), state: clean((profile as any)?.state), district: clean((profile as any)?.city), pincode: clean((profile as any)?.pincode) },
    business: {
      businessName: clean((business as any)?.business_name), businessType: clean((business as any)?.business_type),
      businessIdentities: Array.isArray((business as any)?.business_identities) ? (business as any).business_identities.map(String) : [],
      individualIdentities: Array.isArray((business as any)?.individual_identities) ? (business as any).individual_identities.map(String) : [],
      natureOfBusiness: Array.isArray((business as any)?.nature_of_business) ? (business as any).nature_of_business.map(String) : [],
      contactPerson: clean((business as any)?.contact_person), phonePrimary: clean((business as any)?.phone_primary),
      phoneWhatsapp: clean((business as any)?.phone_whatsapp), emailBusiness: clean((business as any)?.email_business),
      gstin: clean((business as any)?.gstin), pan: clean((business as any)?.pan),
      tradeLicenseNo: clean((business as any)?.trade_license_no), udyamNo: clean((business as any)?.udyam_no),
      addressLine1: clean((business as any)?.address_line1), addressLine2: clean((business as any)?.address_line2),
      landmark: clean((business as any)?.landmark), premisesType: clean((business as any)?.premises_type),
      housePlotFlatNo: clean((business as any)?.house_plot_flat_no), buildingMarketName: clean((business as any)?.building_market_name),
      streetRoadLocality: clean((business as any)?.street_road_locality),
      state: clean((business as any)?.state), district: clean((business as any)?.district), city: clean((business as any)?.city), pincode: clean((business as any)?.pincode),
      deliveryRadiusKm: (business as any)?.delivery_radius_km != null && (business as any)?.delivery_radius_km !== "" && Number.isFinite(Number((business as any).delivery_radius_km)) ? Number((business as any).delivery_radius_km) : null,
      preferredServiceArea: clean((business as any)?.preferred_service_area),
      statewideService: (business as any)?.statewide_service === true, nationwideService: (business as any)?.nationwide_service === true,
      reraRegistrationNo: clean((business as any)?.rera_registration_no), reraState: clean((business as any)?.rera_state),
      reraExpiryDate: clean((business as any)?.rera_expiry_date),
      authorDisplayName: clean((business as any)?.author_display_name), authorCategory: clean((business as any)?.author_category),
      authorBio: clean((business as any)?.author_bio), authorPortfolioUrl: clean((business as any)?.author_portfolio_url),
      aboutPerson: clean((business as any)?.about_person), aboutBusiness: clean((business as any)?.about_business),
      locationStatus: clean((business as any)?.location_verification_status || "not_started"), approvalStatus: clean((profile as any)?.approval_status || "pending"),
      registrationComplete: (business as any)?.registration_complete === true,
    },
    professional: {
      secondarySkillKeys: Array.isArray((professional as any)?.secondary_skill_keys) ? (professional as any).secondary_skill_keys.map(String) : [],
      yearsExperience: (professional as any)?.years_experience != null && (professional as any)?.years_experience !== "" && Number.isInteger(Number((professional as any).years_experience)) ? Number((professional as any).years_experience) : null,
      availabilityStatus: clean((professional as any)?.availability_status || "available"),
      serviceRadiusKm: (professional as any)?.service_radius_km != null && (professional as any)?.service_radius_km !== "" && Number.isFinite(Number((professional as any).service_radius_km)) ? Number((professional as any).service_radius_km) : 25,
      dailyWage: (professional as any)?.work_preferences?.daily_wage !== false,
      hourlyWork: Boolean((professional as any)?.work_preferences?.hourly_work),
      perJobWork: (professional as any)?.work_preferences?.per_job_work !== false,
      workerDeclarationAccepted: (professional as any)?.worker_declaration_accepted === true,
      originalNameWarningAccepted: (professional as any)?.original_name_warning_accepted === true,
      identityDocumentType: clean((professional as any)?.identity_document_type),
      identityDocumentMaskedReference: clean((professional as any)?.identity_document_masked_reference),
    },
    evidence: {
      selfieCaptured: Boolean((business as any)?.selfie_media_json || (professional as any)?.verified_selfie_json),
      workPhotoCount: [(professional as any)?.work_photo_one_json, (professional as any)?.work_photo_two_json].filter(Boolean).length,
      documentCount: businessMedia.filter((item: any) => item?.kind === "document").length,
      completeBusinessProofCount: businessMedia.filter((item: any) => item?.kind === "document" && item?.legalProofMeta?.certificateNumber && item?.legalProofMeta?.issuingAuthority && item?.legalProofMeta?.issueDate && ["exact_date", "financial_period", "no_expiry"].includes(item?.legalProofMeta?.validityType)).length,
      businessPracticalPhotoCount: businessMedia.filter((item: any) => item?.evidenceCategory === "business_practical_photo").length,
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
  const path = clean(input.path) as MobileOnboardingPath;
  if (!fullName || !phone || !(["customer", "business", "individual_professional"] as const).includes(path) || (pincode && !/^\d{6}$/.test(pincode)) || (path === "customer" && (!state || !district))) {
    throw new MobileOnboardingError(400, "INVALID_PROFILE", path === "customer" ? "Enter your name, mobile number, State, District/City and a valid six-digit PIN." : "Enter your original full name and mobile number.");
  }
  const profilePayload: Record<string, unknown> = {
    id: user.id, email: user.email || null, full_name: fullName, phone,
    role_display_label: clean(input.identityLabel), onboarding_version: 4,
    onboarding_completed: path === "customer",
  };
  if (state) profilePayload.state = state;
  if (district) profilePayload.city = district;
  if (pincode) profilePayload.pincode = pincode;
  const { error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (error) throw error;
}

export async function saveMobileBusiness(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const businessName = clean(input.businessName);
  const businessType = clean(input.businessType);
  const businessIdentities = cleanKeys(input.businessIdentities);
  const individualIdentities = cleanKeys(input.individualIdentities);
  const requestedSectors = cleanKeys(input.businessSectors);
  const contactPerson = clean(input.contactPerson);
  const phonePrimary = clean(input.phonePrimary || input.phone);
  const phoneWhatsapp = clean(input.phoneWhatsapp);
  const emailBusiness = clean(input.emailBusiness);
  const state = clean(input.state);
  const district = clean(input.district);
  const city = clean(input.city);
  const pincode = clean(input.pincode, 6);
  const gstin = clean(input.gstin, 32).toUpperCase();
  const tradeLicenseNo = clean(input.tradeLicenseNo, 100);
  const authorDisplayName = clean(input.authorDisplayName, 120);

  if (!state || !district || !city || (pincode && !/^\d{6}$/.test(pincode))) {
    throw new MobileOnboardingError(400, "INVALID_BUSINESS_ADDRESS", "Enter the official State, District, locality/city and a valid six-digit PIN.");
  }
  if (!businessType) throw new MobileOnboardingError(400, "CONSTITUTION_REQUIRED", "Select your Legal Constitution.");
  if (!businessIdentities.length) throw new MobileOnboardingError(400, "BUSINESS_IDENTITY_REQUIRED", "Select at least one Business Identity.");
  if (!contactPerson) throw new MobileOnboardingError(400, "CONTACT_REQUIRED", "Enter the business Contact Person.");
  if (!phonePrimary && !emailBusiness) throw new MobileOnboardingError(400, "CONTACT_METHOD_REQUIRED", "Enter either a business phone number or business email.");
  if (businessIdentities.length === 0 && !authorDisplayName) throw new MobileOnboardingError(400, "BUSINESS_IDENTITY_REQUIRED", "Choose a business identity.");

  const [registration, identities] = await Promise.all([registrationCatalogue(supabase), catalogue(supabase)]);
  if (!registration.legalConstitutions.some((item) => item.key === businessType)) {
    throw new MobileOnboardingError(400, "INVALID_CONSTITUTION", "Select an active Legal Constitution from Business Registration.");
  }

  const identityIndex = new Map(identities.map((item) => [item.key, item]));
  if (businessIdentities.some((key) => !identityIndex.get(key)?.registrationScopes.includes("business_identity"))) {
    throw new MobileOnboardingError(400, "INVALID_BUSINESS_IDENTITY", "Choose active Business Identities from the current 3Bigha register.");
  }
  if (individualIdentities.some((key) => !identityIndex.get(key)?.registrationScopes.includes("business_personal_role"))) {
    throw new MobileOnboardingError(400, "INVALID_INDIVIDUAL_IDENTITY", "Choose personal roles from the current 3Bigha register.");
  }

  const activeMappings = registration.sectorMappings.filter((mapping) =>
    businessIdentities.includes(mapping.identityKey) && (!requestedSectors.length || requestedSectors.includes(mapping.sectorKey)),
  );
  const mappedIdentityKeys = new Set(activeMappings.map((mapping) => mapping.identityKey));
  if (businessIdentities.some((key) => !mappedIdentityKeys.has(key))) {
    throw new MobileOnboardingError(400, "BUSINESS_SECTOR_MAPPING_REQUIRED", "Every Business Identity must match one of the selected Business Sectors.");
  }

  const natureOfBusiness = Array.from(new Set(activeMappings.flatMap((mapping) => mapping.natureModules))).filter(Boolean);
  if (!natureOfBusiness.length) throw new MobileOnboardingError(400, "NATURE_MAPPING_REQUIRED", "Selected Business Identities must resolve to at least one marketplace module.");
  const isPureBlogOnly = natureOfBusiness.includes("blog") && !natureOfBusiness.some((item) => ["property", "materials", "services", "rentals"].includes(item));
  if (!businessName && !(isPureBlogOnly && authorDisplayName)) {
    throw new MobileOnboardingError(400, "BUSINESS_NAME_REQUIRED", "Enter the Business Name, or the Author Display Name for a blog-only profile.");
  }
  if (!isPureBlogOnly && !gstin && !tradeLicenseNo) {
    throw new MobileOnboardingError(400, "BUSINESS_PROOF_NUMBER_REQUIRED", "Enter a GSTIN or Trade License number for the business proof.");
  }

  const radiusText = clean(input.deliveryRadiusKm, 20);
  const deliveryRadiusKm = radiusText ? Number(radiusText) : null;
  if (deliveryRadiusKm !== null && (!Number.isFinite(deliveryRadiusKm) || deliveryRadiusKm < 0 || deliveryRadiusKm > 5000)) {
    throw new MobileOnboardingError(400, "INVALID_SERVICE_RADIUS", "Enter a service radius between 0 and 5000 km.");
  }
  const reraExpiryDate = clean(input.reraExpiryDate, 10);
  if (reraExpiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(reraExpiryDate)) {
    throw new MobileOnboardingError(400, "INVALID_RERA_EXPIRY", "Enter the RERA expiry date in YYYY-MM-DD format.");
  }

  const geography = await resolveLocation({ state, district, city, locality: city, pincode });
  const payload = {
    user_id: user.id,
    business_name: businessName || null,
    company_name: businessName || authorDisplayName || null,
    business_type: businessType,
    business_identities: businessIdentities,
    individual_identities: individualIdentities,
    nature_of_business: natureOfBusiness,
    gstin: gstin || null,
    pan: clean(input.pan, 32).toUpperCase() || null,
    trade_license_no: tradeLicenseNo || null,
    udyam_no: clean(input.udyamNo, 100) || null,
    contact_person: contactPerson,
    phone_primary: phonePrimary || null,
    phone_whatsapp: phoneWhatsapp || null,
    email_business: emailBusiness || null,
    address_line1: clean(input.addressLine1, 240) || null,
    address_line2: clean(input.addressLine2, 240) || null,
    landmark: clean(input.landmark, 180) || null,
    premises_type: clean(input.premisesType, 60) || null,
    house_plot_flat_no: clean(input.housePlotFlatNo, 120) || null,
    building_market_name: clean(input.buildingMarketName, 160) || null,
    street_road_locality: clean(input.streetRoadLocality, 180) || null,
    state, district, city, pincode: pincode || null,
    geo_state_id: geography.geo_state_id || null,
    geo_district_id: geography.geo_district_id || null,
    geo_subdivision_id: geography.geo_subdivision_id || null,
    geo_block_id: geography.geo_block_id || null,
    geo_place_id: geography.geo_place_id || null,
    delivery_radius_km: deliveryRadiusKm,
    preferred_service_area: clean(input.preferredServiceArea, 300) || null,
    statewide_service: input.statewideService === true,
    nationwide_service: input.nationwideService === true,
    rera_registration_no: clean(input.reraRegistrationNo, 100) || null,
    rera_state: clean(input.reraState, 100) || null,
    rera_expiry_date: reraExpiryDate || null,
    author_display_name: authorDisplayName || null,
    author_category: clean(input.authorCategory, 80) || null,
    author_bio: clean(input.authorBio, 1200) || null,
    author_portfolio_url: clean(input.authorPortfolioUrl, 400) || null,
    about_person: clean(input.aboutPerson, 2000) || null,
    about_business: clean(input.aboutBusiness, 2000) || null,
  };
  const { error } = await supabase.from("business_profiles").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function saveMobileProfessional(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const primarySkillKey = clean(input.primarySkillKey);
  const secondarySkillKeys = cleanKeys(input.secondarySkillKeys);
  const fullName = clean(input.fullName);
  const phone = clean(input.phone);
  const yearsText = clean(input.yearsExperience, 8);
  const yearsExperience = yearsText ? Number(yearsText) : null;
  const availabilityStatus = clean(input.availabilityStatus, 40);
  const serviceRadiusKm = Number(input.serviceRadiusKm);
  const workerDeclarationAccepted = input.workerDeclarationAccepted === true;
  const originalNameWarningAccepted = input.originalNameWarningAccepted === true;
  const identityDocumentType = clean(input.identityDocumentType, 80);
  const identityDocumentMaskedReference = clean(input.identityDocumentMaskedReference, 100);
  const identityDocumentConsentAccepted = input.identityDocumentConsentAccepted === true;

  if (!primarySkillKey || !fullName || !phone) throw new MobileOnboardingError(400, "PROFESSIONAL_IDENTITY_REQUIRED", "Enter your original name and mobile number and select your primary skill.");
  const skills = await catalogue(supabase);
  const primary = skills.find((item) => item.key === primarySkillKey);
  if (!primary || !primary.registrationScopes.includes("individual_skill") || !primary.lifetimeFreeCandidate || primary.redirectToBusiness) {
    throw new MobileOnboardingError(400, "INVALID_PROFESSIONAL_SKILL", "Choose a currently eligible self-working skill from the 3Bigha register.");
  }
  if (secondarySkillKeys.some((key) => key === primarySkillKey || !skills.some((item) => item.key === key && item.registrationScopes.includes("individual_skill") && item.lifetimeFreeCandidate && !item.redirectToBusiness))) {
    throw new MobileOnboardingError(400, "INVALID_SECONDARY_SKILL", "Choose additional skills from the current 3Bigha skill register.");
  }
  if (yearsExperience !== null && (!Number.isInteger(yearsExperience) || yearsExperience < 0 || yearsExperience > 80)) {
    throw new MobileOnboardingError(400, "INVALID_EXPERIENCE", "Enter years of experience between 0 and 80.");
  }
  if (!["available", "partially_available", "currently_engaged", "not_available"].includes(availabilityStatus)) {
    throw new MobileOnboardingError(400, "INVALID_AVAILABILITY", "Choose one of the listed availability options.");
  }
  if (!Number.isFinite(serviceRadiusKm) || serviceRadiusKm < 0 || serviceRadiusKm > 5000) {
    throw new MobileOnboardingError(400, "INVALID_SERVICE_RADIUS", "Enter a service radius between 0 and 5000 km.");
  }
  if (!workerDeclarationAccepted || !originalNameWarningAccepted) {
    throw new MobileOnboardingError(400, "DECLARATION_REQUIRED", "Confirm your original name and that you personally perform the declared work.");
  }
  if (identityDocumentType && (!identityDocumentConsentAccepted || !identityDocumentMaskedReference)) {
    throw new MobileOnboardingError(400, "IDENTITY_DOCUMENT_CONSENT_REQUIRED", "Provide a masked reference and accept consent before adding optional identity-document details.");
  }

  const now = new Date().toISOString();
  const preferences = {
    daily_wage: input.dailyWage === true,
    hourly_work: input.hourlyWork === true,
    per_job_work: input.perJobWork === true,
    takes_complete_contracts: false,
    supplies_worker_teams: false,
    operates_firm_or_agency: false,
    primarily_supervises: false,
  };
  const { error } = await supabase.from("individual_professional_profiles").upsert({
    user_id: user.id,
    primary_skill_key: primarySkillKey,
    secondary_skill_keys: secondarySkillKeys,
    economic_mode: "self_working_individual",
    work_preferences: preferences,
    years_experience: yearsExperience,
    availability_status: availabilityStatus,
    service_radius_km: serviceRadiusKm,
    worker_declaration_accepted: true,
    worker_declaration_at: now,
    contractor_risk_status: "not_detected",
    verification_status: "incomplete",
    lifetime_free_eligible: false,
    original_name_declared: fullName,
    original_name_warning_accepted: true,
    original_name_warning_accepted_at: now,
    identity_document_type: identityDocumentType || null,
    identity_document_masked_reference: identityDocumentType ? identityDocumentMaskedReference : null,
    identity_document_verification_status: identityDocumentType ? "pending_review" : "not_submitted",
    identity_name_match_status: identityDocumentType ? "human_review" : "not_checked",
    identity_document_consent_at: identityDocumentType ? now : null,
    identity_document_consent_version: identityDocumentType ? "individual-professional-v1" : null,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function verifyMobileLocation(supabase: SupabaseClient, user: User, input: any) {
  assertNoProtectedInput(input);
  const lat = Number(input.latitude), lng = Number(input.longitude), accuracy = Number(input.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new MobileOnboardingError(400, "INVALID_LOCATION", "A valid live-device location is required.");
  const { error } = await supabase.from("business_profiles").update({ verified_lat: lat, verified_lng: lng, verified_accuracy_m: Number.isFinite(accuracy) ? accuracy : null, verified_source: "native_device_geolocation", verified_at: new Date().toISOString(), location_verification_status: "verified" }).eq("user_id", user.id);
  if (error) throw error;
}

type LiveCaptureMetadata = NonNullable<MobileEvidenceAsset["captureMetadata"]>;

function finiteOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateLiveCaptureMetadata(input: any): LiveCaptureMetadata {
  if (!input || typeof input !== "object") throw new MobileOnboardingError(400, "CAPTURE_METADATA_REQUIRED", "Fresh GPS and time metadata are required for live evidence.");
  const latitude = Number(input.latitude), longitude = Number(input.longitude), accuracy = Number(input.accuracy), locationAgeMs = Number(input.locationAgeMs), utcOffsetMinutes = Number(input.utcOffsetMinutes);
  const locationTimestamp = clean(input.locationTimestamp, 60), cameraOpenedAt = clean(input.cameraOpenedAt, 60), deviceCapturedAt = clean(input.deviceCapturedAt, 60);
  const timezone = clean(input.timezone, 80), platform = clean(input.platform, 20), cameraFacing = clean(input.cameraFacing, 10);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new MobileOnboardingError(400, "INVALID_CAPTURE_LOCATION", "The live evidence location is invalid.");
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 100) throw new MobileOnboardingError(400, "CAPTURE_ACCURACY", "Live evidence requires GPS accuracy of 100 metres or better.");
  if ([locationTimestamp, cameraOpenedAt, deviceCapturedAt].some((value) => !value || Number.isNaN(Date.parse(value)))) throw new MobileOnboardingError(400, "INVALID_CAPTURE_TIME", "Valid capture timestamps are required.");

  const locationTimeMs = Date.parse(locationTimestamp);
  const cameraOpenedTimeMs = Date.parse(cameraOpenedAt);
  const deviceCapturedTimeMs = Date.parse(deviceCapturedAt);
  const calculatedLocationAgeMs = deviceCapturedTimeMs - locationTimeMs;

  if (
    locationTimeMs > cameraOpenedTimeMs
    || cameraOpenedTimeMs > deviceCapturedTimeMs
    || calculatedLocationAgeMs < 0
    || calculatedLocationAgeMs > 60_000
  ) throw new MobileOnboardingError(400, "INVALID_CAPTURE_SEQUENCE", "The verified capture timeline is invalid or stale.");

  if (
    !Number.isFinite(locationAgeMs)
    || Math.abs(locationAgeMs - calculatedLocationAgeMs) > 2_000
  ) throw new MobileOnboardingError(400, "CAPTURE_AGE_MISMATCH", "The submitted GPS age does not match the capture timeline.");

  if (Math.abs(Date.now() - deviceCapturedTimeMs) > 5 * 60_000) throw new MobileOnboardingError(400, "STALE_CAPTURE_TIME", "The live capture time is outside the accepted verification window.");
  if (input.mocked === true) throw new MobileOnboardingError(400, "MOCK_LOCATION", "Mock-location evidence cannot be accepted.");
  if (!timezone || !["android", "ios"].includes(platform) || !Number.isFinite(utcOffsetMinutes) || !["front", "back"].includes(cameraFacing)) throw new MobileOnboardingError(400, "INVALID_CAPTURE_CONTEXT", "Complete capture context is required.");

  return {
    latitude,
    longitude,
    accuracy,
    altitude: finiteOrNull(input.altitude),
    altitudeAccuracy: finiteOrNull(input.altitudeAccuracy),
    heading: finiteOrNull(input.heading),
    speed: finiteOrNull(input.speed),
    locationTimestamp: new Date(locationTimeMs).toISOString(),
    locationAgeMs: calculatedLocationAgeMs,
    mocked: typeof input.mocked === "boolean" ? input.mocked : null,
    cameraOpenedAt: new Date(cameraOpenedTimeMs).toISOString(),
    deviceCapturedAt: new Date(deviceCapturedTimeMs).toISOString(),
    timezone,
    utcOffsetMinutes,
    platform,
    cameraFacing: cameraFacing as "front" | "back",
  };
}

export async function uploadMobileEvidence(supabase: SupabaseClient, user: User, input: any): Promise<MobileEvidenceAsset> {
  assertNoProtectedInput(input);
  const category = clean(input.category);
  if (!["selfie", "work_photo_one", "work_photo_two", "business_document", "business_practical_photo"].includes(category)) throw new MobileOnboardingError(400, "INVALID_EVIDENCE", "Unsupported evidence category.");
  if (category !== "business_document" && input.captureSource !== "live_camera") throw new MobileOnboardingError(400, "LIVE_CAMERA_REQUIRED", "Selfie and work photographs must be captured with the live camera.");
  const match = clean(input.dataUrl, 15_000_000).match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new MobileOnboardingError(400, "INVALID_FILE", "The selected evidence file could not be read.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new MobileOnboardingError(413, "FILE_SIZE", "Evidence files must be no larger than 8 MB.");
  const mimeType = match[1];
  const supportedImageTypes = ["image/jpeg", "image/png", "image/webp"];
  const supportedDocumentTypes = [...supportedImageTypes, "application/pdf"];
  const allowedMimeTypes = category === "business_document" ? supportedDocumentTypes : supportedImageTypes;
  if (!allowedMimeTypes.includes(mimeType)) throw new MobileOnboardingError(400, "FILE_TYPE", "Use a supported JPEG, PNG, WebP or PDF file.");

  let legalProofMeta: MobileEvidenceAsset["legalProofMeta"] = null;
  if (category === "business_document") {
    const meta = input.legalProofMeta ?? {};
    const documentType = clean(meta.documentType, 40);
    const certificateNumber = clean(meta.certificateNumber, 120);
    const issuingAuthority = clean(meta.issuingAuthority, 160);
    const issueDate = clean(meta.issueDate, 10);
    const validityType = clean(meta.validityType, 32);
    const validUntil = clean(meta.validUntil, 10);
    const periodStartYear = Number(meta.periodStartYear);
    const periodEndYear = Number(meta.periodEndYear);
    if (!["gst", "trade-license", "udyam", "other"].includes(documentType) || !certificateNumber || !issuingAuthority || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) || !["exact_date", "financial_period", "no_expiry"].includes(validityType)) {
      throw new MobileOnboardingError(400, "LEGAL_PROOF_DETAILS_REQUIRED", "Enter the proof type, certificate number, issuing authority, issue date and validity details.");
    }
    const parseDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
      const time = Date.parse(`${value}T00:00:00.000Z`);
      return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : Number.NaN;
    };
    const issueTime = parseDate(issueDate);
    const today = new Date(); today.setUTCHours(23, 59, 59, 999);
    if (!Number.isFinite(issueTime) || issueTime > today.getTime()) throw new MobileOnboardingError(400, "INVALID_PROOF_ISSUE_DATE", "Enter a valid issue date that is not in the future.");
    if (validityType === "exact_date") {
      const validUntilTime = parseDate(validUntil);
      if (!Number.isFinite(validUntilTime) || Date.parse(`${validUntil}T23:59:59.999Z`) < issueTime) {
        throw new MobileOnboardingError(400, "INVALID_PROOF_VALIDITY", "Enter a valid expiry date on or after the issue date.");
      }
      if (Date.parse(`${validUntil}T23:59:59.999Z`) < Date.now()) {
        throw new MobileOnboardingError(400, "EXPIRED_BUSINESS_PROOF", "The uploaded business certificate has expired.");
      }
    }
    if (validityType === "financial_period") {
      if (!Number.isInteger(periodStartYear) || !Number.isInteger(periodEndYear) || periodStartYear < 1900 || periodStartYear > 2200 || periodEndYear < 1900 || periodEndYear > 2200 || periodEndYear <= periodStartYear) {
        throw new MobileOnboardingError(400, "INVALID_PROOF_PERIOD", "Enter a valid financial period with an ending year after the starting year.");
      }
      if (Date.UTC(periodEndYear, 2, 31, 23, 59, 59, 999) < Date.now()) {
        throw new MobileOnboardingError(400, "EXPIRED_BUSINESS_PROOF", "The uploaded business certificate has expired.");
      }
    }
    legalProofMeta = {
      documentType: documentType as "gst" | "trade-license" | "udyam" | "other",
      certificateNumber, issuingAuthority, issueDate,
      validityType: validityType as "exact_date" | "financial_period" | "no_expiry",
      ...(validityType === "exact_date" ? { validUntil } : {}),
      ...(validityType === "no_expiry" ? { noExpiry: true } : {}),
      ...(validityType === "financial_period" ? { periodStartYear, periodEndYear } : {}),
    };
  }

  const captureMetadata = category === "business_document" ? null : validateLiveCaptureMetadata(input.captureMetadata);
  const ext = mimeType === "application/pdf" ? "pdf" : mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const evidenceId = crypto.randomUUID();
  const captureTimestamp = new Date().toISOString();
  const path = `${user.id}/registration/${evidenceId}/${category}.${ext}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const evidenceBindingSha256 = createHash("sha256").update(bytes).update("\n").update(JSON.stringify(captureMetadata ?? {})).digest("hex");

  const { error } = await supabase.storage
    .from("registration-evidence")
    .upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "0",
    });
  if (error) throw error;

  const serverReceivedAt = new Date().toISOString();
  return {
    id: evidenceId,
    bucket: "registration-evidence",
    path,
    url: null,
    name: clean(input.name) || `${category}.${ext}`,
    size: bytes.length,
    mimeType,
    sha256,
    evidenceBindingSha256,
    captureMetadata,
    kind: category === "business_document" ? "document" : "image",
    captureSource: category === "business_document" ? "file_upload" : "live_camera",
    captureTimestamp,
    serverReceivedAt,
    evidenceCategory: category,
    ...(category === "business_document" ? { legalProofMeta } : {}),
  };
}

export async function attachMobileEvidence(supabase: SupabaseClient, user: User, asset: MobileEvidenceAsset) {
  const category = asset.evidenceCategory;
  if (category === "selfie") {
    if (user.user_metadata?.registration_path === "individual_professional") {
      const { error } = await supabase.from("individual_professional_profiles").upsert({ user_id: user.id, verified_selfie_json: asset, selfie_verification_status: "captured" }, { onConflict: "user_id" }); if (error) throw error;
    } else {
      const { error } = await supabase.from("business_profiles").update({ selfie_media_json: asset, selfie_capture_status: "captured" }).eq("user_id", user.id); if (error) throw error;
    }
  } else if (category === "business_document" || category === "business_practical_photo") {
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
