import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDigitalCardTheme, DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { buildVCard } from "@/lib/digital-business-card/vcard";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";
import { SMARTCARD_PLANS, getSmartCardPlan } from "@/lib/digital-business-card/plans";
import { SMARTCARD_THEME_DEMOS } from "@/lib/digital-business-card/demos";

describe("digital business card themes", () => {
  it("resolves known and fallback themes", () => {
    assert.equal(DIGITAL_CARD_THEMES.length >= 30, true);
    assert.equal(resolveDigitalCardTheme("teal-pulse").id, "teal-pulse");
    assert.equal(resolveDigitalCardTheme("founder").id, "founder");
    assert.equal(resolveDigitalCardTheme("deco-gilded").id, "deco-gilded");
    assert.equal(resolveDigitalCardTheme("missing").id, "elegant-frost");
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "iconic"), true);
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "cinematic"), true);
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "landmark"), true);
    assert.equal(DIGITAL_CARD_THEMES.some((t) => t.category === "atelier"), true);
    const ids = DIGITAL_CARD_THEMES.map((t) => t.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(
      DIGITAL_CARD_THEMES.every((t) => Boolean(t.atmosphere && t.atmosphere !== "none")),
      true
    );
  });

  it("gives every theme a unique dummy persona", () => {
    const names = DIGITAL_CARD_THEMES.map((t) => SMARTCARD_THEME_DEMOS[t.id].displayName);
    assert.equal(names.length, new Set(names).size);
  });
});

describe("smartcard plans", () => {
  it("prices monthly through yearly with savings", () => {
    assert.equal(SMARTCARD_PLANS.length, 4);
    assert.equal(getSmartCardPlan("monthly")?.priceGhs, 49);
    assert.equal(getSmartCardPlan("quarter")?.months, 3);
    assert.equal(getSmartCardPlan("half")?.priceGhs, 239);
    assert.equal(getSmartCardPlan("yearly")?.priceGhs, 449);
    assert.equal((getSmartCardPlan("yearly")?.saveGhs ?? 0) > 0, true);
  });
});

describe("nfc capability detection", () => {
  it("never claims write support without Web NFC", async () => {
    const { detectNfcWriteSupport } = await import("@/lib/digital-business-card/nfc-capability");
    const result = detectNfcWriteSupport({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      platform: "MacIntel",
      maxTouchPoints: 0,
    } as Navigator);
    assert.equal(result.canWrite, false);
    assert.match(result.guidance, /Android|Chrome|NFC/i);
  });
});

describe("digital business card live gate", () => {
  it("requires publish + paid ACTIVE + unexpired", () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: future,
      }),
      false
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: future,
      }),
      true
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: past,
      }),
      false
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: false,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: future,
      }),
      false
    );
  });
});

describe("vcard export", () => {
  it("builds a parseable vcard", () => {
    const vcf = buildVCard({
      id: "card_1",
      slug: "ama",
      publicToken: "tok_ama",
      displayName: "Ama Mensah",
      title: "Founder",
      company: "Celeventic",
      bio: "Hello",
      email: "ama@example.com",
      phone: "+233000",
      website: "https://celeventic.com",
      socials: { linkedin: "ama" },
      themeId: "elegant-frost",
      avatarUrl: null,
      nfcEnabled: true,
      connectBackEnabled: true,
      defaultMode: "professional",
      isLive: true,
    });
    assert.match(vcf, /BEGIN:VCARD/);
    assert.match(vcf, /FN:Ama Mensah/);
    assert.match(vcf, /EMAIL:ama@example.com/);
    assert.match(vcf, /END:VCARD/);
  });
});
