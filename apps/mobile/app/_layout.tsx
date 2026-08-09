import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/theme/tokens";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { NotificationResponseProvider } from "@/features/notifications/NotificationResponseProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationResponseProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.canvas },
            headerShown: false,
          }}
        />
      </NotificationResponseProvider>
    </AuthProvider>
  );
}
