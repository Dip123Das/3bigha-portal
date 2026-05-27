import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.threebigha.app",
  appName: "3bigha",
  webDir: "out",
  server: {
    url: "https://www.3bigha.com",
    cleartext: false,
  },
  android: {
    backgroundColor: "#ffffff",
  },
};

export default config;
