export const CELEYOU_TAP_HINT_SESSION_KEY = "celeyou-tap-to-connect";

function pathnameFromHref(href: string): string {
  const raw = href.trim();
  if (!raw) return "/";
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).pathname.replace(/\/+$/, "") || "/";
    }
  } catch {
    /* relative */
  }
  const path = raw.split("?")[0]?.split("#")[0] ?? raw;
  return path.replace(/\/+$/, "") || "/";
}

/** /u/{slug} and /card/{slug} are the same public identity. */
export function celeYouProfileAliases(pathname: string): string[] {
  const current = pathname.replace(/\/+$/, "") || "/";
  const parts = current.split("/").filter(Boolean);
  if (parts.length !== 2 || !parts[1]) return [current];
  const [kind, slug] = parts;
  if (kind !== "u" && kind !== "card") return [current];
  return [`/u/${slug}`, `/card/${slug}`];
}

export function celeYouHrefIsCurrentProfile(
  href: string | null | undefined,
  pathname: string | null | undefined
): boolean {
  if (!href || !pathname) return false;
  const target = pathnameFromHref(href);
  const current = pathname.replace(/\/+$/, "") || "/";
  return celeYouProfileAliases(target).includes(current);
}

/** Href used to open the plate. Null when the visitor is already on that profile. */
export function celeYouCardOpenHref(
  href: string | null | undefined,
  pathname: string | null | undefined
): string | null {
  if (!href) return null;
  if (celeYouHrefIsCurrentProfile(href, pathname)) return null;
  return href;
}

export function readCeleYouTapHintSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(CELEYOU_TAP_HINT_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

export function markCeleYouTapHintSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CELEYOU_TAP_HINT_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}
