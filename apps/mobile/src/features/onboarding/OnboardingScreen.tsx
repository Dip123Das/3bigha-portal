import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import * as Location from "expo-location";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getNativeSupabase } from "@/lib/auth/supabase";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { loadOnboarding, performOnboardingAction, type MobileOnboardingPath, type MobileOnboardingState } from "./api";

type CaptureCategory = "selfie" | "work_photo_one" | "work_photo_two" | "business_practical_photo";
type VerifiedCaptureLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  locationTimestamp: string;
  locationAgeMs: number;
  mocked: boolean | null;
};
type Form = {
  fullName: string; phone: string; state: string; district: string; pincode: string;
  businessName: string; businessType: string; city: string;
  contactPerson: string; phonePrimary: string; phoneWhatsapp: string; emailBusiness: string;
  gstin: string; pan: string; tradeLicenseNo: string; udyamNo: string;
  addressLine1: string; addressLine2: string; landmark: string; premisesType: string;
  housePlotFlatNo: string; buildingMarketName: string; streetRoadLocality: string;
  deliveryRadiusKm: string; preferredServiceArea: string; statewideService: boolean; nationwideService: boolean;
  reraRegistrationNo: string; reraState: string; reraExpiryDate: string;
  authorDisplayName: string; authorCategory: string; authorBio: string; authorPortfolioUrl: string;
  aboutPerson: string; aboutBusiness: string;
  proofDocumentType: string; proofCertificateNumber: string; proofIssuingAuthority: string; proofIssueDate: string;
  proofValidityType: string; proofValidUntil: string; proofPeriodStartYear: string; proofPeriodEndYear: string;
};
type ProfessionalForm = {
  secondarySkills: string[]; yearsExperience: string; availabilityStatus: string; serviceRadiusKm: string;
  dailyWage: boolean; hourlyWork: boolean; perJobWork: boolean; workerDeclarationAccepted: boolean;
  originalNameWarningAccepted: boolean; identityDocumentType: string; identityDocumentMaskedReference: string;
  identityDocumentConsentAccepted: boolean;
};

