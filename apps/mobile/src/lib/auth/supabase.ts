import "react-native-url-polyfill/auto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { wasRestoredAfterRemoval } from "@/lib/auth/installation";

const SESSION_KEY_PREFIX = "3bigha.auth.";
let restorationCheck: Promise<boolean> | null = null;
let restorationChecked = false;

const secureSessionStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    const secureKey = `${SESSION_KEY_PREFIX}${key}`;
    if (!restorationChecked) {
      restorationCheck ??= wasRestoredAfterRemoval();
      if (await restorationCheck) {
        await SecureStore.deleteItemAsync(secureKey);
        restorationChecked = true;
        return null;
      }
      restorationChecked = true;
    }
    return SecureStore.getItemAsync(secureKey);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(key, value);
    await SecureStore.setItemAsync(`${SESSION_KEY_PREFIX}${key}`, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(key);
    await SecureStore.deleteItemAsync(`${SESSION_KEY_PREFIX}${key}`);
  },
};

let client: SupabaseClient | null = null;

export function getNativeAuthConfiguration() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export function getNativeSupabase(): SupabaseClient | null {
  const configuration = getNativeAuthConfiguration();
  if (!configuration) return null;
  if (client) return client;

  client = createClient(configuration.url, configuration.anonKey, {
    auth: {
      storage: secureSessionStorage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  return client;
}
