import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/theme/tokens";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { NotificationResponseProvider } from "@/features/notifications/NotificationResponseProvider";
import { AppRecoveryBoundary } from "@/features/recovery/AppRecoveryBoundary";
import { AppPrivacyShield } from "@/features/privacy/AppPrivacyShield";

export default function RootLayout() {
  return (
    <AppRecoveryBoundary>
      <AuthProvider>
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
      </AuthProvider>
    </AppRecoveryBoundary>
  );
}