export function OnboardingScreen({ session }: { session: Session }) {
  const [state, setState] = useState<MobileOnboardingState | null>(null);
  const [path, setPath] = useState<MobileOnboardingPath>("customer");
  const [identity, setIdentity] = useState("customer");
  const [form, setForm] = useState<Form>({
    fullName: "", phone: "", state: "", district: "", pincode: "", businessName: "", businessType: "", city: "",
    contactPerson: "", phonePrimary: "", phoneWhatsapp: "", emailBusiness: "",
    gstin: "", pan: "", tradeLicenseNo: "", udyamNo: "",
    addressLine1: "", addressLine2: "", landmark: "", premisesType: "", housePlotFlatNo: "", buildingMarketName: "", streetRoadLocality: "",
    deliveryRadiusKm: "", preferredServiceArea: "", statewideService: false, nationwideService: false,
    reraRegistrationNo: "", reraState: "", reraExpiryDate: "",
    authorDisplayName: "", authorCategory: "", authorBio: "", authorPortfolioUrl: "",
    aboutPerson: "", aboutBusiness: "",
    proofDocumentType: "gst", proofCertificateNumber: "", proofIssuingAuthority: "", proofIssueDate: "",
    proofValidityType: "exact_date", proofValidUntil: "", proofPeriodStartYear: "", proofPeriodEndYear: "",
  });
  const [professionalForm, setProfessionalForm] = useState<ProfessionalForm>({
    secondarySkills: [], yearsExperience: "", availabilityStatus: "available", serviceRadiusKm: "25",
    dailyWage: true, hourlyWork: false, perJobWork: true, workerDeclarationAccepted: false,
    originalNameWarningAccepted: false, identityDocumentType: "", identityDocumentMaskedReference: "",
    identityDocumentConsentAccepted: false,
  });
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [businessIdentities, setBusinessIdentities] = useState<string[]>([]);
  const [individualIdentities, setIndividualIdentities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [capture, setCapture] = useState<CaptureCategory | null>(null);
  const [captureLocation, setCaptureLocation] = useState<VerifiedCaptureLocation | null>(null);
  const [captureOpenedAt, setCaptureOpenedAt] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const refresh = async () => {
    const next = await loadOnboarding(session);
    setState(next);
    if (next.path) setPath(next.path);
    if (next.primaryIdentityKey) setIdentity(next.primaryIdentityKey);
    setForm((current) => ({
      ...current, ...next.profile,
      businessName: next.business.businessName || current.businessName, businessType: next.business.businessType || current.businessType,
      contactPerson: next.business.contactPerson || next.profile.fullName || current.contactPerson,
      phonePrimary: next.business.phonePrimary || next.profile.phone || current.phonePrimary,
      phoneWhatsapp: next.business.phoneWhatsapp || current.phoneWhatsapp, emailBusiness: next.business.emailBusiness || current.emailBusiness,
      gstin: next.business.gstin || current.gstin, pan: next.business.pan || current.pan,
      tradeLicenseNo: next.business.tradeLicenseNo || current.tradeLicenseNo, udyamNo: next.business.udyamNo || current.udyamNo,
      addressLine1: next.business.addressLine1 || current.addressLine1, addressLine2: next.business.addressLine2 || current.addressLine2,
      landmark: next.business.landmark || current.landmark, premisesType: next.business.premisesType || current.premisesType,
      housePlotFlatNo: next.business.housePlotFlatNo || current.housePlotFlatNo, buildingMarketName: next.business.buildingMarketName || current.buildingMarketName,
      streetRoadLocality: next.business.streetRoadLocality || current.streetRoadLocality,
      state: next.business.state || next.profile.state || current.state, district: next.business.district || next.profile.district || current.district,
      pincode: next.business.pincode || next.profile.pincode || current.pincode, city: next.business.city || next.profile.district || current.city,
      deliveryRadiusKm: next.business.deliveryRadiusKm == null ? current.deliveryRadiusKm : String(next.business.deliveryRadiusKm),
      preferredServiceArea: next.business.preferredServiceArea || current.preferredServiceArea,
      statewideService: next.business.statewideService, nationwideService: next.business.nationwideService,
      reraRegistrationNo: next.business.reraRegistrationNo || current.reraRegistrationNo, reraState: next.business.reraState || current.reraState,
      reraExpiryDate: next.business.reraExpiryDate || current.reraExpiryDate,
      authorDisplayName: next.business.authorDisplayName || current.authorDisplayName, authorCategory: next.business.authorCategory || current.authorCategory,
      authorBio: next.business.authorBio || current.authorBio, authorPortfolioUrl: next.business.authorPortfolioUrl || current.authorPortfolioUrl,
      aboutPerson: next.business.aboutPerson || current.aboutPerson, aboutBusiness: next.business.aboutBusiness || current.aboutBusiness,
    }));
    const professional = next.professional ?? null;
    setProfessionalForm((current) => ({
      ...current,
      secondarySkills: Array.isArray(professional?.secondarySkillKeys) ? professional.secondarySkillKeys : [],
      yearsExperience: professional?.yearsExperience == null ? current.yearsExperience : String(professional.yearsExperience),
      availabilityStatus: professional?.availabilityStatus || current.availabilityStatus,
      serviceRadiusKm: professional?.serviceRadiusKm == null ? current.serviceRadiusKm : String(professional.serviceRadiusKm),
      dailyWage: professional?.dailyWage ?? current.dailyWage,
      hourlyWork: professional?.hourlyWork ?? current.hourlyWork,
      perJobWork: professional?.perJobWork ?? current.perJobWork,
      workerDeclarationAccepted: professional?.workerDeclarationAccepted ?? current.workerDeclarationAccepted,
      originalNameWarningAccepted: professional?.originalNameWarningAccepted ?? current.originalNameWarningAccepted,
      identityDocumentType: professional?.identityDocumentType || current.identityDocumentType,
      identityDocumentMaskedReference: professional?.identityDocumentMaskedReference || current.identityDocumentMaskedReference,
    }));
    setBusinessIdentities(next.business.businessIdentities);
    setIndividualIdentities(next.business.individualIdentities);
    setSelectedSectors(Array.from(new Set(
      next.catalogue.sectorMappings
        .filter((mapping) => next.business.businessIdentities.includes(mapping.identityKey))
        .map((mapping) => mapping.sectorKey),
    )));
  };

  useEffect(() => { void refresh().catch((error) => setMessage(error.message)); }, [session.access_token]);

  const options = useMemo(() => (state?.identityOptions ?? []).filter((item) => {
    if (path === "customer") return item.key === "customer";
    if (path === "business") return item.registrationScopes.includes("business_identity");
    return item.registrationScopes.includes("individual_skill") && item.lifetimeFreeCandidate && !item.redirectToBusiness;
  }), [path, state?.identityOptions]);

  const businessIdentityOptions = useMemo(
    () => (state?.identityOptions ?? []).filter((item) => item.registrationScopes.includes("business_identity")),
    [state?.identityOptions],
  );
  const personalRoleOptions = useMemo(
    () => (state?.identityOptions ?? []).filter((item) => item.registrationScopes.includes("business_personal_role")),
    [state?.identityOptions],
  );
  const derivedNature = useMemo(() => Array.from(new Set(
    (state?.catalogue.sectorMappings ?? [])
      .filter((mapping) => businessIdentities.includes(mapping.identityKey))
      .flatMap((mapping) => mapping.natureModules),
  )), [businessIdentities, state?.catalogue.sectorMappings]);
  const isPureBlogOnly = derivedNature.includes("blog") && !derivedNature.some((item) => ["property", "materials", "services", "rentals"].includes(item));

  function toggleValue(value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function toggleSector(value: string) {
    const next = selectedSectors.includes(value)
      ? selectedSectors.filter((item) => item !== value)
      : [...selectedSectors, value];
    const visibleIdentityKeys = new Set(
      (state?.catalogue.sectorMappings ?? [])
        .filter((mapping) => next.includes(mapping.sectorKey))
        .map((mapping) => mapping.identityKey),
    );
    if (path === "business" && businessIdentities.includes(identity) && !visibleIdentityKeys.has(identity)) {
      setMessage("Choose another primary operating identity before removing its sector.");
      return;
    }
    setSelectedSectors(next);
    setBusinessIdentities((identities) =>
      identities.filter((key) => visibleIdentityKeys.has(key)),
    );
  }

  function toggleBusinessIdentity(key: string) {
    if (key === identity && businessIdentities.includes(key)) {
      setMessage("Choose another primary operating identity before removing this Business Identity.");
      return;
    }
    toggleValue(key, setBusinessIdentities);
  }

  function chooseIdentity(key: string, selectedPath = path) {
    setIdentity(key);
    if (selectedPath !== "business") return;
    setBusinessIdentities((current) =>
      current.includes(key) ? current : [...current, key],
    );
    const sectors = (state?.catalogue.sectorMappings ?? [])
      .filter((mapping) => mapping.identityKey === key)
      .map((mapping) => mapping.sectorKey);
    setSelectedSectors((current) =>
      Array.from(new Set([...current, ...sectors])),
    );
  }

  function choosePath(nextPath: MobileOnboardingPath) {
    setPath(nextPath);
    setActiveStep(0);
    const first = state?.identityOptions.find((option) =>
      nextPath === "customer"
        ? option.key === "customer"
        : nextPath === "business"
          ? option.registrationScopes.includes("business_identity")
          : option.registrationScopes.includes("individual_skill") && option.lifetimeFreeCandidate && !option.redirectToBusiness,
    );
    if (first) chooseIdentity(first.key, nextPath);
  }

  async function run(action: string, payload: Record<string, unknown>, success: string): Promise<boolean> {
    setBusy(true); setMessage(null);
    try { setState(await performOnboardingAction(session, action, payload)); setMessage(success); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : "The action could not be completed."); return false; }
    finally { setBusy(false); }
  }

  async function declareAndSave(): Promise<boolean> {
    const chosen = options.find((item) => item.key === identity) ?? options[0];
    if (!chosen) { setMessage("Choose an identity from the current 3Bigha catalogue."); return false; }
    const declared = await run("declare_identity", { path, identityKeys: [chosen.key], primaryIdentityKey: chosen.key }, "Identity declared from the canonical register.");
    if (!declared) return false;
    return run("save_profile", { path, identityLabel: chosen.label, ...form }, path === "customer" ? "Customer setup complete." : "Essential profile saved.");
  }

  async function saveBusiness(): Promise<boolean> {
    return run("save_business", {
      businessName: form.businessName, businessType: form.businessType, businessSectors: selectedSectors,
      businessIdentities, individualIdentities, contactPerson: form.contactPerson || form.fullName,
      phonePrimary: form.phonePrimary || form.phone, phoneWhatsapp: form.phoneWhatsapp, emailBusiness: form.emailBusiness,
      gstin: form.gstin, pan: form.pan, tradeLicenseNo: form.tradeLicenseNo, udyamNo: form.udyamNo,
      addressLine1: form.addressLine1, addressLine2: form.addressLine2, landmark: form.landmark, premisesType: form.premisesType,
      housePlotFlatNo: form.housePlotFlatNo, buildingMarketName: form.buildingMarketName, streetRoadLocality: form.streetRoadLocality,
      state: form.state, district: form.district, city: form.city, pincode: form.pincode,
      deliveryRadiusKm: form.deliveryRadiusKm, preferredServiceArea: form.preferredServiceArea,
      statewideService: form.statewideService, nationwideService: form.nationwideService,
      reraRegistrationNo: form.reraRegistrationNo, reraState: form.reraState, reraExpiryDate: form.reraExpiryDate,
      authorDisplayName: form.authorDisplayName, authorCategory: form.authorCategory, authorBio: form.authorBio,
      authorPortfolioUrl: form.authorPortfolioUrl, aboutPerson: form.aboutPerson, aboutBusiness: form.aboutBusiness,
    }, "Business identity, contact details and operating address saved.");
  }

  async function saveProfessional(): Promise<boolean> {
    const secondarySkillKeys = professionalForm.secondarySkills;
    return run("save_professional", {
      primarySkillKey: identity, secondarySkillKeys, fullName: form.fullName, phone: form.phone,
      yearsExperience: professionalForm.yearsExperience, availabilityStatus: professionalForm.availabilityStatus,
      serviceRadiusKm: professionalForm.serviceRadiusKm, dailyWage: professionalForm.dailyWage,
      hourlyWork: professionalForm.hourlyWork, perJobWork: professionalForm.perJobWork,
      workerDeclarationAccepted: professionalForm.workerDeclarationAccepted,
      originalNameWarningAccepted: professionalForm.originalNameWarningAccepted,
      identityDocumentType: professionalForm.identityDocumentType,
      identityDocumentMaskedReference: professionalForm.identityDocumentMaskedReference,
      identityDocumentConsentAccepted: professionalForm.identityDocumentConsentAccepted,
    }, "Professional work preferences and declarations saved.");
  }

  async function verifyLocation() {
    setBusy(true); setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Allow precise location to verify the operating place.");
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setState(await performOnboardingAction(session, "verify_location", { latitude: point.coords.latitude, longitude: point.coords.longitude, accuracy: point.coords.accuracy }));
      setMessage("Live-device location verified.");
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Location could not be verified."); return false; }
    finally { setBusy(false); }
  }

  async function openCamera(category: CaptureCategory) {
    setBusy(true); setMessage(null);
    try {
      const cameraAccess = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!cameraAccess.granted) throw new Error("Camera permission is required for live evidence.");
      const locationAccess = await Location.requestForegroundPermissionsAsync();
      if (locationAccess.status !== "granted") throw new Error("Precise location is required for verified live evidence.");
      if (!(await Location.hasServicesEnabledAsync())) throw new Error("Turn on device location services before opening the verified camera.");
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, mayShowUserSettingsDialog: true });
      const accuracy = point.coords.accuracy;
      if (accuracy == null || accuracy > 100) throw new Error("A GPS accuracy of 100 metres or better is required. Move to an open area and try again.");
      const locationAgeMs = Math.max(0, Date.now() - point.timestamp);
      if (locationAgeMs > 30_000) throw new Error("The GPS reading became stale. Open the camera again.");
      setCaptureLocation({
        latitude: point.coords.latitude, longitude: point.coords.longitude, accuracy,
        altitude: point.coords.altitude, altitudeAccuracy: point.coords.altitudeAccuracy,
        heading: point.coords.heading, speed: point.coords.speed,
        locationTimestamp: new Date(point.timestamp).toISOString(), locationAgeMs,
        mocked: typeof point.mocked === "boolean" ? point.mocked : null,
      });
      setCaptureOpenedAt(new Date().toISOString());
      setCapture(category);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verified live capture could not be prepared.");
    } finally { setBusy(false); }
  }

  async function takeLivePhoto() {
    if (!capture || !camera.current || !captureLocation || !captureOpenedAt) return;
    setBusy(true);
    try {
      const preCaptureLocationAgeMs = Math.max(0, Date.now() - Date.parse(captureLocation.locationTimestamp));
      if (preCaptureLocationAgeMs > 60_000) throw new Error("The GPS reading is no longer fresh. Reopen the verified camera.");

      const photo = await camera.current.takePictureAsync({ base64: true, quality: 0.68 });
      if (!photo?.base64) throw new Error("The live photo could not be prepared.");

      const deviceCapturedAt = new Date().toISOString();
      const locationAgeMs = Math.max(0, Date.parse(deviceCapturedAt) - Date.parse(captureLocation.locationTimestamp));
      const captureMetadata = {
        ...captureLocation, locationAgeMs, cameraOpenedAt: captureOpenedAt, deviceCapturedAt,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        utcOffsetMinutes: -new Date().getTimezoneOffset(), platform: Platform.OS,
        cameraFacing: capture === "selfie" ? "front" : "back",
      };
      setState(await performOnboardingAction(session, "upload_evidence", {
        category: capture, captureSource: "live_camera", name: `${capture}.jpg`,
        dataUrl: `data:image/jpeg;base64,${photo.base64}`, captureMetadata,
      }));
      setCapture(null); setCaptureLocation(null); setCaptureOpenedAt(null);
      setMessage("GPS-bound live evidence saved for verification.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The live photo could not be saved."); }
    finally { setBusy(false); }
  }

  async function chooseDocument() {
    if (!form.proofCertificateNumber.trim() || !form.proofIssuingAuthority.trim() || !form.proofIssueDate.trim()) {
      setMessage("Enter the certificate number, issuing authority and issue date before uploading proof.");
      return;
    }
    if (form.proofValidityType === "exact_date" && !form.proofValidUntil.trim()) {
      setMessage("Enter the certificate expiry date or choose another validity type.");
      return;
    }
    if (form.proofValidityType === "financial_period" && (!form.proofPeriodStartYear.trim() || !form.proofPeriodEndYear.trim())) {
      setMessage("Enter both financial-period years.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    setBusy(true);
    try {
      const file = result.assets[0];
      const base64 = await readAsStringAsync(file.uri, { encoding: "base64" });
      setState(await performOnboardingAction(session, "upload_evidence", {
        category: "business_document", captureSource: "file_upload", name: file.name,
        dataUrl: `data:${file.mimeType || "application/pdf"};base64,${base64}`,
        legalProofMeta: {
          documentType: form.proofDocumentType, certificateNumber: form.proofCertificateNumber,
          issuingAuthority: form.proofIssuingAuthority, issueDate: form.proofIssueDate,
          validityType: form.proofValidityType,
          ...(form.proofValidityType === "exact_date" ? { validUntil: form.proofValidUntil } : {}),
          ...(form.proofValidityType === "financial_period" ? { periodStartYear: form.proofPeriodStartYear, periodEndYear: form.proofPeriodEndYear } : {}),
        },
      }));
      setMessage("Business proof uploaded for protected review.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The document could not be uploaded."); }
    finally { setBusy(false); }
  }

  if (!state && message) return <SafeAreaView style={styles.center}>
    <Text accessibilityRole="header" style={styles.sectionTitle}>Registration could not be loaded</Text>
    <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.muted}>{message}</Text>
    <Pressable
      accessibilityLabel="Retry loading registration"
      accessibilityRole="button"
      onPress={() => {
        setMessage(null);
        void refresh().catch((error) =>
          setMessage(error instanceof Error ? error.message : "Registration could not be loaded."),
        );
      }}
      style={styles.primary}
    >
      <Text style={styles.primaryText}>Retry</Text>
    </Pressable>
    <Pressable
      accessibilityLabel="Sign out on this device"
      accessibilityRole="button"
      onPress={() => void getNativeSupabase()?.auth.signOut({ scope: "local" })}
    >
      <Text style={styles.signout}>Sign out on this device</Text>
    </Pressable>
  </SafeAreaView>;
  if (!state) return <SafeAreaView accessibilityLabel="Preparing your canonical identity" accessibilityRole="progressbar" style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text accessibilityLiveRegion="polite" style={styles.muted}>Preparing your canonical identity…</Text></SafeAreaView>;
  if (capture) return <SafeAreaView style={styles.cameraPage}><CameraView accessibilityLabel="Verified live camera preview" ref={camera} facing={capture === "selfie" ? "front" : "back"} style={styles.camera} />{captureLocation && <View style={styles.verificationOverlay}><Text style={styles.verificationTitle}>LIVE VERIFIED CAPTURE</Text><Text style={styles.verificationText}>{new Date().toLocaleString()}</Text><Text style={styles.verificationText}>{captureLocation.latitude.toFixed(6)}, {captureLocation.longitude.toFixed(6)}</Text><Text style={styles.verificationText}>GPS accuracy ±{Math.round(captureLocation.accuracy)} m</Text>{captureLocation.mocked === true && <Text style={styles.verificationWarning}>Mock location detected</Text>}</View>}<View style={styles.cameraControls}><Pressable accessibilityLabel="Cancel live photo" accessibilityRole="button" hitSlop={8} onPress={() => { setCapture(null); setCaptureLocation(null); setCaptureOpenedAt(null); }} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable accessibilityLabel="Capture GPS-bound live photo" accessibilityRole="button" accessibilityState={{ busy, disabled: busy || !captureLocation }} disabled={busy || !captureLocation} onPress={() => void takeLivePhoto()} style={styles.primary}><Text style={styles.primaryText}>{busy ? "Saving…" : "Capture verified photo"}</Text></Pressable></View></SafeAreaView>;

  const steps = path === "business"
    ? ["Pathway", "Profile", "Business identity", "Business details", "Contact", "Address", "Proof", "Review"]
    : path === "individual_professional"
      ? ["Pathway", "Profile", "Professional details", "Live evidence", "Review"]
      : ["Pathway", "Profile"];

  async function continueStep() {
    if (busy || !state) return;
    if (activeStep === 0) {
      setActiveStep(1);
      return;
    }
    if (activeStep === 1) {
      const saved = await declareAndSave();
      if (saved && path !== "customer") setActiveStep(2);
      return;
    }
    if (path === "business" && activeStep === 2) {
      if (!businessIdentities.length) { setMessage("Select at least one Business Identity."); return; }
      setActiveStep(3);
      return;
    }
    if (path === "business" && activeStep === 3) { setActiveStep(4); return; }
    if (path === "business" && activeStep === 4) {
      if (!(form.contactPerson || form.fullName).trim() || (!(form.phonePrimary || form.phone).trim() && !form.emailBusiness.trim())) {
        setMessage("Enter a Contact Person and either a business phone number or business email.");
        return;
      }
      setActiveStep(5);
      return;
    }
    if (path === "business" && activeStep === 5) {
      if (!form.state.trim() || !form.district.trim() || !form.city.trim()) {
        setMessage("Enter the State, District and locality/city for the business.");
        return;
      }
      if (await saveBusiness() && await verifyLocation()) setActiveStep(6);
      return;
    }
    if (path === "business" && activeStep === 6) {
      if (!state.evidence.selfieCaptured || !state.evidence.businessPracticalPhotoCount || (!isPureBlogOnly && !state.evidence.completeBusinessProofCount)) {
        setMessage(isPureBlogOnly
          ? "Capture the live selfie and workplace evidence before continuing."
          : "Capture the live selfie and workplace evidence, and upload business proof before continuing.");
        return;
      }
      setActiveStep(7);
      return;
    }
    if (path === "individual_professional" && activeStep === 2) {
      if (await saveProfessional()) setActiveStep(3);
      return;
    }
    if (path === "individual_professional" && activeStep === 3) {
      if (!state.evidence.selfieCaptured || state.evidence.workPhotoCount < 2) {
        setMessage("Capture the live selfie and both work photographs before continuing.");
        return;
      }
      setActiveStep(4);
    }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={styles.brand}>3Bigha · Business Operating System</Text>
    <Text style={styles.eyebrow}>CANONICAL REGISTRATION</Text>
    <Text accessibilityRole="header" style={styles.title}>Complete your registration step by step</Text>
    <Text style={styles.body}>The app uses the same 3Bigha account, identity register and verification authority as the website.</Text>
    <View accessibilityLabel={`Step ${activeStep + 1} of ${steps.length}: ${steps[activeStep]}`} accessibilityRole="progressbar" style={{ flexDirection: "row", gap: 6, marginVertical: spacing.sm }}>
      {steps.map((label, index) => <View key={label} style={{ flex: 1, gap: 5 }}>
        <View style={{ height: 5, borderRadius: 5, backgroundColor: index <= activeStep ? colors.brand : colors.border }} />
        <Text style={{ color: index === activeStep ? colors.brand : colors.muted, fontSize: 11, fontWeight: index === activeStep ? "800" : "500" }}>{index + 1}. {label}</Text>
      </View>)}
    </View>

    {activeStep === 0 && <Section title="1. Choose your pathway and identity">
      <Text style={styles.muted}>Choose how you will use 3Bigha. You can add another authorised identity later.</Text>
      <View style={styles.row}>{(["customer", "business", "individual_professional"] as const).map((item) => <Choice key={item} active={path === item} label={item === "individual_professional" ? "Skilled Professional" : item === "business" ? "Business / Organisation" : "Customer / Buyer"} onPress={() => choosePath(item)} />)}</View>
      <Text style={styles.label}>{path === "business" ? "Primary operating identity" : "Choose your identity"}</Text>
      <View style={styles.options}>{options.map((item) => <Choice key={item.key} active={identity === item.key} label={item.localLabel ? `${item.label} (${item.localLabel})` : item.label} onPress={() => chooseIdentity(item.key)} />)}</View>
    </Section>}

    {activeStep === 1 && <Section title="2. Essential profile">
      <Field label={path === "individual_professional" ? "Complete original name" : "Full name"} value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v, contactPerson: form.contactPerson || v })} />
      <Field label="Mobile number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v, phonePrimary: form.phonePrimary || v })} />
      {path === "customer" && <>
        <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
        <Field label="District / City" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
        <Field label="PIN code (optional)" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
        <Text style={styles.muted}>Customers do not need business proof, work photographs or professional verification.</Text>
      </>}
      {path === "individual_professional" && <Text style={styles.muted}>Use your complete original name. You will confirm it in the professional declarations step.</Text>}
      {path === "business" && <Text style={styles.muted}>Business contact and operating address details are collected in their own steps.</Text>}
    </Section>}

    {path === "business" && activeStep === 2 && <Section title="3. Business identity">
      <Field label="Business name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
      <Text accessibilityRole="header" style={styles.sectionTitle}>Legal Constitution</Text>
      <Text style={styles.muted}>Select how the organisation is legally constituted.</Text>
      <View style={styles.options}>{state.catalogue.legalConstitutions.map((item) => <Choice key={item.key} active={form.businessType === item.key} label={item.label} onPress={() => setForm({ ...form, businessType: item.key })} />)}</View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Business Sectors</Text>
      <Text style={styles.muted}>Choose the sectors in which the organisation actually works.</Text>
      <View style={styles.options}>{state.catalogue.businessSectors.map((item) => <MultiChoice key={item.key} active={selectedSectors.includes(item.key)} label={`${item.symbol ? `${item.symbol} ` : ""}${item.title}`} onPress={() => toggleSector(item.key)} />)}</View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Business Identities</Text>
      {!selectedSectors.length && <Text style={styles.muted}>Select one or more sectors to show the relevant Business Identities.</Text>}
      {selectedSectors.map((sectorKey) => {
        const sector = state.catalogue.businessSectors.find((item) => item.key === sectorKey);
        const mappedKeys = new Set(state.catalogue.sectorMappings.filter((mapping) => mapping.sectorKey === sectorKey).map((mapping) => mapping.identityKey));
        const sectorOptions = businessIdentityOptions.filter((item) => mappedKeys.has(item.key));
        return <View key={sectorKey}><Text style={styles.label}>{sector?.title ?? sectorKey}</Text><View style={styles.options}>{sectorOptions.map((item) => <MultiChoice key={`${sectorKey}-${item.key}`} active={businessIdentities.includes(item.key)} label={item.label} onPress={() => toggleBusinessIdentity(item.key)} />)}</View></View>;
      })}
      <Text accessibilityRole="header" style={styles.sectionTitle}>Your Individual Identity</Text>
      <Text style={styles.muted}>Optionally select the roles you personally perform.</Text>
      <View style={styles.options}>{personalRoleOptions.map((item) => <MultiChoice key={item.key} active={individualIdentities.includes(item.key)} label={item.label} onPress={() => toggleValue(item.key, setIndividualIdentities)} />)}</View>
      <View style={styles.message}><Text style={styles.label}>Derived workspaces</Text><Text style={styles.muted}>{derivedNature.length ? derivedNature.map((item) => item.replace(/_/g, " ")).join(", ") : "Select at least one Business Identity."}</Text></View>
    </Section>}

    {path === "business" && activeStep === 3 && <Section title="4. Business details">
      <Text style={styles.muted}>Add the registration details that apply to your organisation.</Text>
      <Field label="GSTIN" value={form.gstin} onChange={(v) => setForm({ ...form, gstin: v.toUpperCase() })} />
      <Field label="PAN" value={form.pan} onChange={(v) => setForm({ ...form, pan: v.toUpperCase() })} />
      <Field label="Trade License Number" value={form.tradeLicenseNo} onChange={(v) => setForm({ ...form, tradeLicenseNo: v })} />
      <Field label="UDYAM Registration Number" value={form.udyamNo} onChange={(v) => setForm({ ...form, udyamNo: v })} />
      <Field label="About the person (optional)" value={form.aboutPerson} onChange={(v) => setForm({ ...form, aboutPerson: v })} />
      <Field label="About the business (optional)" value={form.aboutBusiness} onChange={(v) => setForm({ ...form, aboutBusiness: v })} />
      {derivedNature.includes("property") && <>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Property Compliance (RERA)</Text>
        <Field label="RERA Registration Number (optional)" value={form.reraRegistrationNo} onChange={(v) => setForm({ ...form, reraRegistrationNo: v })} />
        <Field label="RERA State (optional)" value={form.reraState} onChange={(v) => setForm({ ...form, reraState: v })} />
        <Field label="RERA Expiry Date (YYYY-MM-DD, optional)" value={form.reraExpiryDate} onChange={(v) => setForm({ ...form, reraExpiryDate: v })} />
      </>}
      {derivedNature.includes("blog") && <>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Author / Writer Identity</Text>
        <Field label="Author Display Name" value={form.authorDisplayName} onChange={(v) => setForm({ ...form, authorDisplayName: v })} />
        <Field label="Author Category (optional)" value={form.authorCategory} onChange={(v) => setForm({ ...form, authorCategory: v })} />
        <Field label="Author Bio (optional)" value={form.authorBio} onChange={(v) => setForm({ ...form, authorBio: v })} />
        <Field label="Portfolio URL (optional)" value={form.authorPortfolioUrl} onChange={(v) => setForm({ ...form, authorPortfolioUrl: v })} />
      </>}
    </Section>}

    {path === "business" && activeStep === 4 && <Section title="5. Contact">
      <Field label="Contact Person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
      <Field label="Business Phone (or Business Email)" value={form.phonePrimary} onChange={(v) => setForm({ ...form, phonePrimary: v })} />
      <Field label="Business Email (or Business Phone)" value={form.emailBusiness} onChange={(v) => setForm({ ...form, emailBusiness: v })} />
      <Field label="WhatsApp (optional)" value={form.phoneWhatsapp} onChange={(v) => setForm({ ...form, phoneWhatsapp: v })} />
    </Section>}

    {path === "business" && activeStep === 5 && <Section title="6. Official address and service area">
      <Text style={styles.muted}>Enter your official operating address. GPS verification runs once when you continue.</Text>
      <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
      <Field label="District" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
      <Field label="Locality / City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
      <Field label="PIN Code (optional)" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
      <Field label="House / Plot / Flat No. (optional)" value={form.housePlotFlatNo} onChange={(v) => setForm({ ...form, housePlotFlatNo: v })} />
      <Field label="Building / Market Name (optional)" value={form.buildingMarketName} onChange={(v) => setForm({ ...form, buildingMarketName: v })} />
      <Field label="Street / Road / Locality" value={form.streetRoadLocality} onChange={(v) => setForm({ ...form, streetRoadLocality: v })} />
      <Field label="Address Line 1 (optional)" value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} />
      <Field label="Address Line 2 (optional)" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} />
      <Field label="Landmark (optional)" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
      <Field label="Premises Type (optional)" value={form.premisesType} onChange={(v) => setForm({ ...form, premisesType: v })} />
      <Field label="Delivery / Service Radius in KM (optional)" value={form.deliveryRadiusKm} onChange={(v) => setForm({ ...form, deliveryRadiusKm: v })} />
      <Field label="Preferred Service Area (optional)" value={form.preferredServiceArea} onChange={(v) => setForm({ ...form, preferredServiceArea: v })} />
      <MultiChoice active={form.statewideService} label="Serve throughout this State" onPress={() => setForm({ ...form, statewideService: !form.statewideService })} />
      <MultiChoice active={form.nationwideService} label="Serve throughout India" onPress={() => setForm({ ...form, nationwideService: !form.nationwideService })} />
    </Section>}

    {path === "business" && activeStep === 6 && <Section title="7. Proof and live evidence">
      <Text style={styles.muted}>Add the evidence requested during website registration. Selfie and workplace photos must use the live camera. Upload the matching business certificate.</Text>
      <Button busy={busy} label={state.evidence.selfieCaptured ? "Retake live selfie" : "Capture live selfie"} onPress={() => void openCamera("selfie")} />
      <Button busy={busy} label={state.evidence.businessPracticalPhotoCount ? "Retake workplace photo" : "Capture workplace photo"} onPress={() => void openCamera("business_practical_photo")} secondary />
      {!isPureBlogOnly && <>
        <Text accessibilityRole="header" style={styles.sectionTitle}>Business certificate details</Text>
        <View style={styles.options}>{[["gst", "GST certificate"], ["trade-license", "Trade licence"], ["udyam", "Udyam certificate"], ["other", "Other proof"]].map(([value, label]) => <Choice key={value} active={form.proofDocumentType === value} label={label} onPress={() => setForm({ ...form, proofDocumentType: value })} />)}</View>
        <Field label="Certificate / registration number" value={form.proofCertificateNumber} onChange={(v) => setForm({ ...form, proofCertificateNumber: v })} />
        <Field label="Issuing authority" value={form.proofIssuingAuthority} onChange={(v) => setForm({ ...form, proofIssuingAuthority: v })} />
        <Field label="Issue date (YYYY-MM-DD)" value={form.proofIssueDate} onChange={(v) => setForm({ ...form, proofIssueDate: v })} />
        <Text style={styles.label}>Validity</Text>
        <View style={styles.options}>{[["exact_date", "Expires on a date"], ["financial_period", "Financial period"], ["no_expiry", "No expiry"]].map(([value, label]) => <Choice key={value} active={form.proofValidityType === value} label={label} onPress={() => setForm({ ...form, proofValidityType: value })} />)}</View>
        {form.proofValidityType === "exact_date" && <Field label="Valid until (YYYY-MM-DD)" value={form.proofValidUntil} onChange={(v) => setForm({ ...form, proofValidUntil: v })} />}
        {form.proofValidityType === "financial_period" && <>
          <Field label="Period start year" value={form.proofPeriodStartYear} onChange={(v) => setForm({ ...form, proofPeriodStartYear: v })} />
          <Field label="Period end year" value={form.proofPeriodEndYear} onChange={(v) => setForm({ ...form, proofPeriodEndYear: v })} />
        </>}
        <Button busy={busy} label={state.evidence.completeBusinessProofCount ? "Upload another business proof" : "Upload business proof"} onPress={() => void chooseDocument()} secondary />
      </>}
    </Section>}

    {path === "individual_professional" && activeStep === 2 && <Section title="3. Your skill and work preferences">
      <Text accessibilityRole="header" style={styles.sectionTitle}>Other skills (optional)</Text>
      <View style={styles.options}>{options.filter((item) => item.key !== identity).map((item) => <MultiChoice key={item.key} active={professionalForm.secondarySkills.includes(item.key)} label={item.label} onPress={() => setProfessionalForm({ ...professionalForm, secondarySkills: professionalForm.secondarySkills.includes(item.key) ? professionalForm.secondarySkills.filter((key) => key !== item.key) : [...professionalForm.secondarySkills, item.key] })} />)}</View>
      <Field label="Years of experience (optional)" value={professionalForm.yearsExperience} onChange={(v) => setProfessionalForm({ ...professionalForm, yearsExperience: v })} />
      <Text accessibilityRole="header" style={styles.sectionTitle}>How you work</Text>
      <MultiChoice active={professionalForm.dailyWage} label="Daily-wage work" onPress={() => setProfessionalForm({ ...professionalForm, dailyWage: !professionalForm.dailyWage })} />
      <MultiChoice active={professionalForm.hourlyWork} label="Hourly work" onPress={() => setProfessionalForm({ ...professionalForm, hourlyWork: !professionalForm.hourlyWork })} />
      <MultiChoice active={professionalForm.perJobWork} label="Small per-job work" onPress={() => setProfessionalForm({ ...professionalForm, perJobWork: !professionalForm.perJobWork })} />
      <Text accessibilityRole="header" style={styles.sectionTitle}>Current availability</Text>
      <View style={styles.options}>{[["available", "Available for work"], ["partially_available", "Partially available"], ["currently_engaged", "Currently engaged"], ["not_available", "Not available now"]].map(([value, label]) => <Choice key={value} active={professionalForm.availabilityStatus === value} label={label} onPress={() => setProfessionalForm({ ...professionalForm, availabilityStatus: value })} />)}</View>
      <Field label="Service Radius in KM" value={professionalForm.serviceRadiusKm} onChange={(v) => setProfessionalForm({ ...professionalForm, serviceRadiusKm: v })} />
      <MultiChoice active={professionalForm.originalNameWarningAccepted} label="I confirm this is my complete original name." onPress={() => setProfessionalForm({ ...professionalForm, originalNameWarningAccepted: !professionalForm.originalNameWarningAccepted })} />
      <MultiChoice active={professionalForm.workerDeclarationAccepted} label="I personally perform this work; I am not registering as a contractor or labour-supply business." onPress={() => setProfessionalForm({ ...professionalForm, workerDeclarationAccepted: !professionalForm.workerDeclarationAccepted })} />
      <Text style={styles.muted}>Optional identity reference</Text>
      <Field label="Identity Document Type (optional)" value={professionalForm.identityDocumentType} onChange={(v) => setProfessionalForm({ ...professionalForm, identityDocumentType: v })} />
      {!!professionalForm.identityDocumentType && <>
        <Field label="Masked Document Reference" value={professionalForm.identityDocumentMaskedReference} onChange={(v) => setProfessionalForm({ ...professionalForm, identityDocumentMaskedReference: v })} />
        <MultiChoice active={professionalForm.identityDocumentConsentAccepted} label="I consent to submit this masked reference for identity review." onPress={() => setProfessionalForm({ ...professionalForm, identityDocumentConsentAccepted: !professionalForm.identityDocumentConsentAccepted })} />
      </>}
    </Section>}

    {path === "individual_professional" && activeStep === 3 && <Section title="4. Professional live evidence">
      <Text style={styles.muted}>Capture each item with the live camera. Gallery selection is disabled for selfie and work photographs.</Text>
      <Button busy={busy} label={state.evidence.selfieCaptured ? "Retake live selfie" : "Capture live selfie"} onPress={() => void openCamera("selfie")} />
      <Button busy={busy} label={state.evidence.workPhotoCount >= 1 ? "Retake work photograph 1" : "Capture work photograph 1"} onPress={() => void openCamera("work_photo_one")} secondary />
      <Button busy={busy} label={state.evidence.workPhotoCount >= 2 ? "Retake work photograph 2" : "Capture work photograph 2"} onPress={() => void openCamera("work_photo_two")} secondary />
    </Section>}

    {path !== "customer" && ((path === "business" && activeStep === 7) || (path === "individual_professional" && activeStep === 4)) && <Section title="Final step · Verification review">
      <Text style={styles.status}>{state.verification.status.replace(/_/g, " ")}</Text>
      <Text style={styles.muted}>{state.verification.canActivateDashboard ? "Your verified workspace can be activated." : "Your evidence is incomplete, pending automated checks, awaiting human review, or needs correction. Approval cannot be selected in the app."}</Text>
      {state.verification.reasons.map((reason) => <Text key={reason} style={styles.reason}>• {reason}</Text>)}
      <Button busy={busy} label="Submit for verification" onPress={() => void run("evaluate", {}, "Verification status refreshed.")} />
    </Section>}

    {message && <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.message}>{message}</Text>}
    <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
      {activeStep > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Previous registration step" onPress={() => { setActiveStep((current) => Math.max(0, current - 1)); setMessage(null); }} style={[styles.secondary, { flex: 1 }]}><Text style={styles.secondaryText}>Back</Text></Pressable>}
      {activeStep < steps.length - 1 && <Pressable accessibilityRole="button" accessibilityLabel="Continue registration step" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => void continueStep()} style={[styles.primary, { flex: 1 }]}><Text style={styles.primaryText}>{busy ? "Saving…" : activeStep === 1 && path === "customer" ? "Finish customer setup" : "Continue"}</Text></Pressable>}
    </View>
    <Pressable accessibilityLabel="Sign out on this device" accessibilityRole="button" hitSlop={8} onPress={() => void getNativeSupabase()?.auth.signOut({ scope: "local" })}><Text style={styles.signout}>Sign out on this device</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.card}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) { return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={styles.input} /></View>; }
