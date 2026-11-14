/** Allow only same-app relative paths. Blocks open redirects. */
export function safeNextPath(raw?: string | null): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    if (value.startsWith("https://") || value.startsWith("http://")) {
      const url = new URL(value);
      value = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (value.startsWith("/auth")) return null;
  return value;
}

/** Onboarding and login historically used either `next` or NextAuth `callbackUrl`. */
export function safeReturnPath(search: { get(name: string): string | null }): string | null {
  return safeNextPath(search.get("next")) || safeNextPath(search.get("callbackUrl"));
}

export function smartCardStudioPath(plan?: string | null, theme?: string | null): string {
  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  if (theme) params.set("theme", theme);
  const qs = params.toString();
  return qs ? `/dashboard/business-card?${qs}` : "/dashboard/business-card";
}

export function smartCardStartPath(plan?: string | null, theme?: string | null): string {
  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  if (theme) params.set("theme", theme);
  const qs = params.toString();
  return qs ? `/dashboard/business-card/start?${qs}` : "/dashboard/business-card/start";
}

export function smartCardSignupPath(plan?: string | null, theme?: string | null): string {
  const next = smartCardStartPath(plan, theme);
  const params = new URLSearchParams({
    intent: "smartcard",
    next,
  });
  if (plan) params.set("plan", plan);
  if (theme) params.set("theme", theme);
  return `/auth/register?${params.toString()}`;
}

/** Existing Celeventic accounts open CeleYou studio. No second registration. */
export function smartCardLoginPath(plan?: string | null, theme?: string | null): string {
  const next = smartCardStudioPath(plan, theme);
  return `/auth/login?callbackUrl=${encodeURIComponent(next)}`;
}
