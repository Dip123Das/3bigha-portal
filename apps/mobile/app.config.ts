import type { ConfigContext, ExpoConfig } from "expo/config";

function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = clean(process.env.EXPO_PROJECT_ID);

  return {
    ...config,
    name: config.name || "3Bigha",
    slug: config.slug || "3bigha-mobile",
    runtimeVersion: { policy: "appVersion" },
    updates: {
      ...config.updates,
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...config.extra,
      releaseChannel: clean(process.env.EXPO_RELEASE_CHANNEL) || "development",
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
