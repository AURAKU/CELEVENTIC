import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  otherLinkHref,
  otherLinkSeed,
  parseOtherLink,
  serializeOtherLink,
} from "@/lib/digital-business-card/other-links";
import {
  isCompleteReachValue,
  listDigitalCardReachItems,
  reviewReachInput,
  toDigitalCardSocialForm,
} from "@/lib/digital-business-card/socials";
import { buildVCard } from "@/lib/digital-business-card/vcard";
import { DEMO_CARD } from "@/lib/digital-business-card/demo-card";

describe("CeleYou other pages", () => {
  it("packs a guest name with any live page", () => {
    const packed = serializeOtherLink({
      label: "Calendly",
      href: "https://calendly.com/ama-serwaa/intro",
    });
    const parsed = parseOtherLink(packed);
    assert.equal(parsed.label, "Calendly");
    assert.equal(parsed.href, "https://calendly.com/ama-serwaa/intro");
    assert.equal(otherLinkHref(packed), "https://calendly.com/ama-serwaa/intro");
    assert.equal(isCompleteReachValue("other", packed), true);
    assert.equal(reviewReachInput("other", packed).status, "ok");
  });

  it("reads a plain URL and a typed name reservation", () => {
    const fromUrl = parseOtherLink("https://xiaohongshu.com/user/folio");
    assert.equal(fromUrl.label, "xiaohongshu.com");
    assert.equal(fromUrl.href, "https://xiaohongshu.com/user/folio");
    assert.equal(otherLinkSeed("Calendly"), serializeOtherLink({ label: "Calendly", href: "" }));
    assert.equal(
      otherLinkSeed("https://calendly.com/ama"),
      serializeOtherLink({ label: "", href: "https://calendly.com/ama" })
    );
    assert.equal(isCompleteReachValue("other", otherLinkSeed("Calendly")), false);
    assert.equal(reviewReachInput("other", otherLinkSeed("Calendly")).status, "review");
  });

  it("publishes named pages on the guest card", () => {
    const packed = serializeOtherLink({
      label: "Book a sitting",
      href: "https://calendly.com/ama-serwaa/intro",
    });
    const items = listDigitalCardReachItems({
      email: null,
      phone: null,
      website: null,
      socials: { other: [packed, "https://folio.house/lookbook"] },
    });
    const pages = items.filter((item) => item.brand === "other");
    assert.equal(pages.length, 2);
    assert.equal(pages[0]?.title, "Book a sitting");
    assert.equal(pages[0]?.subtitle, "calendly.com");
    assert.equal(pages[0]?.surface, "stack");
    assert.equal(pages[0]?.href, "https://calendly.com/ama-serwaa/intro");
    assert.equal(pages[1]?.title, "folio.house");
    assert.match(pages[1]?.href ?? "", /folio\.house\/lookbook/);
  });

  it("keeps other pages off the dummy desk until added", () => {
    const form = toDigitalCardSocialForm(DEMO_CARD.socials);
    assert.deepEqual(form.other, []);
  });

  it("saves the named page on the contact card", () => {
    const packed = serializeOtherLink({
      label: "Book a sitting",
      href: "https://calendly.com/ama-serwaa/intro",
    });
    const vcf = buildVCard({
      id: "card_other",
      slug: "ama",
      publicToken: "tok_ama",
      displayName: "Ama Mensah",
      title: "Founder",
      company: "Celeventic",
      bio: null,
      email: null,
      phone: null,
      website: null,
      socials: { other: packed },
      themeId: "elegant-frost",
      avatarUrl: null,
      pronouns: null,
      nfcEnabled: true,
      connectBackEnabled: true,
      defaultMode: "professional",
      isLive: true,
    });
    assert.match(vcf, /https:\/\/calendly\.com\/ama-serwaa\/intro/);
    assert.match(vcf, /X-ABLabel:Book a sitting/);
  });
});
