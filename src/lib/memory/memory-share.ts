export type MemoryShareTarget =
  | "native"
  | "whatsapp"
  | "instagram"
  | "snapchat"
  | "tiktok"
  | "trendshub";

export function buildMemoryShareUrl(input: {
  origin: string;
  viewToken: string;
  memoryId: string;
}): string {
  return `${input.origin.replace(/\/$/, "")}/memory/${input.viewToken}#memory-${input.memoryId}`;
}

export function buildWhatsAppShareHref(shareUrl: string, title: string): string {
  const text = `A memory from ${title}\n${shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** No reliable Trendshub public share deep-link in-repo — copy + tip. */
export const TRENDSHUB_SHARE_TIP =
  "Link copied. Open Trendshub and paste it into your post.";

export const STORY_APPS_TIP =
  "Link copied. Save the photo or video, then post it to your Story or feed.";

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export async function nativeShare(input: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unavailable";
  }
  try {
    await navigator.share({ title: input.title, text: input.text, url: input.url });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "unavailable";
  }
}
