/**
 * Owner-only email signature. Uses the public profile URL. No tracking pixel.
 */

export type CeleYouSignatureInput = {
  displayName: string;
  title?: string | null;
  company?: string | null;
  profileUrl: string;
};

export function celeYouEmailSignaturePlain(input: CeleYouSignatureInput): string {
  const lines = [input.displayName.trim(), input.title?.trim(), input.company?.trim(), input.profileUrl.trim()].filter(
    Boolean
  ) as string[];
  return `${lines.join("\n")}\nCeleYou · One Identity. Infinite Connections.`;
}

export function celeYouEmailSignatureHtml(input: CeleYouSignatureInput): string {
  const name = escapeHtml(input.displayName.trim());
  const title = escapeHtml((input.title || "").trim());
  const company = escapeHtml((input.company || "").trim());
  const url = escapeHtml(input.profileUrl.trim());
  const role = [title, company].filter(Boolean).join(" · ");
  return [
    `<p style="margin:0;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#073F3C">${name}</p>`,
    role ? `<p style="margin:2px 0 0;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#334155">${role}</p>` : "",
    `<p style="margin:8px 0 0;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif"><a href="${url}" style="color:#0B8A83">${url}</a></p>`,
    `<p style="margin:6px 0 0;font:11px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;color:#64748b">CeleYou · One Identity. Infinite Connections.</p>`,
  ]
    .filter(Boolean)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
