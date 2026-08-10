import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const INSTALLATION_SENTINEL = "3bigha.installation.present";
const SECURE_SENTINEL = "3bigha.installation.secure";

let installationCheck: Promise<boolean> | null = null;

async function inspectInstallation() {
  const [localSentinel, secureSentinel] = await Promise.all([
    AsyncStorage.getItem(INSTALLATION_SENTINEL),
    SecureStore.getItemAsync(SECURE_SENTINEL),
  ]);

  const restoredAfterRemoval = localSentinel === null && secureSentinel !== null;

  if (localSentinel === null) {
    await AsyncStorage.setItem(INSTALLATION_SENTINEL, "present");
  }
  if (secureSentinel === null) {
    await SecureStore.setItemAsync(SECURE_SENTINEL, "present", {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  return restoredAfterRemoval;
}

export function wasRestoredAfterRemoval() {
  installationCheck ??= inspectInstallation();
  return installationCheck;
}
