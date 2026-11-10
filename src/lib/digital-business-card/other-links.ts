export type OtherReachLink = {
  label: string;
  href: string;
};

const PREFIX = "other:";

function hrefFromValue(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  if (/^www\./i.test(t)) return `https://${t}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(t)) return `https://${t}`;
  return "";
}

export function otherLinkHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function parseOtherLink(raw: string): OtherReachLink {
  const t = raw.trim();
  if (!t) return { label: "", href: "" };
  if (t.startsWith(PREFIX)) {
    const rest = t.slice(PREFIX.length);
    const idx = rest.indexOf(":");
    if (idx >= 0) {
      let label = rest.slice(0, idx);
      try {
        label = decodeURIComponent(label);
      } catch {
        /* keep packed label */
      }
      return { label: label.trim().slice(0, 80), href: rest.slice(idx + 1).trim() };
    }
  }
  const href = hrefFromValue(t);
  return { label: otherLinkHost(href), href };
}

export function serializeOtherLink(link: OtherReachLink): string {
  const href = hrefFromValue(link.href).slice(0, 500);
  const label = link.label.trim().slice(0, 80);
  if (!label && !href) return "";
  if (!label) return href;
  return `${PREFIX}${encodeURIComponent(label)}:${href}`;
}

export function otherLinkHref(raw: string): string {
  return parseOtherLink(raw).href;
}

export function otherLinkSeed(query: string): string {
  const t = query.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t) || /^www\./i.test(t) || /\.[a-z]{2,}([/:?#]|$)/i.test(t)) {
    return serializeOtherLink({ label: "", href: t });
  }
  return serializeOtherLink({ label: t, href: "" });
}
