import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEMMORA_CATALOG_SLUG,
  LUXURY_FASHION_LAYOUT_SLUG,
} from "@/lib/experience/luxury-fashion";
import { SocialPlaceCardMarkup } from "../social-place-card-image";
import {
  SOCIAL_PLACE_CARD_HEIGHT,
  SOCIAL_PLACE_CARD_TYPE,
  SOCIAL_PLACE_CARD_WIDTH,
  buildAureliaFamilyShareSurface,
  buildSocialPlaceCardVersion,
  decorateSocialPlaceCardImage,
  isSocialPlaceCardUnavailable,
  resolveSocialPlaceCardVariant,
  socialPlaceCardCacheControl,
} from "../social-place-card";
import { buildInviteOpenGraphMetadata, EXPIRED_INVITE_METADATA } from "../invitation-share-metadata";

const APP = "https://www.celeventic.com";

function collectText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node === "object" && node && "props" in node) {
    return collectText((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

describe("resolveSocialPlaceCardVariant", () => {
  it("selects family palettes for Aurelia/Seraphine and platform for every other SKU", () => {
    assert.equal(
      resolveSocialPlaceCardVariant({
        catalogSlug: "aurelia-editorial-wedding",
        layoutSlug: "aurelia-editorial-wedding",
      }),
      "aurelia"
    );
    assert.equal(
      resolveSocialPlaceCardVariant({
        catalogSlug: "seraphine-champagne-wedding",
        layoutSlug: "seraphine-champagne-wedding",
      }),
      "seraphine"
    );
    assert.equal(
      resolveSocialPlaceCardVariant({
        catalogSlug: FEMMORA_CATALOG_SLUG,
        layoutSlug: LUXURY_FASHION_LAYOUT_SLUG,
      }),
      "platform"
    );
    assert.equal(
      resolveSocialPlaceCardVariant({
        catalogSlug: "forever-afaris-wedding",
        layoutSlug: "forever-afaris-wedding",
      }),
      "platform"
    );
  });
});

describe("Aurelia / Seraphine share surface", () => {
  it("builds a versioned 1200×630 Aurelia place-card URL with Enock & Ruth copy", () => {
    const surface = buildAureliaFamilyShareSurface({
      appUrl: APP,
      uniqueLink: "enock-ruth",
      catalogSlug: "aurelia-editorial-wedding",
      layoutSlug: "aurelia-editorial-wedding",
      eventTitle: "AURELIA",
      hostName: "Enock & Ruth",
      partnerOneName: "Enock",
      partnerTwoName: "Ruth",
      dateDisplay: "October 2026",
      versionParts: ["2026-09-26T00:00:00.000Z", "/templates/aurelia/hero.jpg"],
    });
    assert.equal(surface.variant, "aurelia");
    assert.equal(surface.title, "Enock & Ruth");
    assert.equal(surface.shareTitle, "Enock & Ruth · You're invited");
    assert.match(surface.description, /You're invited to Enock & Ruth/);
    assert.doesNotMatch(surface.description, /Prince|invites you to celebrate with them/i);
    assert.doesNotMatch(surface.shareTitle + surface.description, /AURELIA|Aurelia Editorial/i);
    assert.equal(surface.image.width, SOCIAL_PLACE_CARD_WIDTH);
    assert.equal(surface.image.height, SOCIAL_PLACE_CARD_HEIGHT);
    assert.equal(surface.image.type, SOCIAL_PLACE_CARD_TYPE);
    assert.equal(surface.image.width, 1200);
    assert.equal(surface.image.height, 630);
    assert.match(surface.image.url, /\/api\/social\/invite\/enock-ruth\/image\?v=/);
    assert.match(surface.canonicalUrl, /\/invite\/enock-ruth$/);
  });

  it("builds Kojo & Fafa Seraphine copy with the real date and no template name", () => {
    const surface = buildAureliaFamilyShareSurface({
      appUrl: APP,
      uniqueLink: "kojo-fafa",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      eventTitle: "Seraphine Champagne",
      hostName: "Kojo & Fafa",
      invitationName: "Kojo & Fafa Seraphine",
      partnerOneName: "Kojo",
      partnerTwoName: "Fafa",
      dateDisplay: "14 November 2026",
      weekday: "Saturday",
      versionParts: ["hero-v1"],
    });
    assert.equal(surface.variant, "seraphine");
    assert.equal(surface.title, "Kojo & Fafa");
    assert.equal(surface.shareTitle, "Kojo & Fafa · You're invited");
    assert.equal(
      surface.description,
      "You're invited to celebrate Kojo & Fafa on Saturday, 14 November 2026."
    );
    assert.equal(surface.guestGreeting, null);
    assert.doesNotMatch(surface.description, /Dear /);
    assert.doesNotMatch(
      `${surface.title} ${surface.shareTitle} ${surface.description}`,
      /Seraphine|seraphine-champagne/i
    );
    assert.equal(surface.dateLabel, "14 NOVEMBER 2026");
    assert.doesNotMatch(surface.image.url, /guest=/);
  });

  it("personalizes Aurelia and Seraphine cards with isolated guest cache URLs", () => {
    const ama = buildAureliaFamilyShareSurface({
      appUrl: APP,
      uniqueLink: "enock-ruth",
      catalogSlug: "aurelia-editorial-wedding",
      layoutSlug: "aurelia-editorial-wedding",
      eventTitle: "AURELIA",
      hostName: "Enock & Ruth",
      guestDisplayName: "Ama",
      guestToken: "ama-token",
      versionParts: ["hero"],
    });
    const esther = buildAureliaFamilyShareSurface({
      appUrl: APP,
      uniqueLink: "kojo-fafa",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      eventTitle: "Seraphine Champagne",
      hostName: "Kojo & Fafa",
      guestDisplayName: "Esther",
      guestToken: "esther-token",
      dateDisplay: "14 November 2026",
      weekday: "Saturday",
      versionParts: ["hero"],
    });
    const kofi = buildAureliaFamilyShareSurface({
      appUrl: APP,
      uniqueLink: "enock-ruth",
      catalogSlug: "aurelia-editorial-wedding",
      layoutSlug: "aurelia-editorial-wedding",
      eventTitle: "AURELIA",
      hostName: "Enock & Ruth",
      guestDisplayName: "Kofi",
      guestToken: "kofi-token",
      versionParts: ["hero"],
    });

    assert.equal(ama.shareTitle, "Enock & Ruth · You're invited");
    assert.equal(ama.guestGreeting, "Dear Ama,");
    assert.equal(ama.description, "Dear Ama, you are personally invited.");
    assert.match(ama.shareText, /Dear Ama,/);
    assert.match(ama.shareText, /You are personally invited\./);
    assert.match(ama.shareText, /Open your invitation:/);
    assert.match(ama.image.url, /guest=ama-token/);
    assert.doesNotMatch(`${ama.shareTitle} ${ama.description}`, /Aurelia/i);

    assert.equal(esther.shareTitle, "Kojo & Fafa · You're invited");
    assert.equal(esther.guestGreeting, "Dear Esther,");
    assert.equal(esther.description, "Dear Esther, you are personally invited.");
    assert.match(esther.shareText, /Dear Esther,/);
    assert.match(esther.image.url, /guest=esther-token/);
    assert.doesNotMatch(`${esther.shareTitle} ${esther.description}`, /Seraphine/i);

    assert.match(kofi.image.url, /guest=kofi-token/);
    assert.notEqual(ama.image.url, kofi.image.url);
    assert.notEqual(ama.image.url, esther.image.url);
  });

  it("uses the event's uploaded hero and keeps a stored Pastor honorific", () => {
    const surface = buildAureliaFamilyShareSurface({
      appUrl: APP,
      uniqueLink: "9qsZeEvYS6k08i78n67WHelxMHK65oVE",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      eventTitle: "Seraphine Champagne",
      hostName: "Kojo & Fafa",
      guestDisplayName: "Pastor Christopher Fiave",
      guestToken: "cmusgwbyy00n0lag9ozdkhgmj",
      heroImageUrl: "/templates/seraphine/hero.jpg",
      mediaHeroUrl: "/templates/seraphine/hero.jpg",
      coverImageUrl: "/uploads/events/kojo-fafa-hero.jpg",
      versionParts: ["hero-upload"],
    });
    assert.equal(surface.heroUrl, "/uploads/events/kojo-fafa-hero.jpg");
    assert.equal(surface.guestGreeting, "Dear Pastor Christopher Fiave,");
    assert.equal(surface.phrase, "You are personally invited.");
    assert.match(surface.shareText, /Open your invitation:/);
    assert.doesNotMatch(surface.shareText, /https?:\/\//);
    assert.match(surface.canonicalUrl, /guest=cmusgwbyy00n0lag9ozdkhgmj/);
    assert.doesNotMatch(`${surface.title} ${surface.shareTitle}`, /Seraphine/i);
  });

  it("keeps the version stable for the same inputs and changes when the title changes", () => {
    const a = buildSocialPlaceCardVersion(["hero.jpg", "Enock & Ruth"]);
    const b = buildSocialPlaceCardVersion(["hero.jpg", "Enock & Ruth"]);
    const c = buildSocialPlaceCardVersion(["hero.jpg", "Kojo & Fafa"]);
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("marks expired and cancelled invitations unavailable", () => {
    assert.equal(isSocialPlaceCardUnavailable({ invitationStatus: "EXPIRED" }), true);
    assert.equal(isSocialPlaceCardUnavailable({ eventStatus: "CANCELLED" }), true);
    assert.equal(isSocialPlaceCardUnavailable({ invitationStatus: "DRAFT" }), true);
    assert.equal(isSocialPlaceCardUnavailable({ invitationStatus: "ACTIVE", eventStatus: "PUBLISHED" }), false);
  });
});

describe("social place-card cache control", () => {
  it("never shares personalized guest cards on a public CDN", () => {
    const personalized = socialPlaceCardCacheControl({ personalized: true });
    assert.match(personalized, /private/i);
    assert.match(personalized, /no-store/i);
    assert.doesNotMatch(personalized, /s-maxage/i);
    assert.doesNotMatch(personalized, /public/i);
  });

  it("allows public caching of generic versioned cards", () => {
    const generic = socialPlaceCardCacheControl({ personalized: false });
    assert.match(generic, /public/i);
    assert.match(generic, /s-maxage=86400/);
  });

  it("keeps unavailable cards briefly cacheable without storing guest identity", () => {
    const unavailable = socialPlaceCardCacheControl({ personalized: false, unavailable: true });
    assert.match(unavailable, /public/i);
    assert.match(unavailable, /s-maxage=300/);
    assert.doesNotMatch(unavailable, /s-maxage=86400/);
  });

  it("does not let personalized win over privacy even if also marked unavailable", () => {
    const both = socialPlaceCardCacheControl({ personalized: true, unavailable: true });
    assert.match(both, /private/i);
    assert.match(both, /no-store/i);
  });
});

describe("social place-card markup", () => {
  it("renders the couple image, event title, and Celeventic mark without template names", () => {
    const tree = SocialPlaceCardMarkup({
      variant: "aurelia",
      title: "Enock & Ruth",
      dateLabel: "OCTOBER 2026",
      heroSrc: "/templates/aurelia/hero.jpg",
    });
    const text = collectText(tree);
    assert.match(text, /Enock & Ruth/);
    assert.match(text, /YOU'RE INVITED|YOU&apos;RE INVITED/);
    assert.match(text, /CELEVENTIC/);
    assert.doesNotMatch(text, /Aurelia|Seraphine|Editorial Wedding|Champagne/i);
    const hero = (tree as { props: { children: Array<{ props?: { children?: unknown } }> } }).props
      .children;
    const serialized = JSON.stringify(tree);
    assert.match(serialized, /\/templates\/aurelia\/hero\.jpg/);
    assert.match(serialized, /objectFit":"cover"/);
    void hero;
  });

  it("uses a premium unavailable fallback instead of a broken preview", () => {
    const tree = SocialPlaceCardMarkup({
      variant: "seraphine",
      title: "Kojo & Fafa",
      unavailable: true,
    });
    const text = collectText(tree);
    assert.match(text, /no longer available/i);
    assert.doesNotMatch(text, /Seraphine/i);
  });

  it("renders a personalized greeting without making the guest the event title", () => {
    const tree = SocialPlaceCardMarkup({
      variant: "seraphine",
      title: "Kojo & Fafa",
      dateLabel: "14 NOVEMBER 2026",
      guestGreeting: "Dear Ama,",
      kicker: "PRIVATE INVITATION",
      phrase: "invite you to celebrate with them",
    });
    const text = collectText(tree);
    assert.match(text, /Dear Ama,/);
    assert.match(text, /PRIVATE INVITATION/);
    assert.match(text, /Kojo & Fafa/);
    assert.match(text, /invite you to celebrate with them/);
    assert.doesNotMatch(text, /Aurelia|Seraphine|ama@|0246|guest_/i);
  });

  it("does not show a guest greeting on a general invitation card", () => {
    const tree = SocialPlaceCardMarkup({
      variant: "aurelia",
      title: "Enock & Ruth",
      phrase: "Join us for this special celebration.",
    });
    const text = collectText(tree);
    assert.match(text, /YOU'RE INVITED|YOU&apos;RE INVITED/);
    assert.doesNotMatch(text, /Dear /);
    assert.doesNotMatch(text, /PRIVATE INVITATION/);
  });

  it("wraps a long event title without leaking internal identifiers", () => {
    const longTitle = "Kwame Mensah & Ama Boateng Wedding Celebration With Both Families";
    const tree = SocialPlaceCardMarkup({
      variant: "aurelia",
      title: longTitle,
    });
    const text = collectText(tree);
    assert.match(text, /Kwame Mensah/);
    assert.doesNotMatch(text, /Aurelia|Seraphine/i);
  });
});

describe("Open Graph / Twitter metadata", () => {
  it("emits 1200×630 Open Graph fields and summary_large_image", () => {
    const image = decorateSocialPlaceCardImage(APP, "enock-ruth", "abc123");
    const metadata = buildInviteOpenGraphMetadata({
      title: "Enock & Ruth · You're invited",
      description: "Enock & Ruth invite you to celebrate with them — tap to open your invitation.",
      canonicalUrl: `${APP}/invite/enock-ruth`,
      image,
      imageAlt: "Enock & Ruth",
    });
    assert.equal((metadata.openGraph as { type?: string } | undefined)?.type, "website");
    assert.equal(metadata.openGraph?.siteName, "Celeventic");
    assert.equal(metadata.openGraph?.url, `${APP}/invite/enock-ruth`);
    const ogImage = Array.isArray(metadata.openGraph?.images)
      ? metadata.openGraph?.images[0]
      : metadata.openGraph?.images;
    assert.ok(ogImage && typeof ogImage === "object");
    assert.equal((ogImage as { width?: number }).width, 1200);
    assert.equal((ogImage as { height?: number }).height, 630);
    assert.equal((ogImage as { type?: string }).type, "image/png");
    assert.equal((metadata.twitter as { card?: string } | undefined)?.card, "summary_large_image");
    assert.equal(metadata.alternates?.canonical, `${APP}/invite/enock-ruth`);
  });

  it("handles expired invitations with a safe title and noindex", () => {
    assert.equal(EXPIRED_INVITE_METADATA.title, "Invitation");
    assert.equal(
      typeof EXPIRED_INVITE_METADATA.robots === "object" &&
        EXPIRED_INVITE_METADATA.robots &&
        "index" in EXPIRED_INVITE_METADATA.robots
        ? EXPIRED_INVITE_METADATA.robots.index
        : true,
      false
    );
  });
});
