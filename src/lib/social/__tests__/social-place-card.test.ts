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
  it("selects Aurelia without treating Femmora or generic layouts as family cards", () => {
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
      null
    );
    assert.equal(
      resolveSocialPlaceCardVariant({
        catalogSlug: "forever-afaris-wedding",
        layoutSlug: "forever-afaris-wedding",
      }),
      null
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
    assert.match(surface.description, /Enock & Ruth invite you to celebrate with them/);
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
    assert.doesNotMatch(
      `${surface.title} ${surface.shareTitle} ${surface.description}`,
      /Seraphine|seraphine-champagne/i
    );
    assert.equal(surface.dateLabel, "14 NOVEMBER 2026");
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
    assert.equal(isSocialPlaceCardUnavailable({ invitationStatus: "ACTIVE", eventStatus: "PUBLISHED" }), false);
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
    assert.equal(metadata.openGraph?.type, "website");
    assert.equal(metadata.openGraph?.siteName, "Celeventic");
    assert.equal(metadata.openGraph?.url, `${APP}/invite/enock-ruth`);
    const ogImage = Array.isArray(metadata.openGraph?.images)
      ? metadata.openGraph?.images[0]
      : metadata.openGraph?.images;
    assert.ok(ogImage && typeof ogImage === "object");
    assert.equal((ogImage as { width?: number }).width, 1200);
    assert.equal((ogImage as { height?: number }).height, 630);
    assert.equal((ogImage as { type?: string }).type, "image/png");
    assert.equal(metadata.twitter?.card, "summary_large_image");
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
