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

type CaptureCategory = "selfie" | "work_photo_one" | "work_photo_two";
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
type Form = { fullName: string; phone: string; state: string; district: string; pincode: string; businessName: string; businessType: string; city: string };

export function OnboardingScreen({ session }: { session: Session }) {
  const [state, setState] = useState<MobileOnboardingState | null>(null);
  const [path, setPath] = useState<MobileOnboardingPath>("customer");
  const [identity, setIdentity] = useState("customer");
  const [form, setForm] = useState<Form>({ fullName: "", phone: "", state: "", district: "", pincode: "", businessName: "", businessType: "", city: "" });
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [businessIdentities, setBusinessIdentities] = useState<string[]>([]);
  const [individualIdentities, setIndividualIdentities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
    setForm((current) => ({ ...current, ...next.profile, businessName: next.business.businessName || current.businessName, businessType: next.business.businessType || current.businessType, city: next.business.city || next.profile.district || current.city }));
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
    const first = state?.identityOptions.find((option) =>
      nextPath === "customer"
        ? option.key === "customer"
        : nextPath === "business"
          ? option.registrationScopes.includes("business_identity")
          : option.registrationScopes.includes("individual_skill") && option.lifetimeFreeCandidate && !option.redirectToBusiness,
    );
    if (first) chooseIdentity(first.key, nextPath);
  }

  async function run(action: string, payload: Record<string, unknown>, success: string) {
    setBusy(true); setMessage(null);
    try { setState(await performOnboardingAction(session, action, payload)); setMessage(success); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }

  async function declareAndSave() {
    const chosen = options.find((item) => item.key === identity) ?? options[0];
    if (!chosen) return setMessage("Choose an identity from the current 3Bigha catalogue.");
    await run("declare_identity", { path, identityKeys: [chosen.key], primaryIdentityKey: chosen.key }, "Identity declared from the canonical register.");
    await run("save_profile", { path, identityLabel: chosen.label, ...form }, path === "customer" ? "Customer setup complete." : "Essential profile saved.");
  }

  async function saveBusiness() {
    await run("save_business", { businessName: form.businessName, businessType: form.businessType, businessIdentities, individualIdentities, contactPerson: form.fullName, phone: form.phone, state: form.state, district: form.district, city: form.city, pincode: form.pincode }, "Canonical business identity and official LGD geography saved.");
  }

  async function verifyLocation() {
    setBusy(true); setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Allow precise location to verify the operating place.");
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setState(await performOnboardingAction(session, "verify_location", { latitude: point.coords.latitude, longitude: point.coords.longitude, accuracy: point.coords.accuracy }));
      setMessage("Live-device location verified.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Location could not be verified."); }
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
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    setBusy(true);
    try {
      const file = result.assets[0];
      const base64 = await readAsStringAsync(file.uri, { encoding: "base64" });
      setState(await performOnboardingAction(session, "upload_evidence", { category: "business_document", captureSource: "file_upload", name: file.name, dataUrl: `data:${file.mimeType || "application/pdf"};base64,${base64}` }));
      setMessage("Business proof uploaded for protected review.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The document could not be uploaded."); }
    finally { setBusy(false); }
  }

  if (!state) return <SafeAreaView accessibilityLabel="Preparing your canonical identity" accessibilityRole="progressbar" style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text accessibilityLiveRegion="polite" style={styles.muted}>Preparing your canonical identity…</Text></SafeAreaView>;
  if (capture) return <SafeAreaView style={styles.cameraPage}><CameraView accessibilityLabel="Verified live camera preview" ref={camera} facing={capture === "selfie" ? "front" : "back"} style={styles.camera} />{captureLocation && <View style={styles.verificationOverlay}><Text style={styles.verificationTitle}>LIVE VERIFIED CAPTURE</Text><Text style={styles.verificationText}>{new Date().toLocaleString()}</Text><Text style={styles.verificationText}>{captureLocation.latitude.toFixed(6)}, {captureLocation.longitude.toFixed(6)}</Text><Text style={styles.verificationText}>GPS accuracy ±{Math.round(captureLocation.accuracy)} m</Text>{captureLocation.mocked === true && <Text style={styles.verificationWarning}>Mock location detected</Text>}</View>}<View style={styles.cameraControls}><Pressable accessibilityLabel="Cancel live photo" accessibilityRole="button" hitSlop={8} onPress={() => { setCapture(null); setCaptureLocation(null); setCaptureOpenedAt(null); }} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable accessibilityLabel="Capture GPS-bound live photo" accessibilityRole="button" accessibilityState={{ busy, disabled: busy || !captureLocation }} disabled={busy || !captureLocation} onPress={() => void takeLivePhoto()} style={styles.primary}><Text style={styles.primaryText}>{busy ? "Saving…" : "Capture verified photo"}</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={styles.brand}>3Bigha · Business Operating System</Text>
    <Text style={styles.eyebrow}>MOB-04 · CANONICAL IDENTITY</Text><Text accessibilityRole="header" style={styles.title}>Tell us who you are—once.</Text><Text style={styles.body}>Your mobile registration uses the same identity, approval and verification authority as 3Bigha.com.</Text>
    <Section title="1. Your pathway">
      <View style={styles.row}>{(["customer", "business", "individual_professional"] as const).map((item) => <Choice key={item} active={path === item} label={item === "individual_professional" ? "Skilled Professional" : item === "business" ? "Business" : "Customer"} onPress={() => choosePath(item)} />)}</View>
      <Text style={styles.label}>{path === "business" ? "Primary operating identity" : "Identity from the live master register"}</Text><View style={styles.options}>{options.map((item) => <Choice key={item.key} active={identity === item.key} label={item.localLabel ? `${item.label} (${item.localLabel})` : item.label} onPress={() => chooseIdentity(item.key)} />)}</View>
    </Section>
    <Section title="2. Essential profile"><Field label="Original full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} /><Field label="Mobile number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /><Field label="State (official name)" value={form.state} onChange={(v) => setForm({ ...form, state: v })} /><Field label="District / City" value={form.district} onChange={(v) => setForm({ ...form, district: v })} /><Field label="PIN code" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} /><Button busy={busy} label="Declare identity and save profile" onPress={() => void declareAndSave()} /></Section>
    {path === "business" && <Section title="3. Business identity and operating place">
      <Field label="Business name" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />
      <Text accessibilityRole="header" style={styles.sectionTitle}>Legal Constitution</Text>
      <Text style={styles.muted}>Select how the organisation is legally constituted.</Text>
      <View style={styles.options}>{state.catalogue.legalConstitutions.map((item) => <Choice key={item.key} active={form.businessType === item.key} label={item.label} onPress={() => setForm({ ...form, businessType: item.key })} />)}</View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Business Sectors</Text>
      <Text style={styles.muted}>Choose the sectors in which the organisation actually works.</Text>
      <View style={styles.options}>{state.catalogue.businessSectors.map((item) => <MultiChoice key={item.key} active={selectedSectors.includes(item.key)} label={`${item.symbol ? `${item.symbol} ` : ""}${item.title}`} onPress={() => toggleSector(item.key)} />)}</View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>What does your organisation do?</Text>
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
      <Field label="Locality / City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
      <Button busy={busy} label="Save canonical business details" onPress={() => void saveBusiness()} />
      <Button busy={busy} label="Verify live GPS location" onPress={() => void verifyLocation()} secondary />
    </Section>}
    {path !== "customer" && <Section title={path === "business" ? "4. Proof and live evidence" : "3. Professional live evidence"}><Text style={styles.muted}>Gallery selection is disabled for the selfie and both work photographs.</Text><Button busy={busy} label={state.evidence.selfieCaptured ? "Retake live selfie" : "Capture live selfie"} onPress={() => void openCamera("selfie")} />{path === "individual_professional" && <><Button busy={busy} label="Capture work photograph 1" onPress={() => void openCamera("work_photo_one")} secondary /><Button busy={busy} label="Capture work photograph 2" onPress={() => void openCamera("work_photo_two")} secondary /></>}{path === "business" && <Button busy={busy} label="Upload business proof" onPress={() => void chooseDocument()} secondary />}</Section>}
    {path !== "customer" && <Section title="Verification status"><Text style={styles.status}>{state.verification.status.replace(/_/g, " ")}</Text><Text style={styles.muted}>{state.verification.canActivateDashboard ? "Your verified workspace can be activated." : "Your evidence is incomplete, pending automated checks, awaiting human review, or needs correction. Approval cannot be selected in the app."}</Text>{state.verification.reasons.map((reason) => <Text key={reason} style={styles.reason}>• {reason}</Text>)}<Button busy={busy} label="Submit for verification" onPress={() => void run("evaluate", {}, "Verification status refreshed.")} /></Section>}
    {message && <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.message}>{message}</Text>}
    <Pressable accessibilityLabel="Sign out on this device" accessibilityRole="button" hitSlop={8} onPress={() => void getNativeSupabase()?.auth.signOut({ scope: "local" })}><Text style={styles.signout}>Sign out on this device</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.card}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) { return <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={styles.input} /></View>; }
