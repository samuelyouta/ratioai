import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Production builds load bundled assets from `webDir` (no remote server).
 * For live-reload dev against a local or preview URL, set CAPACITOR_DEV_SERVER:
 *   CAPACITOR_DEV_SERVER=http://localhost:8080 npx cap run ios
 */
const devServerUrl = process.env.CAPACITOR_DEV_SERVER;

const config: CapacitorConfig = {
  appId: "com.ratioai.ios",
  appName: "ratioai",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
    scheme: "RatioAi",
  },
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith("http://"),
        },
      }
    : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
      },
    },
  },
};

export default config;
