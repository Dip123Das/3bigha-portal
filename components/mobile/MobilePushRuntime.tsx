"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import {
  useMobileNotificationStore,
} from "./mobileNotificationStore";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function MobilePushRuntime() {
  const pushForegroundNotification =
    useMobileNotificationStore(
      (s) => s.push
    );

  const registerSilentSync =
    useMobileNotificationStore(
      (s) => s.registerSilentSync
    );
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    initializePush();
  }, []);

  async function registerTokenWithServer(tokenValue: string) {
    try {
      const supabase = getSupabaseBrowser();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log("Push token available but user is not logged in yet");
        return;
      }

      await fetch("/api/mobile/push/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token: tokenValue,
          platform: "android",
          deviceName: navigator.userAgent,
        }),
      });
    } catch (err) {
      console.error("Push token save failed", err);
    }
  }

  async function initializePush() {
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive !== "granted") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        console.log("Push permission denied");
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener("registration", async (token: Token) => {
        console.log("FCM TOKEN:", token.value);
        await registerTokenWithServer(token.value);
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error", error);
      });

      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("Push received", notification);

          const data =
            notification.data || {};

          const category =
            String(
              data?.category ||
                "operational_alert"
            );

          const isSilent =
            data?.silent === "true" ||
            category === "silent_sync";

          if (isSilent) {
            registerSilentSync(category);
            return;
          }

          pushForegroundNotification({
            id:
              String(
                Date.now()
              ) +
              Math.random(),

            title:
              notification.title ||
              "3Bigha Notification",

            body:
              notification.body ||
              "",

            category,

            url:
              typeof data?.url ===
              "string"
                ? data.url
                : undefined,

            createdAt: Date.now(),
          });
        }
      );

      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (notification: ActionPerformed) => {
          const data = notification.notification.data || {};

          if (data?.url) {
            window.location.href = data.url;
          }
        }
      );
    } catch (err) {
      console.error("Push init failed", err);
    }
  }

  return null;
}