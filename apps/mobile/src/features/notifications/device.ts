import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const DEVICE_KEY = "3bigha.push.device-id";

export async function getPushDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing) return existing;
  const id = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(DEVICE_KEY, id, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return id;
}

export async function preparePushDevice() {
  if (Platform.OS === "web" || !Device.isDevice) throw new Error("Notifications require an installed app on a physical device.");
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Notifications are off. You can enable them later in your device settings.");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("operational_alert", { name: "3Bigha work alerts", importance: Notifications.AndroidImportance.HIGH });
  const projectId = Constants.easConfig?.projectId || (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  if (!projectId) throw new Error("Push delivery will be available after the production app project is linked.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return { token, deviceId: await getPushDeviceId(), platform: Platform.OS, deviceName: Device.deviceName || Device.modelName || "Mobile device", appVersion: Application.nativeApplicationVersion || Constants.expoConfig?.version || "" };
}
