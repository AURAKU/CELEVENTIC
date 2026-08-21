import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDigitalCardTheme, DIGITAL_CARD_THEMES } from "@/lib/digital-business-card/themes";
import { buildVCard } from "@/lib/digital-business-card/vcard";
import { isDigitalCardLive } from "@/services/digital-business-card/digital-business-card.service";

describe("digital business card themes", () => {
  it("resolves known and fallback themes", () => {
    assert.equal(DIGITAL_CARD_THEMES.length >= 8, true);
    assert.equal(resolveDigitalCardTheme("teal-pulse").id, "teal-pulse");
    assert.equal(resolveDigitalCardTheme("missing").id, "elegant-frost");
  });
});

describe("digital business card live gate", () => {
  it("requires publish + non-expired trial/active", () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "TRIAL",
        subscriptionExpiresAt: future,
      }),
      true
    );
    assert.equal(
      isDigitalCardLive({
        isPublished: true,
        subscriptionStatus: "TRIAL",
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
      slug: "ama",
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
      isLive: true,
    });
    assert.match(vcf, /BEGIN:VCARD/);
    assert.match(vcf, /FN:Ama Mensah/);
    assert.match(vcf, /EMAIL:ama@example.com/);
    assert.match(vcf, /END:VCARD/);
  });
});
