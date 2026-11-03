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
    properties?: Record<string, unknown>;
    eventId?: string;
  }): Promise<void>;
  /** Pseudonymous account id only. Never pass name, email or phone. */
  identify(options: { externalId: string }): Promise<void>;
  logout(): Promise<void>;
}

/** Native bridge lives in plugins/capacitor-tiktok-events (iOS only). */
export const TikTokEvents = registerPlugin<TikTokEventsPlugin>("TikTokEvents");
