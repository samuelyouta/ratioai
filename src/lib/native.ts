import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const getPlatform = (): "ios" | "android" | "web" => {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
};
