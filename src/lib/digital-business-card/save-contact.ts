import type { DigitalCardPublicPayload } from "./types";
import { digitalCardPublicUrl } from "./types";
import { buildVCard, digitalCardVcardPath, vcardFileName } from "./vcard";

export type SaveContactResult = "shared" | "opened" | "downloaded" | "cancelled";

/**
 * Save the CeleYou into the device address book.
 * iPhone and iPad open Add to Contacts. Android, Windows, and Mac get a .vcf
 * that Contacts, People, and Outlook already know how to import.
 */
export async function saveDigitalCardContact(
  card: DigitalCardPublicPayload,
  options?: { origin?: string; source?: "guest" | "owner" }
): Promise<SaveContactResult> {
  const filename = vcardFileName(card);
  const guestHref = digitalCardVcardPath(card.slug);

  if (options?.source !== "owner" && isAppleTouchDevice()) {
    window.location.assign(guestHref);
    return "opened";
  }

  if (options?.source !== "owner" && isAndroidDevice()) {
    window.location.assign(guestHref);
    return "opened";
  }

  const cardUrl = digitalCardPublicUrl(card.slug, options?.origin);
  const vcf = buildVCard(card, { cardUrl });
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/vcard;charset=utf-8" });

  if (isMobileDevice()) {
    try {
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: card.displayName, text: card.displayName });
        return "shared";
      }
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return "cancelled";
    }
  }

  if (options?.source !== "owner") {
    triggerDownload(guestHref, filename);
    return "downloaded";
  }

  triggerBlobDownload(blob, filename);
  return "downloaded";
}

function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

function isMobileDevice() {
  return isAppleTouchDevice() || isAndroidDevice();
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
