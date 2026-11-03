import { getProfile } from "@/lib/profile";

/** Onboarding screens in order; `step` on the layout is an index into this list. */
export const ONBOARDING_ROUTES = [
  "/app/onboarding/goal",
  "/app/onboarding/name",
  "/app/onboarding/gender",
  "/app/onboarding/dob",
  "/app/onboarding/body",
  "/app/onboarding/activity",
  "/app/onboarding/source",
  "/app/onboarding/blocker",
] as const;

export function previousOnboardingRoute(step: number): string {
  if (step > 0) return ONBOARDING_ROUTES[Math.min(step, ONBOARDING_ROUTES.length) - 1];
  return getProfile() ? "/app/profile" : "/app/welcome";
}
