/**
 * Privacy-conscious invite and attribution. No rewards, no fake scarcity.
 * Visitors can still open public profiles without an account.
 */

export function celeYouInvitePath(fromUsername?: string | null): string {
  const params = new URLSearchParams({ intent: "celecard" });
  const handle = sanitizeReferralHandle(fromUsername);
  if (handle) params.set("from", handle);
  return `/auth/register?${params.toString()}`;
}

export function celeYouInviteUrl(origin: string, fromUsername?: string | null): string {
  return `${origin.replace(/\/$/, "")}${celeYouInvitePath(fromUsername)}`;
}

export function sanitizeReferralHandle(raw: string | null | undefined): string | null {
  const value = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!/^[a-z0-9][a-z0-9._-]{1,29}$/.test(value)) return null;
  return value;
}

export function parseCeleYouReferral(search: string | URLSearchParams): string | null {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return sanitizeReferralHandle(params.get("from") || params.get("ref"));
}

export const CELEYOU_REFERRAL_COPY =
  "Invite a colleague to create their own CeleYou. There is no reward program and no requirement for guests to register before viewing your public card.";
