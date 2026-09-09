/** App Store review demo account — password sign-in + Pro bypass. */

export const REVIEWER_EMAIL = "reviewer@ratioai.app";

export function isReviewerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === REVIEWER_EMAIL;
}