function Choice({ active, label, onPress }: { active: boolean; label: string; onPress(): void }) { return <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: active, selected: active }} hitSlop={6} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>; }
function MultiChoice({ active, label, onPress }: { active: boolean; label: string; onPress(): void }) { return <Pressable accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked: active }} hitSlop={6} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{active ? "✓ " : ""}{label}</Text></Pressable>; }
function Button({ busy, label, onPress, secondary = false }: { busy: boolean; label: string; onPress(): void; secondary?: boolean }) { return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={onPress} style={secondary ? styles.secondary : styles.primary}><Text style={secondary ? styles.secondaryText : styles.primaryText}>{busy ? "Please wait…" : label}</Text></Pressable>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.canvas }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.canvas }, page: { padding: spacing.lg, gap: spacing.md, maxWidth: 760, width: "100%", alignSelf: "center" }, brand: { color: colors.ink, fontWeight: "800", fontSize: 18 }, eyebrow: { color: colors.brand, fontWeight: "800", fontSize: typography.micro, letterSpacing: 1.1, marginTop: spacing.md }, title: { color: colors.ink, fontSize: 32, lineHeight: 39, fontWeight: "800" }, body: { color: colors.muted, fontSize: typography.body, lineHeight: 24 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, sectionTitle: { color: colors.ink, fontWeight: "800", fontSize: 19, marginBottom: spacing.xs }, label: { color: colors.ink, fontWeight: "700", fontSize: typography.caption, marginTop: spacing.xs }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.ink, backgroundColor: colors.canvas }, row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, maxHeight: 220 }, choice: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, choiceActive: { backgroundColor: colors.brand, borderColor: colors.brand }, choiceText: { color: colors.ink, fontWeight: "700", fontSize: typography.caption }, choiceTextActive: { color: colors.onBrand }, primary: { backgroundColor: colors.brand, borderRadius: radii.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xs }, primaryText: { color: colors.onBrand, fontWeight: "800" }, secondary: { backgroundColor: colors.canvas, borderColor: colors.brand, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xs }, secondaryText: { color: colors.brand, fontWeight: "800" }, muted: { color: colors.muted, lineHeight: 20 }, status: { color: colors.brand, fontSize: 22, fontWeight: "800", textTransform: "capitalize" }, reason: { color: colors.ink }, message: { color: colors.brand, fontWeight: "700", padding: spacing.md, backgroundColor: colors.accentSoft, borderRadius: radii.md }, signout: { color: colors.muted, textAlign: "center", textDecorationLine: "underline", padding: spacing.lg }, cameraPage: { flex: 1, backgroundColor: "#000" }, camera: { flex: 1 }, verificationOverlay: { position: "absolute", left: spacing.md, right: spacing.md, top: spacing.lg, backgroundColor: "rgba(0,0,0,0.72)", borderRadius: radii.md, padding: spacing.md, gap: 3 }, verificationTitle: { color: "#fff", fontWeight: "900", letterSpacing: 0.8 }, verificationText: { color: "#fff", fontSize: typography.caption }, verificationWarning: { color: "#fff", fontWeight: "900" }, cameraControls: { padding: spacing.lg, flexDirection: "row", gap: spacing.md, backgroundColor: "#000" } });
