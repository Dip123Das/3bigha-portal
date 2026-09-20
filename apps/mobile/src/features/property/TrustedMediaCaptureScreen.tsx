import type { Session } from "@supabase/supabase-js";
import * as Application from "expo-application";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getPushDeviceId } from "@/features/notifications/device";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import {
  attachTrustedUnitPhoto,
  bindTrustedCaptureLocation,
  loadTrustedMediaTargets,
  startTrustedCaptureSession,
  uploadTrustedUnitPhoto,
  type MobileTrustedCaptureStart,
  type MobileTrustedLocationObservation,
  type MobileTrustedMediaTarget,
} from "./trusted-media-api";

type PreparedCapture = {
  capture: MobileTrustedCaptureStart;
  location: MobileTrustedLocationObservation;
  target: MobileTrustedMediaTarget;
  openedAt: string;
};

export function TrustedMediaCaptureScreen({
  session,
  onBack,
}: {
  session: Session;
  onBack(): void;
}) {
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] =
    useCameraPermissions();
  const [targets, setTargets] =
    useState<MobileTrustedMediaTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedCapture | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await loadTrustedMediaTargets(session);
      setTargets(result.targets);
      setSelectedId((current) =>
        result.targets.some((target) => target.entityId === current)
          ? current
          : result.targets[0]?.entityId ?? null,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your trusted-photo targets could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openVerifiedCamera(
    target: MobileTrustedMediaTarget,
  ) {
    setBusy(true);
    setMessage(null);
    try {
      if (Platform.OS !== "android" && Platform.OS !== "ios") {
        throw new Error(
          "Trusted live capture requires the installed Android or iOS app.",
        );
      }

      const cameraAccess = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();
      if (!cameraAccess.granted) {
        throw new Error(
          "Camera permission is required for trusted live evidence.",
        );
      }

      const locationAccess =
        await Location.requestForegroundPermissionsAsync();
      if (locationAccess.status !== "granted") {
        throw new Error(
          "Precise location is required for trusted live evidence.",
        );
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        throw new Error(
          "Turn on device location services before opening the trusted camera.",
        );
      }

      const point = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });
      if (point.mocked === true) {
        throw new Error(
          "Mock location was detected. Use the device's live GPS and try again.",
        );
      }
      const accuracy = point.coords.accuracy;
      if (
        accuracy == null ||
        accuracy <= 0 ||
        accuracy > 250
      ) {
        throw new Error(
          "GPS accuracy must be 250 metres or better. Move to an open area and retry.",
        );
      }
      if (Date.now() - point.timestamp > 30_000) {
        throw new Error(
          "The GPS reading is stale. Please try again.",
        );
      }

      const capture = await startTrustedCaptureSession(session, {
        entityId: target.entityId,
        platform: Platform.OS,
        appVersion:
          Application.nativeApplicationVersion ||
          Constants.expoConfig?.version ||
          "development",
        deviceSessionId: await getPushDeviceId(),
      });
      if (
        accuracy > capture.policy.reviewGpsAccuracyMetres
      ) {
        throw new Error(
          `GPS accuracy must be ${capture.policy.reviewGpsAccuracyMetres} metres or better for review.`,
        );
      }

      const location: MobileTrustedLocationObservation = {
        latitude: point.coords.latitude,
        longitude: point.coords.longitude,
        accuracyMetres: accuracy,
        altitudeMetres: point.coords.altitude,
        capturedAt: new Date(point.timestamp).toISOString(),
        provider: Platform.OS,
      };
      await bindTrustedCaptureLocation(session, {
        sessionId: capture.session.id,
        nonce: capture.nonce,
        location,
      });

      setPrepared({
        capture,
        location,
        target,
        openedAt: new Date().toISOString(),
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The trusted camera could not be prepared.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function captureAndUpload() {
    if (!prepared || !camera.current) return;
    setBusy(true);
    setMessage(null);
    try {
      const capturedAt = new Date().toISOString();
      const locationAgeMs =
        Date.parse(capturedAt) -
        Date.parse(prepared.location.capturedAt);
      if (locationAgeMs < 0 || locationAgeMs > 120_000) {
        throw new Error(
          "The GPS reading expired. Close the camera and begin again.",
        );
      }

      const photo = await camera.current.takePictureAsync({
        quality: 0.78,
      });
      if (!photo?.uri) {
        throw new Error(
          "The camera did not return a live photo.",
        );
      }

      const evidenceRole =
        prepared.target.existingAssetCount === 0
          ? "unit_overview" as const
          : "additional_live_capture" as const;

      const asset = await uploadTrustedUnitPhoto(session, {
        unitId: prepared.target.entityId,
        capture: prepared.capture,
        photo: {
          uri: photo.uri,
          name: `${evidenceRole}-${Date.now()}.jpg`,
          mimeType: "image/jpeg",
          capturedAt,
        },
        evidenceRole,
        uploadMetadata: {
          cameraFacing: "back",
          cameraOpenedAt: prepared.openedAt,
          locationAgeMs,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "UTC",
          utcOffsetMinutes: -new Date().getTimezoneOffset(),
        },
      });

      const updated = await attachTrustedUnitPhoto(session, {
        sessionId: prepared.capture.session.id,
        unitId: prepared.target.entityId,
        assetId: asset.trustedMediaAssetId,
      });

      setPrepared(null);
      setTargets((current) =>
        current.map((target) =>
          target.entityId === updated.entityId
            ? updated
            : target,
        ),
      );
      setMessage(
        updated.trustStatus === "verified"
          ? "Trusted live photo attached. This unit now meets the current trusted-media check."
          : "Trusted live photo attached and submitted for verification.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The trusted live photo could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (prepared) {
    return <SafeAreaView style={styles.cameraPage}>
      <CameraView
        accessibilityLabel="Trusted rear-camera preview"
        facing="back"
        ref={camera}
        style={styles.camera}
      />
      <View style={styles.verificationOverlay}>
        <Text style={styles.verificationTitle}>
          LIVE GPS-BOUND CAPTURE
        </Text>
        <Text style={styles.verificationText}>
          {prepared.target.projectName}
        </Text>
        <Text style={styles.verificationText}>
          {targetLabel(prepared.target)}
        </Text>
        <Text style={styles.verificationText}>
          GPS accuracy ±
          {Math.round(prepared.location.accuracyMetres)} m
        </Text>
        <Text style={styles.verificationText}>
          Location is private and used only for evidence
          verification.
        </Text>
      </View>
      <View style={styles.cameraControls}>
        <Button
          disabled={busy}
          label="Cancel"
          onPress={() => setPrepared(null)}
          secondary
        />
        <Button
          disabled={busy}
          label={
            busy
              ? "Uploading securely…"
              : "Capture and upload"
          }
          onPress={() => void captureAndUpload()}
        />
      </View>
    </SafeAreaView>;
  }

  const selected =
    targets.find((target) => target.entityId === selectedId) ??
    null;

  return <SafeAreaView style={styles.safe}>
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          onRefresh={() => void refresh()}
          refreshing={busy}
          tintColor={colors.brand}
        />
      }
    >
      <Pressable
        accessibilityLabel="Back to dashboard"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
      >
        <Text style={styles.back}>‹ Back to dashboard</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>
          MOB-29 · TRUSTED PROPERTY EVIDENCE
        </Text>
        <Text
          accessibilityRole="header"
          style={styles.heroTitle}
        >
          Capture the actual unit
        </Text>
        <Text style={styles.heroBody}>
          Use the live rear camera and fresh GPS at the
          property. Gallery photos, videos and private legal
          papers are not accepted here.
        </Text>
      </View>

      {message && <Text
        accessibilityLiveRegion="assertive"
        accessibilityRole="alert"
        style={styles.message}
      >
        {message}
      </Text>}

      {busy && targets.length === 0 && <View
        accessibilityLabel="Loading trusted-photo targets"
        accessibilityRole="progressbar"
        style={styles.loading}
      >
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.muted}>
          Loading your owned project units…
        </Text>
      </View>}

      {!busy && targets.length === 0 && <View style={styles.card}>
        <Text
          accessibilityRole="header"
          style={styles.sectionTitle}
        >
          No eligible project unit
        </Text>
        <Text style={styles.muted}>
          Add builder inventory through the canonical property
          workspace before capturing trusted unit photographs.
        </Text>
      </View>}

      {targets.length > 0 && <View style={styles.card}>
        <Text
          accessibilityRole="header"
          style={styles.sectionTitle}
        >
          Select your project unit
        </Text>
        <Text style={styles.muted}>
          Only units connected to a builder profile owned by
          your signed-in account are listed.
        </Text>

        {targets.map((target) => {
          const active = target.entityId === selectedId;
          return <Pressable
            accessibilityLabel={
              `${target.projectName}, ${targetLabel(target)}`
            }
            accessibilityRole="radio"
            accessibilityState={{
              checked: active,
              selected: active,
            }}
            key={target.entityId}
            onPress={() => setSelectedId(target.entityId)}
            style={[
              styles.target,
              active && styles.targetActive,
            ]}
          >
            <Text style={[
              styles.targetTitle,
              active && styles.targetTitleActive,
            ]}>
              {target.projectName}
            </Text>
            <Text style={[
              styles.targetBody,
              active && styles.targetBodyActive,
            ]}>
              {targetLabel(target)} ·{" "}
              {target.existingAssetCount} trusted photo(s)
            </Text>
            <Text style={[
              styles.targetBody,
              active && styles.targetBodyActive,
            ]}>
              Status: {target.trustStatus.replace(/_/g, " ")}
            </Text>
          </Pressable>;
        })}

        {selected && <Button
          disabled={busy}
          label={
            selected.existingAssetCount === 0
              ? "Start required live capture"
              : "Add another live capture"
          }
          onPress={() => void openVerifiedCamera(selected)}
        />}
      </View>}

      <View style={styles.card}>
        <Text
          accessibilityRole="header"
          style={styles.sectionTitle}
        >
          Privacy and integrity
        </Text>
        <Text style={styles.muted}>
          Precise GPS is stored privately in the canonical
          capture session. The public image does not disclose
          precise coordinates. Every photo is ownership-bound,
          session-bound, immutable and submitted to the current
          verification policy.
        </Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function targetLabel(target: MobileTrustedMediaTarget) {
  return (
    target.title ||
    target.unitCode ||
    target.unitKind.replace(/_/g, " ")
  );
}

function Button({
  disabled,
  label,
  onPress,
  secondary = false,
}: {
  disabled: boolean;
  label: string;
  onPress(): void;
  secondary?: boolean;
}) {
  return <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    accessibilityState={{ busy: disabled, disabled }}
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.button,
      secondary && styles.buttonSecondary,
      disabled && styles.disabled,
    ]}
  >
    <Text style={[
      styles.buttonText,
      secondary && styles.buttonTextSecondary,
    ]}>
      {label}
    </Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  page: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  back: {
    color: colors.brand,
    fontWeight: "800",
    paddingVertical: spacing.sm,
  },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accentSoft,
    fontSize: typography.micro,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: colors.onBrand,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "900",
  },
  heroBody: {
    color: colors.onBrandMuted,
    fontSize: typography.body,
    lineHeight: 25,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
  },
  muted: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  target: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  targetActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  targetTitle: {
    color: colors.ink,
    fontWeight: "900",
    fontSize: typography.caption,
  },
  targetTitleActive: {
    color: colors.onBrand,
  },
  targetBody: {
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  targetBodyActive: {
    color: colors.onBrandMuted,
  },
  button: {
    minHeight: 52,
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  buttonSecondary: {
    backgroundColor: colors.canvas,
    borderColor: colors.brand,
    borderWidth: 1,
  },
  buttonText: {
    color: colors.onBrand,
    fontSize: typography.caption,
    fontWeight: "900",
    textAlign: "center",
  },
  buttonTextSecondary: {
    color: colors.brand,
  },
  disabled: {
    opacity: 0.62,
  },
  message: {
    color: colors.brand,
    fontWeight: "700",
    padding: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  cameraPage: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  verificationOverlay: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    top: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.76)",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  verificationTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  verificationText: {
    color: "#FFFFFF",
    fontSize: typography.caption,
    lineHeight: 19,
  },
  cameraControls: {
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: "#000",
  },
});
