import { useEffect } from "react";
import { NATIVE_AUTH_CALLBACK } from "@/lib/auth";

/**
 * Hosted on Vercel. Supabase OAuth redirects here from the in-app browser,
 * then this page immediately deep-links back into the iOS app with the auth code.
 * (SFSafariViewController cannot reliably open custom schemes directly.)
 */
const NativeAuthBridge = () => {
  useEffect(() => {
    const target = `${NATIVE_AUTH_CALLBACK}${window.location.search}${window.location.hash}`;
    window.location.replace(target);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground text-center">Returning to RatioAi…</p>
    </div>
  );
};

export default NativeAuthBridge;
