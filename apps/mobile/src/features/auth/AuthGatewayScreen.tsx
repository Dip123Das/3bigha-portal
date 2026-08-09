import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/AuthProvider";
import { getNativeSupabase } from "@/lib/auth/supabase";
import { consumeNativeAuthCallback, nativeAuthCallbackUrl, resetNativeAuthCallbackGate } from "@/lib/auth/callback";
import { OnboardingScreen } from "@/features/onboarding/OnboardingScreen";
import { DashboardGateway } from "@/features/dashboard/DashboardGateway";
import { colors, radii, spacing, typography } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

type Method = "email" | "phone";

function friendlyAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Sign-in could not be completed.";
  if (/rate|limit/i.test(message)) return "Too many attempts. Please wait a little and try again.";
  if (/expired|invalid/i.test(message)) return "The code or link is invalid or expired. Please request a new one.";
  return message;
}

export function AuthGatewayScreen() {
  const { session, ready, configurationMissing, callbackError, clearCallbackError } = useAuth();
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = nativeAuthCallbackUrl();

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    clearCallbackError();
    try {
      await action();
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  const supabaseOrThrow = () => {
    const supabase = getNativeSupabase();
    if (!supabase) throw new Error("Mobile authentication is not configured.");
    return supabase;
  };

  if (!ready) {
    return <SafeAreaView accessibilityLabel="Restoring your secure session" accessibilityRole="progressbar" style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text accessibilityLiveRegion="polite" style={styles.body}>Restoring your secure session…</Text></SafeAreaView>;
  }

  if (session) {
    return <SignedInSession session={session} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Brand />
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>ONE SECURE 3BIGHA IDENTITY</Text>
            <Text accessibilityRole="header" style={styles.title}>Sign in simply. Continue with dignity.</Text>
            <Text style={styles.body}>Use the same account as the 3Bigha portal. We never create a separate mobile identity.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              {(["email", "phone"] as const).map((item) => (
                <Pressable accessibilityLabel={item === "email" ? "Sign in with email" : "Sign in with phone OTP"} accessibilityRole="tab" accessibilityState={{ selected: method === item }} key={item} onPress={() => { setMethod(item); setMessage(null); }} style={[styles.tab, method === item && styles.activeTab]}>
                  <Text style={[styles.tabText, method === item && styles.activeTabText]}>{item === "email" ? "Email" : "Phone OTP"}</Text>
                </Pressable>
              ))}
            </View>

            {method === "email" ? (
              <>
                <Text style={styles.label}>Email address</Text>
                <TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" inputMode="email" onChangeText={setEmail} placeholder="you@example.com" style={styles.input} value={email} />
                <Pressable
                  accessibilityLabel="Send secure sign-in link" accessibilityRole="button" accessibilityState={{ busy, disabled: busy || configurationMissing }} disabled={busy || configurationMissing}
                  onPress={() => void run(async () => {
                    if (!email.trim()) throw new Error("Please enter your email address.");
                    resetNativeAuthCallbackGate();
                    const { error } = await supabaseOrThrow().auth.signInWithOtp({
                      email: email.trim(),
                      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
                    });
                    if (error) throw error;
                    setMessage("Magic link sent. Open the newest email on this device.");
                  })}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{busy ? "Please wait…" : "Send secure sign-in link"}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Mobile number with country code</Text>
                <TextInput accessibilityLabel="Mobile number with country code" autoComplete="tel" inputMode="tel" onChangeText={setPhone} placeholder="+91 98765 43210" style={styles.input} value={phone} />
                {phoneCodeSent && <TextInput accessibilityLabel="One-time password" inputMode="numeric" maxLength={8} onChangeText={setOtp} placeholder="Enter OTP" style={styles.input} value={otp} />}
                <Pressable
                  accessibilityLabel={phoneCodeSent ? "Verify OTP and sign in" : "Send OTP"} accessibilityRole="button" accessibilityState={{ busy, disabled: busy || configurationMissing }} disabled={busy || configurationMissing}
                  onPress={() => void run(async () => {
                    if (!phoneCodeSent) {
                      const { error } = await supabaseOrThrow().auth.signInWithOtp({ phone: phone.replace(/\s/g, "") });
                      if (error) throw error;
                      setPhoneCodeSent(true);
                      setMessage("OTP sent to your mobile number.");
                      return;
                    }
                    if (!otp.trim()) throw new Error("Please enter the OTP.");
                    const { error } = await supabaseOrThrow().auth.verifyOtp({ phone: phone.replace(/\s/g, ""), token: otp.trim(), type: "sms" });
                    if (error) throw error;
                  })}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>{busy ? "Please wait…" : phoneCodeSent ? "Verify and sign in" : "Send OTP"}</Text>
                </Pressable>
              </>
            )}

            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>
            <Pressable
              accessibilityLabel="Continue with Google" accessibilityRole="button" accessibilityState={{ busy, disabled: busy || configurationMissing }} disabled={busy || configurationMissing}
              onPress={() => void run(async () => {
                const supabase = supabaseOrThrow();
                resetNativeAuthCallbackGate();
                const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
                if (error) throw error;
                if (!data.url) throw new Error("Google sign-in could not be started.");
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                if (result.type !== "success") return;
                const code = consumeNativeAuthCallback(result.url);
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) throw exchangeError;
              })}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Continue with Google</Text>
            </Pressable>

            {(callbackError || message || configurationMissing) && (
              <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={[styles.message, configurationMissing && styles.error]}>
                {configurationMissing ? "Authentication configuration is missing. Add the approved Expo public Supabase URL and anonymous key." : callbackError ?? message}
              </Text>
            )}
          </View>
          <Text style={styles.privacy}>Session tokens are encrypted by the device and are never used as identity or role authority.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignedInSession({ session }: { session: Session }) {
  return <DashboardGateway session={session} onboarding={<OnboardingScreen session={session} />} />;
}

function Brand() {
  return <View style={styles.brandRow}><View style={styles.brandMark}><Text style={styles.brandMarkText}>3B</Text></View><View><Text style={styles.brandName}>3Bigha</Text><Text style={styles.brandDescriptor}>Business Operating System</Text></View></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }, safeArea: { flex: 1, backgroundColor: colors.canvas },
  page: { flexGrow: 1, width: "100%", maxWidth: 680, alignSelf: "center", padding: spacing.lg }, signedInPage: { flex: 1, width: "100%", maxWidth: 680, alignSelf: "center", padding: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm }, brandMark: { width: 44, height: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand }, brandMarkText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" }, brandName: { color: colors.ink, fontSize: 20, fontWeight: "800" }, brandDescriptor: { color: colors.muted, fontSize: typography.caption },
  intro: { paddingVertical: spacing.xxl }, eyebrow: { color: colors.brand, fontSize: typography.micro, fontWeight: "800", letterSpacing: 1.1, marginBottom: spacing.sm }, title: { color: colors.ink, fontSize: typography.display, lineHeight: 42, fontWeight: "800", letterSpacing: -1 }, body: { color: colors.muted, fontSize: typography.body, lineHeight: 25, marginTop: spacing.md }, support: { color: colors.onBrandMuted, fontSize: typography.caption, lineHeight: 20, marginTop: spacing.md },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg }, successCard: { backgroundColor: colors.brand, borderRadius: radii.lg, padding: spacing.xl, marginTop: "auto", marginBottom: spacing.lg }, tabs: { flexDirection: "row", backgroundColor: colors.canvas, borderRadius: radii.md, padding: 4, marginBottom: spacing.lg }, tab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: 9 }, activeTab: { backgroundColor: colors.surface }, tabText: { color: colors.muted, fontWeight: "700" }, activeTabText: { color: colors.brand },
  label: { color: colors.ink, fontSize: typography.caption, fontWeight: "700", marginBottom: spacing.xs }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, color: colors.ink, fontSize: typography.body }, primaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.brand, paddingHorizontal: spacing.md }, primaryButtonText: { color: colors.onBrand, fontSize: typography.body, fontWeight: "800" }, secondaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: radii.md, borderColor: colors.brand, borderWidth: 1, paddingHorizontal: spacing.md }, secondaryButtonText: { color: colors.brand, fontSize: typography.body, fontWeight: "800" },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.lg }, dividerLine: { flex: 1, height: 1, backgroundColor: colors.border }, dividerText: { color: colors.muted, fontSize: typography.micro, fontWeight: "800" }, message: { color: colors.brand, fontSize: typography.caption, lineHeight: 20, marginTop: spacing.md }, error: { color: "#A4382A" }, privacy: { color: colors.muted, fontSize: typography.caption, lineHeight: 19, textAlign: "center", padding: spacing.lg },
});