function Choice({ active, label, onPress }: { active: boolean; label: string; onPress(): void }) { return <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: active, selected: active }} hitSlop={6} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function MultiChoice({ active, label, onPress }: { active: boolean; label: string; onPress(): void }) { return <Pressable accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked: active }} hitSlop={6} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{active ? "✓ " : ""}{label}</Text></Pressable>; }
function Button({ busy, label, onPress, secondary = false }: { busy: boolean; label: string; onPress(): void; secondary?: boolean }) { return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress} style={secondary ? styles.secondary : styles.primary}><Text style={secondary ? styles.secondaryText : styles.primaryText}>{busy ? "Please wait…" : label}</Text></Pressable>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.canvas }, page: { padding: spacing.lg, gap: spacing.md, maxWidth: 760, width: "100%", alignSelf: "center" }, brand: { color: colors.ink, fontWeight: "800", fontSize: 18 }, eyebrow: { color: colors.brand, fontWeight: "800", fontSize: typography.micro, letterSpacing: 1.1, marginTop: spacing.md }, title: { color: colors.ink, fontSize: 32, lineHeight: 39, fontWeight: "800" }, body: { color: colors.muted, fontSize: typography.body, lineHeight: 24 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, sectionTitle: { color: colors.ink, fontWeight: "800", fontSize: 19, marginBottom: spacing.xs }, label: { color: colors.ink, fontWeight: "700", fontSize: typography.caption, marginTop: spacing.xs }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.ink, backgroundColor: colors.canvas }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, options: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.xs, width: "100%" }, choice: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: "100%", flexShrink: 1 }, choiceActive: { backgroundColor: colors.brand, borderColor: colors.brand }, choiceText: { color: colors.ink, fontWeight: "700", fontSize: typography.caption, flexShrink: 1 }, choiceTextActive: { color: colors.onBrand }, primary: { backgroundColor: colors.brand, borderRadius: radii.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xs }, primaryText: { color: colors.onBrand, fontWeight: "800" }, secondary: { backgroundColor: colors.canvas, borderColor: colors.brand, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xs }, secondaryText: { color: colors.brand, fontWeight: "800" }, muted: { color: colors.muted, lineHeight: 20 }, status: { color: colors.brand, fontSize: 22, fontWeight: "800", textTransform: "capitalize" }, reason: { color: colors.ink }, message: { color: colors.brand, fontWeight: "700", padding: spacing.md, backgroundColor: colors.accentSoft, borderRadius: radii.md }, signout: { color: colors.muted, textAlign: "center", textDecorationLine: "underline", padding: spacing.lg }, cameraPage: { flex: 1, backgroundColor: "#000" }, camera: { flex: 1 }, verificationOverlay: { position: "absolute", left: spacing.md, right: spacing.md, top: spacing.lg, backgroundColor: "rgba(0,0,0,0.72)", borderRadius: radii.md, padding: spacing.md, gap: 3 }, verificationTitle: { color: "#fff", fontWeight: "900", letterSpacing: 0.8 }, verificationText: { color: "#fff", fontSize: typography.caption }, verificationWarning: { color: "#fff", fontWeight: "900" }, cameraControls: { padding: spacing.lg, flexDirection: "row", gap: spacing.md, backgroundColor: "#000" } });
