import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { canPerformCeleCardAction } from "@/lib/digital-business-card/admin-permissions";
import {
  NFC_HARDWARE_UID_IS_NOT_AUTH,
  nfcActionFromAdminAction,
  nfcDeviceMayRevoke,
  nfcTapOutcome,
} from "@/lib/digital-business-card/nfc-device";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import {
  celeYouEmailShareHref,
  celeYouPrintQrPngSrc,
  celeYouPrintQrSvgSrc,
  celeYouWhatsAppShareHref,
} from "@/lib/digital-business-card/share-channels";
import { celeYouCameraScanUrl } from "@/lib/digital-business-card/share-identity";
import { CELECARD_LIFECYCLE_EVENTS } from "@/lib/digital-business-card/lifecycle";
import { DEFAULT_PRODUCTION_URL } from "@/lib/app-url";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou NFC QR and universal sharing", () => {
  it("keeps QR and NFC destinations on tokens, not the editable slug", () => {
    const scan = celeYouCameraScanUrl("cmqr_kojo_live", "http://127.0.0.1:3000");
    assert.equal(scan, `${DEFAULT_PRODUCTION_URL}/c/cmqr_kojo_live`);
    const png = celeYouPrintQrPngSrc(scan);
    const svg = celeYouPrintQrSvgSrc(scan);
    assert.match(png, /data=https%3A%2F%2Fwww.celeventic.com%2Fc%2Fcmqr_kojo_live/);
    assert.match(png, /size=2048/);
    assert.match(png, /mode=guide/);
    assert.match(png, /download=1/);
    assert.doesNotMatch(png, /format=svg/);
    assert.match(svg, /format=svg/);
    assert.match(svg, /mode=guide/);
    const update = source("src/services/digital-business-card/digital-business-card.service.ts");
    const fn = update.slice(
      update.indexOf("export async function updateDigitalCard"),
      update.indexOf("export async function activateDigitalCardFromPayment")
    );
    assert.doesNotMatch(fn, /publicToken/);
    const restoreFile = source("src/services/digital-business-card/design-vault.service.ts");
    const restore = restoreFile.slice(
      restoreFile.indexOf("export async function restoreDesignVersion"),
      restoreFile.indexOf("export async function renameDesignVersion")
    );
    assert.match(restore, /slugUnchanged/);
    assert.match(restore, /tokenUnchanged/);
    assert.match(restore, /themeId: theme\.id/);
    assert.doesNotMatch(restore, /publicToken:/);
    assert.doesNotMatch(restore, /slug:/);
  });

  it("exports print QR without a center logo and with a wide quiet zone", () => {
    const generator = source("src/lib/qr/branded-qr-generator.ts");
    assert.match(generator, /ERROR_LEVEL = "H"/);
    assert.match(generator, /GUIDE_MARGIN = 8/);
    assert.match(generator, /GUIDE_DARK = "#000000"/);
    assert.match(generator, /if \(mode === "guide"\) return 0/);
    const desk = source("src/components/digital-business-card/digital-card-share-desk.tsx");
    assert.match(desk, /celeYouPrintQrPngSrc\(publicShare\)/);
    assert.match(desk, /celeYouPrintQrSvgSrc\(publicShare\)/);
  });

  it("does not treat hardware UID as authentication and keeps lost tags off the profile", () => {
    assert.equal(NFC_HARDWARE_UID_IS_NOT_AUTH, true);
    assert.equal(nfcTapOutcome({ deviceStatus: "LOST", nfcEnabled: true, guestShareable: true }), "lost");
    assert.equal(nfcTapOutcome({ deviceStatus: "REPLACED", nfcEnabled: true, guestShareable: true }), "replaced");
    const tap = source("src/services/digital-business-card/nfc-device.service.ts");
    assert.doesNotMatch(tap, /hardwareUid|tagUid|uidHash/);
    assert.match(tap, /where: \{ publicToken \}/);
    assert.match(tap, /loadNfcDeviceByPublicToken/);
    const page = source("src/app/n/[token]/page.tsx");
    assert.match(page, /Tags store only this short URL, never private profile data/);
  });

  it("lets admins manage NFC and rejects organizers", () => {
    assert.equal(canPerformCeleCardAction({ role: "ADMIN" }, "nfc_replace"), true);
    assert.equal(canPerformCeleCardAction({ role: "ADMIN" }, "nfc_revoke"), true);
    assert.equal(canPerformCeleCardAction({ role: "ORGANIZER" }, "nfc_replace"), false);
    assert.equal(canPerformCeleCardAction({ role: "GUEST" }, "nfc_register"), false);
    assert.equal(nfcActionFromAdminAction("nfc_lost"), "lost");
    assert.equal(nfcDeviceMayRevoke("ACTIVE"), true);
    assert.equal(nfcDeviceMayRevoke("REPLACED"), false);
    const route = source("src/app/api/admin/celecard/cards/[id]/action/route.ts");
    assert.match(route, /nfc_register/);
    assert.match(route, /nfc_revoke/);
    assert.match(route, /requireCeleCardPermission/);
    const command = source("src/services/digital-business-card/admin-command.service.ts");
    assert.match(command, /applyNfcDeviceMutation/);
    assert.match(command, /kind: input.action/);
    assert.match(command, /qrTokenUnchanged: true/);
    for (const kind of ["NfcRegistered", "NfcPaused", "NfcLost", "NfcReplaced", "NfcRevoked"] as const) {
      assert.equal(CELECARD_LIFECYCLE_EVENTS.includes(kind), true);
    }
  });

  it("does not claim every device can write NFC", () => {
    const ios = detectNfcWriteSupport({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    } as Navigator);
    assert.equal(ios.canWrite, false);
    assert.match(ios.guidance, /Copy the NFC link/);
    const desktop = detectNfcWriteSupport({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120",
      platform: "MacIntel",
      maxTouchPoints: 0,
    } as Navigator);
    assert.equal(desktop.canWrite, false);
    const write = source("src/lib/digital-business-card/nfc-write.ts");
    assert.match(write, /Chrome on Android only/);
  });

  it("falls back to WhatsApp, email, and copy when native share is missing", () => {
    const href = celeYouWhatsAppShareHref(
      "Connect with Kojo Mensah. Their CeleYou Card.",
      "https://www.celeventic.com/u/kojo-mensah"
    );
    assert.match(href, /^https:\/\/wa\.me\/\?text=/);
    assert.match(decodeURIComponent(href), /celeventic.com\/u\/kojo-mensah/);
    assert.equal(href.includes("+233"), false);
    const mail = celeYouEmailShareHref(
      "Kojo Mensah on CeleYou",
      "Connect with Kojo Mensah. Their CeleYou Card.",
      "https://www.celeventic.com/u/kojo-mensah"
    );
    assert.match(mail, /^mailto:\?subject=/);
    assert.match(decodeURIComponent(mail), /celeventic.com\/u\/kojo-mensah/);
    const desk = source("src/components/digital-business-card/digital-card-share-desk.tsx");
    assert.match(desk, /celeYouWhatsAppShareHref/);
    assert.match(desk, /celeYouEmailShareHref/);
    assert.match(desk, /COPY_PROFILE_LINK_CTA/);
    const engine = source("src/lib/celeyou-share/engine.ts");
    assert.match(engine, /copyCeleYouProfile/);
  });
});
