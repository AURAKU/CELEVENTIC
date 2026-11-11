import { celeYouGuestOrigin } from "@/lib/app-url";
import type { DigitalCardPublicPayload } from "./types";
import { digitalCardPublicUrl } from "./types";
import { buildVCard, digitalCardVcardPath, vcardFileName } from "./vcard";

export type SaveContactResult = "shared" | "opened" | "downloaded" | "cancelled";

/**
 * Save every live CeleYou field into the device address book.
 * iPhone and iPad open Add to Contacts. Android shares or downloads a .vcf.
 * Windows and Mac download a .vcf that People, Outlook, and Contacts open.
 */
export async function saveDigitalCardContact(
  card: DigitalCardPublicPayload,
  options?: { origin?: string; source?: "guest" | "owner" }
): Promise<SaveContactResult> {
  const filename = vcardFileName(card);
  const guestHref = digitalCardVcardPath(card.slug);
  const cardUrl = digitalCardPublicUrl(card.slug, celeYouGuestOrigin(options?.origin));
  const serverFile = await readVcfFile(guestHref, filename);
  const file =
    serverFile ??
    new File([buildVCard(card, { cardUrl })], filename, { type: "text/vcard;charset=utf-8" });

  if (serverFile && isAppleTouchDevice()) {
    window.location.assign(guestHref);
    return "opened";
  }

  try {
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: card.displayName,
        text: `Save ${card.displayName} to contacts`,
      });
      return "shared";
    }
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") return "cancelled";
  }

  if (serverFile) {
    triggerDownload(guestHref, filename);
    return "downloaded";
  }

  triggerBlobDownload(file, filename);
  return "downloaded";
}

async function readVcfFile(href: string, filename: string): Promise<File | null> {
  try {
    const url = href.includes("?") ? `${href}&delivery=1` : `${href}?delivery=1`;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength < 16) return null;
    return new File([buffer], filename, { type: "text/vcard;charset=utf-8" });
  } catch {
    return null;
  }
}

function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
