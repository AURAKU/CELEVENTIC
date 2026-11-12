import type { DigitalCardPublicPayload } from "./types";
import { buildVCard, celeYouContactProfileUrl, digitalCardVcardPath, vcardFileName } from "./vcard";

export type SaveContactResult = "shared" | "opened" | "downloaded" | "cancelled" | "unavailable";

/**
 * Save every live CeleYou field into the device address book.
 * iPhone and iPad open Add to Contacts. Android shares or downloads a .vcf.
 * Windows and Mac download a .vcf that People, Outlook, and Contacts open.
 */
export async function saveDigitalCardContact(
  card: DigitalCardPublicPayload,
  options?: { origin?: string; source?: "guest" | "owner" }
): Promise<SaveContactResult> {
  const prepared = await prepareContactFile(card, options?.origin);
  if (!prepared) return "unavailable";

  if (prepared.serverFile && isAppleTouchDevice()) {
    window.location.assign(prepared.guestHref);
    return "opened";
  }

  try {
    if (canShareVCardFile(prepared.file)) {
      await navigator.share({
        files: [prepared.file],
        title: card.displayName,
        text: `Save ${card.displayName} to contacts`,
      });
      return "shared";
    }
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") return "cancelled";
  }

  if (prepared.serverFile) {
    triggerDownload(prepared.guestHref, prepared.filename);
    return "downloaded";
  }

  triggerBlobDownload(prepared.file, prepared.filename);
  return "downloaded";
}

/**
 * Share the .vcf through the OS share sheet when the browser supports files.
 * AirDrop or Quick Share may appear. CeleYou cannot pick a recipient.
 */
export async function shareDigitalCardContactFile(
  card: DigitalCardPublicPayload,
  options?: { origin?: string }
): Promise<SaveContactResult> {
  const prepared = await prepareContactFile(card, options?.origin);
  if (!prepared) return "unavailable";

  try {
    if (canShareVCardFile(prepared.file)) {
      await navigator.share({
        files: [prepared.file],
        title: `${card.displayName} contact`,
        text: `Contact for ${card.displayName}`,
      });
      return "shared";
    }
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") return "cancelled";
  }

  if (prepared.serverFile) {
    triggerDownload(prepared.guestHref, prepared.filename);
    return "downloaded";
  }
  triggerBlobDownload(prepared.file, prepared.filename);
  return "downloaded";
}

export function canShareVCardFile(
  file?: File,
  nav: Navigator | null | undefined = typeof navigator !== "undefined" ? navigator : null
): boolean {
  if (!nav || typeof nav.canShare !== "function" || typeof nav.share !== "function") return false;
  if (!file) return true;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function prepareContactFile(card: DigitalCardPublicPayload, origin?: string) {
  if (!card.slug) return null;
  const filename = vcardFileName(card);
  const guestHref = digitalCardVcardPath(card.slug);
  const cardUrl = celeYouContactProfileUrl(card.slug, origin);
  const serverFile = await readVcfFile(guestHref, filename);
  const file =
    serverFile ??
    new File([buildVCard(card, { cardUrl })], filename, { type: "text/vcard;charset=utf-8" });
  return { filename, guestHref, serverFile, file };
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
  a.href = href.includes("?") ? `${href}&delivery=1` : `${href}?delivery=1`;
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
