import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/theme/tokens";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { NotificationResponseProvider } from "@/features/notifications/NotificationResponseProvider";
import { AppRecoveryBoundary } from "@/features/recovery/AppRecoveryBoundary";
import { AppPrivacyShield } from "@/features/privacy/AppPrivacyShield";
import { DeviceReauthenticationProvider } from "@/features/privacy/DeviceReauthenticationProvider";
import { ScreenCaptureProtection } from "@/features/privacy/ScreenCaptureProtection";

export default function RootLayout() {
  return (
    <AppRecoveryBoundary>
      <ScreenCaptureProtection>
        <AuthProvider>
          <DeviceReauthenticationProvider>
            <AppPrivacyShield>
              <NotificationResponseProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: colors.canvas },
                    headerShown: false,
                  }}
                />
              </NotificationResponseProvider>
            </AppPrivacyShield>
          </DeviceReauthenticationProvider>
        </AuthProvider>
      </ScreenCaptureProtection>
    </AppRecoveryBoundary>
  );
}
