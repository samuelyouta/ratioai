import { useCallback, useEffect, useState } from "react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { PushNotifications } from "@capacitor/push-notifications";
import { Health } from "capacitor-health";
import { isNative, getPlatform } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";

type PushPermission = "prompt" | "granted" | "denied" | "unsupported";

export function useNativeFeatures(email?: string) {
  const [pushPermission, setPushPermission] = useState<PushPermission>("prompt");
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Wire push notification listeners once on native.
  useEffect(() => {
    if (!isNative()) {
      setPushPermission("unsupported");
      return;
    }

    const regListener = PushNotifications.addListener("registration", async (token) => {
      setPushToken(token.value);
      try {
        await supabase.from("push_tokens").insert({
          email: email ?? null,
          token: token.value,
          platform: getPlatform(),
        });
      } catch (e) {
        // Token may already exist (unique constraint) — safe to ignore.
        console.warn("Push token store skipped:", e);
      }
    });

    const errListener = PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error", err);
    });

    const recvListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (n) => console.log("Push received", n)
    );

    return () => {
      regListener.then((l) => l.remove());
      errListener.then((l) => l.remove());
      recvListener.then((l) => l.remove());
    };
  }, [email]);

  const enablePush = useCallback(async () => {
    if (!isNative()) return "unsupported" as const;
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === "granted") {
      setPushPermission("granted");
      await PushNotifications.register();
      await Haptics.notification({ type: NotificationType.Success });
      return "granted" as const;
    }
    setPushPermission("denied");
    return "denied" as const;
  }, []);

  const tapHaptic = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  }, []);

  const takePhoto = useCallback(async () => {
    if (!isNative()) return null;
    const photo = await Camera.getPhoto({
      quality: 85,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    return photo.dataUrl ?? null;
  }, []);

  const requestHealth = useCallback(async () => {
    if (!isNative()) return "unsupported" as const;
    try {
      const available = await Health.isHealthAvailable();
      if (!available?.available) return "unsupported" as const;
      await Health.requestHealthPermissions({
        permissions: ["READ_STEPS", "READ_ACTIVE_CALORIES", "READ_HEART_RATE"],
      });
      return "granted" as const;
    } catch (e) {
      console.error("Health permission error", e);
      return "denied" as const;
    }
  }, []);

  return {
    isNative: isNative(),
    platform: getPlatform(),
    pushPermission,
    pushToken,
    enablePush,
    tapHaptic,
    takePhoto,
    requestHealth,
  };
}
