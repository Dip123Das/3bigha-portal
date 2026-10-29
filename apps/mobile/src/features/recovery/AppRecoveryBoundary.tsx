import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "@/theme/tokens";

type Props = { children: ReactNode };
type State = { failed: boolean; recoveryFailed: boolean; failureArea: string; errorKind: string; errorDetail: string };

const SAFE_ERROR_KINDS = new Set(["Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError", "URIError", "EvalError"]);
const SAFE_COMPONENTS = [
  "VendorWorkspaceScreen",
  "VendorRfqInboxScreen",
  "OnboardingScreen",
  "DashboardGateway",
  "PropertyDiscoveryScreen",
  "TrustedMediaCaptureScreen",
  "NotificationDeviceCard",
  "ReleaseHealthCard",
  "AuthGatewayScreen",
  "IndexRoute",
  "AuthProvider",
  "ScreenCaptureProtection",
  "DeviceReauthenticationProvider",
  "AppPrivacyShield",
  "NotificationResponseProvider",
  "RootLayout",
] as const;

function safeErrorKind(error: Error) {
  return SAFE_ERROR_KINDS.has(error.name) ? error.name : "UnknownError";
}

function safeErrorDetail(error: Error) {
  if (error.name !== "TypeError") return "";
  const patterns = [
    /Cannot read properties of (?:undefined|null) \(reading ['"]([A-Za-z_$][\w$]*)['"]\)/,
    /Cannot read property ['"]([A-Za-z_$][\w$]*)['"] of (?:undefined|null)/,
    /undefined is not an object \(evaluating ['"][^'"]*\.([A-Za-z_$][\w$]*)['"]\)/,
    /\.([A-Za-z_$][\w$]*) is not a function/,
  ];
  for (const pattern of patterns) {
    const match = String(error).match(pattern);
    if (match?.[1]) return pattern.source.includes("is not a function")
      ? `${match[1]} is not callable`
      : `reading \"${match[1]}\"`;
  }
  return "";
}

function safeFailureArea(componentStack: string | null | undefined) {
  // React Native component stacks list the failing child before its parents.
  // Report only a known component name; never expose the stack itself.
  for (const line of componentStack?.split(/\r?\n/) ?? []) {
    const component = SAFE_COMPONENTS.find((name) => line.includes(name));
    if (component) return component;
  }
  return "OtherAppComponent";
}

export class AppRecoveryBoundary extends Component<Props, State> {
  state: State = { failed: false, recoveryFailed: false, failureArea: "", errorKind: "", errorDetail: "" };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, recoveryFailed: false, failureArea: "", errorKind: safeErrorKind(error), errorDetail: safeErrorDetail(error) };
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    // Show only allowlisted code component names and JavaScript error classes.
    // Never render, persist or transmit raw errors, stack traces or user data.
    this.setState({ failureArea: safeFailureArea(info.componentStack) });
  }

  private retry = () => this.setState({ failed: false, recoveryFailed: false, failureArea: "", errorKind: "", errorDetail: "" });

  private reload = async () => {
    try {
      if (!Updates.isEnabled) throw new Error("Native reload is unavailable in this development runtime.");
      await Updates.reloadAsync();
    } catch {
      this.setState({ recoveryFailed: true });
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const version = Application.nativeApplicationVersion || "development";
    const channel = Updates.channel || "local development";

    return <SafeAreaView style={styles.safe}><View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.card}>
      <Text style={styles.kicker}>SAFE RECOVERY</Text>
      <Text accessibilityRole="header" style={styles.title}>3Bigha needs a moment</Text>
      <Text style={styles.body}>This screen could not be displayed safely. Your account, permissions and server-owned work have not been changed.</Text>
      <Pressable accessibilityLabel="Try this screen again" accessibilityRole="button" onPress={this.retry} style={styles.primary}><Text style={styles.primaryText}>Try again</Text></Pressable>
      <Pressable accessibilityLabel="Reload the 3Bigha app" accessibilityRole="button" onPress={() => void this.reload()} style={styles.secondary}><Text style={styles.secondaryText}>Reload app</Text></Pressable>
      {this.state.recoveryFailed ? <Text accessibilityLiveRegion="polite" style={styles.warning}>Automatic reload is unavailable. Close and reopen 3Bigha when convenient.</Text> : null}
      <Text style={styles.meta}>Build {Application.nativeBuildVersion || "unknown"} · Version {version} · {channel}</Text>
      {this.state.failureArea ? <Text accessibilityLabel="Safe diagnostic details" style={styles.note}>Diagnostic: {this.state.failureArea} · {this.state.errorKind}{this.state.errorDetail ? ` · ${this.state.errorDetail}` : ""}</Text> : null}
      <Text style={styles.note}>No personal details, access tokens, raw error messages or stack traces are shown or stored here. Only an allowlisted code property hint is shown.</Text>
    </View></SafeAreaView>;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: "center", backgroundColor: colors.canvas, padding: spacing.lg },
  card: { width: "100%", maxWidth: 620, alignSelf: "center", gap: spacing.md, padding: spacing.xl, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg },
  kicker: { color: colors.brand, fontSize: typography.micro, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  body: { color: colors.muted, fontSize: typography.body, lineHeight: 25 },
  primary: { minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, backgroundColor: colors.brand, borderRadius: radii.md },
  primaryText: { color: colors.onBrand, fontSize: typography.caption, fontWeight: "800" },
  secondary: { minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, backgroundColor: colors.canvas, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md },
  secondaryText: { color: colors.ink, fontSize: typography.caption, fontWeight: "800" },
  warning: { color: "#8A4B16", fontSize: typography.caption, lineHeight: 20 },
  meta: { color: colors.ink, fontSize: typography.micro, fontWeight: "800" },
  note: { color: colors.muted, fontSize: typography.micro, lineHeight: 17 },
});
