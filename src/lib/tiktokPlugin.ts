import { registerPlugin } from "@capacitor/core";

export interface TikTokEventsPlugin {
  initialize(options: {
    accessToken: string;
    appId: string;
    tiktokAppId: string;
    debug?: boolean;
  }): Promise<void>;
  trackEvent(options: {
    event: string;
    properties?: Record<string, string | number | boolean>;
    eventId?: string;
  }): Promise<void>;
}

/** Native bridge lives in plugins/capacitor-tiktok-events (iOS only). */
export const TikTokEvents = registerPlugin<TikTokEventsPlugin>("TikTokEvents");
