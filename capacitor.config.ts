import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.threebigha.mobilefresh",
  appName: "3Bigha Mobile",
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
