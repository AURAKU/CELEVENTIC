import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGuestReach,
  guestReachLeaksDestination,
  hashCeleCardAccessCode,
  hashesMatch,
  normalizeAccessCode,
  readReachVisibilityMap,
} from "@/lib/digital-business-card/privacy";
import { toGuestPublicPayload } from "@/lib/digital-business-card/access";
import { buildVCard } from "@/lib/digital-business-card/vcard";

const future = new Date(Date.now() + 86400000);

function liveCard(overrides: Record<string, unknown> = {}) {
  return {
    id: "card_owner_1",
    slug: "ama-serwaa",
    publicToken: "tok_secret_qr",
    displayName: "Ama Serwaa",
    title: "Creative Director",
    company: "Folio Maison",
    bio: "Studio bio",
    email: "ama@secret.test",
    phone: "+233240000000",
    website: "https://folio.secret",
    socials: {
      emails: ["ama@secret.test", "studio@secret.test"],
      emailTags: ["business", "personal"],
      phones: ["+233240000000"],
      momo: "0240000000",
      instagram: "amaserwaa",
      reachVisibility: {
        "phone-0": "CODE_PROTECTED",
        "momo-0": "REQUEST_ACCESS",
        "email-1": "CODE_PROTECTED",
      },
    },
    themeId: "gold-folio",
    avatarUrl: "/digital-cards/demo/ama-serwaa.jpg",
    nfcEnabled: true,
    connectBackEnabled: true,
    defaultMode: "professional",
    isPublished: true,
    subscriptionStatus: "ACTIVE",
    subscriptionExpiresAt: future,
    ...overrides,
  };
}

describe("CeleYou reach privacy", () => {
  it("treats missing visibility as public", () => {
    assert.deepEqual(readReachVisibilityMap({}), {});
    assert.equal(normalizeAccessCode("4826")?.kind, "DIGITS");
    assert.equal(normalizeAccessCode("nova")?.code, "NOVA");
    assert.equal(normalizeAccessCode("NOVA1"), null);
    assert.equal(normalizeAccessCode("12"), null);
  });

  it("hashes codes without storing plaintext", () => {
    const hash = hashCeleCardAccessCode("card_1", "nova");
    assert.equal(hash, hashCeleCardAccessCode("card_1", "NOVA"));
    assert.equal(hashesMatch(hash, hashCeleCardAccessCode("card_1", "nova")), true);
    assert.equal(hash.includes("NOVA"), false);
    assert.equal(hashesMatch(hash, hashCeleCardAccessCode("card_1", "4826")), false);
    assert.equal(hashesMatch(hash, hashCeleCardAccessCode("card_2", "nova")), false);
  });

  it("withholds protected destinations from guests until a grant", () => {
    const guest = buildGuestReach(liveCard());
    assert.equal(guestReachLeaksDestination(guest.guestReach), false);
    assert.equal(guest.socials.momo, undefined);
    assert.equal(guest.phone, null);
    assert.equal(guest.socials.instagram, "amaserwaa");
    assert.equal(guest.socials.emails?.includes("studio@secret.test"), false);
    const lockedPhone = guest.guestReach.find((item) => item.id === "phone-0");
    assert.equal(lockedPhone?.locked, true);
    assert.equal(lockedPhone?.href, "");
    assert.equal(lockedPhone?.copyValue, undefined);
    assert.equal(lockedPhone?.subtitle, "Tap to view");
    assert.equal(lockedPhone?.visibility, "CODE_PROTECTED");
    const instagram = guest.guestReach.find((item) => item.brand === "instagram");
    assert.equal(Boolean(instagram?.href), true);

    const granted = buildGuestReach(liveCard(), ["phone-0"]);
    assert.equal(granted.phone, "+233240000000");
    const openPhone = granted.guestReach.find((item) => item.id === "phone-0");
    assert.equal(openPhone?.locked, undefined);
    assert.equal(granted.socials.momo, undefined);
  });

  it("keeps protected values out of the public payload and vCard", () => {
    const payload = toGuestPublicPayload(liveCard());
    assert.equal(payload.phone, null);
    assert.equal(payload.socials.momo, undefined);
    const vcf = buildVCard(payload);
    assert.equal(vcf.includes("+233240000000"), false);
    assert.equal(vcf.includes("studio@secret.test"), false);
    assert.equal(vcf.includes("ama@secret.test"), true);
    assert.equal(payload.guestReach?.some((item) => item.id === "momo-0" && item.locked), true);
    assert.equal("reachVisibility" in payload.socials, false);
    assert.equal(JSON.stringify(payload).includes("0240000000"), false);
    assert.equal(JSON.stringify(payload).includes("+233240000000"), false);
  });

  it("lets the studio preview hide only the details the cardholder marked", async () => {
    const { applyReachVisibilityPreview, buildGuestReach } = await import(
      "@/lib/digital-business-card/privacy"
    );
    const guest = buildGuestReach(liveCard());
    const preview = applyReachVisibilityPreview(guest.guestReach.filter((item) => !item.locked), {
      "instagram-0": "CODE_PROTECTED",
    });
    const instagram = preview.find((item) => item.brand === "instagram");
    assert.equal(instagram?.locked, true);
    assert.equal(instagram?.subtitle, "Tap to view");
    assert.equal(instagram?.href, "");
    assert.equal(preview.find((item) => item.brand === "email")?.locked, undefined);
  });
});
