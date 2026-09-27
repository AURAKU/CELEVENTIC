import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_TEMPLATES } from "@/lib/invitation-mvp/catalogue";
import { FEMMORA_CATALOG_SLUG, FEMMORA_SHARE_PLACECARD } from "@/lib/experience/luxury-fashion";
import { buildInviteSharePayload } from "@/lib/invitation/invite-share";
import { resolveSocialEventKind } from "../social-category";
import { socialCopyForKind } from "../social-copy";
import { buildSocialInvitationSurface, SOCIAL_PLACE_CARD_HEIGHT, SOCIAL_PLACE_CARD_WIDTH } from "../social-engine";
import { isInternalTemplateTitle, resolveSocialEventTitle } from "../social-event-title";
import { resolveSocialHeroImage } from "../social-hero";
import { SocialPlaceCardMarkup } from "../social-place-card-image";
import { buildInviteOpenGraphMetadata } from "../invitation-share-metadata";

const APP = "https://www.celeventic.com";

const LEAK_RE =
  /Aurelia|Seraphine Champagne|Femmora Flagship|classic-gold|luxury-rings|Peach Silk Ribbon|femmora-flagship|aurelia-editorial|seraphine-champagne|blueprint|themeId/i;

function collectText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node === "object" && node && "props" in node) {
    return collectText((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

function surfaceFor(input: Parameters<typeof buildSocialInvitationSurface>[0]) {
  return buildSocialInvitationSurface({
    appUrl: APP,
    uniqueLink: "share-link",
    versionParts: ["v1"],
    ...input,
  });
}

describe("platform Social Invitation Engine — categories", () => {
  it("builds a standard wedding card", () => {
    const surface = surfaceFor({
      uniqueLink: "enock-ruth",
      catalogSlug: "aurelia-editorial-wedding",
      eventTitle: "Enock & Ruth",
      hostName: "Enock & Ruth",
      dateDisplay: "22 October 2026",
    });
    assert.equal(surface.kind, "wedding");
    assert.equal(surface.title, "Enock & Ruth");
    assert.match(surface.phrase, /celebration/i);
    assert.equal(surface.image.width, 1200);
    assert.equal(surface.image.height, 630);
  });

  it("builds a birthday card", () => {
    const surface = surfaceFor({
      catalogSlug: "gold-glam-milestone",
      eventTitle: "Ama's 30th Birthday",
    });
    assert.equal(surface.kind, "birthday");
    assert.equal(surface.shareTitle, "Ama's 30th Birthday · You're invited");
    assert.match(surface.phrase, /birthday/i);
    assert.doesNotMatch(surface.phrase, /wedding|beautiful beginning/i);
  });

  it("builds a funeral/memorial card without celebration language", () => {
    const surface = surfaceFor({
      catalogSlug: "candlelight-farewell",
      eventTitle: "THE FUNERAL",
      deceasedName: "Nana Kwame Mensah",
    });
    assert.equal(surface.kind, "funeral");
    assert.equal(surface.title, "Nana Kwame Mensah");
    assert.match(surface.phrase, /honour|remember/i);
    assert.doesNotMatch(`${surface.phrase} ${surface.description} ${surface.shareText}`, /celebrate/i);
  });

  it("builds a corporate card", () => {
    const surface = surfaceFor({
      catalogSlug: "corporate-prestige-summit",
      eventTitle: "Acme Annual Conference 2026",
    });
    assert.equal(surface.kind, "corporate");
    assert.match(surface.phrase, /special event/i);
  });

  it("builds a conference card from event type when no conference SKU exists", () => {
    const surface = surfaceFor({
      eventType: "CONFERENCE",
      eventTitle: "West Africa Product Summit",
    });
    assert.equal(surface.kind, "conference");
    assert.match(surface.phrase, /connect, learn/i);
  });

  it("builds a concert card from event type", () => {
    const surface = surfaceFor({
      eventType: "CONCERT",
      eventTitle: "Accra Live Night",
    });
    assert.equal(surface.kind, "concert");
    assert.match(surface.phrase, /live/i);
  });

  it("builds a traditional event card from host names, not Peach Silk Ribbon", () => {
    const surface = surfaceFor({
      catalogSlug: "traditional-marriage-ceremony",
      eventTitle: "Peach Silk Ribbon",
      hostName: "Kojo & Fafa",
    });
    assert.equal(surface.kind, "wedding");
    assert.equal(surface.title, "Kojo & Fafa");
    assert.doesNotMatch(surface.title, /Peach Silk Ribbon/i);
  });

  it("builds a general invitation card with a category fallback", () => {
    const surface = surfaceFor({
      catalogSlug: "custom-media",
      eventTitle: "Your Canvas",
    });
    assert.equal(surface.kind, "private");
    assert.equal(surface.title, "Private Celebration");
    assert.match(surface.phrase, /gathering/i);
  });
});

describe("platform personalization", () => {
  it("personalizes a birthday invitation", () => {
    const surface = surfaceFor({
      catalogSlug: "gold-glam-milestone",
      eventTitle: "Ama's 30th Birthday",
      guestDisplayName: "Mr. & Mrs. Mensah",
      guestToken: "mensah-token",
    });
    assert.equal(surface.guestGreeting, "Dear Mr. & Mrs. Mensah,");
    assert.match(surface.description, /^Dear Mr\. & Mrs\. Mensah,/);
    assert.match(surface.image.url, /guest=mensah-token/);
    assert.match(surface.canonicalUrl, /guest=mensah-token/);
  });

  it("isolates Guest A and Guest B cache identities", () => {
    const a = surfaceFor({
      uniqueLink: "party",
      eventTitle: "Ama's 30th Birthday",
      catalogSlug: "gold-glam-milestone",
      guestDisplayName: "Ama",
      guestToken: "guest-a",
    });
    const b = surfaceFor({
      uniqueLink: "party",
      eventTitle: "Ama's 30th Birthday",
      catalogSlug: "gold-glam-milestone",
      guestDisplayName: "Kofi",
      guestToken: "guest-b",
    });
    assert.notEqual(a.image.url, b.image.url);
    assert.match(a.image.url, /guest=guest-a/);
    assert.match(b.image.url, /guest=guest-b/);
    assert.doesNotMatch(a.description, /Kofi/);
    assert.doesNotMatch(b.description, /Dear Ama/);
  });

  it("keeps an open/general invitation generic when no guest is supplied", () => {
    const surface = surfaceFor({
      eventTitle: "Kojo & Fafa",
      hostName: "Kojo & Fafa",
    });
    assert.equal(surface.guestGreeting, null);
    assert.doesNotMatch(surface.description, /Dear /);
    assert.doesNotMatch(surface.image.url, /guest=/);
    assert.doesNotMatch(surface.canonicalUrl, /guest=/);
  });
});

describe("public event-title resolver — catalogue identity", () => {
  it("rejects catalogue names, slugs, layout slugs, and known internals", () => {
    assert.equal(isInternalTemplateTitle("Aurelia"), true);
    assert.equal(isInternalTemplateTitle("Seraphine Champagne"), true);
    assert.equal(isInternalTemplateTitle("Femmora Flagship Opening"), true);
    assert.equal(isInternalTemplateTitle("classic-gold"), true);
    assert.equal(isInternalTemplateTitle("Peach Silk Ribbon"), true);
    assert.equal(isInternalTemplateTitle("gilded-serif"), true);
    assert.equal(isInternalTemplateTitle("wedding-core-v1"), true);
    assert.equal(isInternalTemplateTitle("Enock & Ruth"), false);
    assert.equal(isInternalTemplateTitle("Amélie's Soirée"), false);
  });

  it("uses hostName when the Event Title is a catalogue name", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "The Aurora",
      hostName: "Akosua & Yaw",
      kind: "wedding",
    });
    assert.equal(resolved.title, "Akosua & Yaw");
  });

  it("uses a funeral category fallback when no honouree is available", () => {
    const resolved = resolveSocialEventTitle({
      eventTitle: "Candlelight Elegy",
      hostName: "Aurelia",
      kind: "funeral",
    });
    assert.equal(resolved.title, "Celebration of Life");
  });
});

describe("hero and custom override", () => {
  it("uses an explicit social image override", () => {
    const hero = resolveSocialHeroImage({
      catalogSlug: "classic-gold",
      shareOgImageUrl: "https://cdn.example.com/custom-card.jpg",
      heroImageUrl: "https://cdn.example.com/other-couple.jpg",
    });
    assert.equal(hero.url, "https://cdn.example.com/custom-card.jpg");
    assert.equal(hero.source, "override");
  });

  it("does not borrow another template's couple photograph", () => {
    const hero = resolveSocialHeroImage({
      catalogSlug: "classic-gold",
      layoutSlug: "classic-gold",
    });
    assert.equal(hero.url, null);
    assert.equal(hero.source, "none");
  });

  it("consumes the Femmora physical card as hero input, not guest-facing identity", () => {
    const hero = resolveSocialHeroImage({ catalogSlug: FEMMORA_CATALOG_SLUG });
    assert.equal(hero.url, FEMMORA_SHARE_PLACECARD);
    const surface = surfaceFor({
      catalogSlug: FEMMORA_CATALOG_SLUG,
      eventTitle: "Femmora Flagship Opening",
      hostName: "Soft Opening",
    });
    assert.equal(surface.title, "Soft Opening");
    assert.doesNotMatch(`${surface.title} ${surface.shareTitle} ${surface.description}`, /Femmora Flagship/i);
  });

  it("renders a text-led card when no hero exists", () => {
    const tree = SocialPlaceCardMarkup({
      title: "Acme Annual Conference 2026",
      phrase: "You're invited to join us for this special event.",
    });
    const text = collectText(tree);
    assert.match(text, /Acme Annual Conference 2026/);
    assert.match(text, /CELEVENTIC/);
    assert.doesNotMatch(JSON.stringify(tree), /broken|undefined\.jpg/i);
  });
});

describe("privacy, OG, share, unicode, wrap", () => {
  it("never puts phone, email, IDs or QR tokens on the card", () => {
    const surface = surfaceFor({
      eventTitle: "Kojo & Fafa",
      guestDisplayName: "0246502998",
      guestToken: "ama-token",
    });
    assert.equal(surface.guestGreeting, null);
    assert.doesNotMatch(
      `${surface.title} ${surface.description} ${surface.shareText} ${surface.guestGreeting ?? ""}`,
      /0246|@|guest_|ama-token/i
    );
  });

  it("emits Open Graph and summary_large_image metadata", () => {
    const surface = surfaceFor({ eventTitle: "Kojo & Fafa", uniqueLink: "kojo-fafa" });
    const metadata = buildInviteOpenGraphMetadata({
      title: surface.shareTitle,
      description: surface.description,
      canonicalUrl: surface.canonicalUrl,
      image: surface.image,
      imageAlt: surface.imageAlt,
    });
    assert.equal(metadata.openGraph?.type, "website");
    assert.equal(metadata.openGraph?.siteName, "Celeventic");
    assert.equal(metadata.twitter?.card, "summary_large_image");
    assert.equal(metadata.alternates?.canonical, `${APP}/invite/kojo-fafa`);
  });

  it("keeps personalized native share on the guest URL", () => {
    const payload = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "kojo-fafa",
      origin: APP,
      catalogSlug: "seraphine-champagne-wedding",
      guestDisplayName: "Esther",
      guestToken: "esther-token",
      event: {
        title: "Kojo & Fafa",
        hostName: "Kojo & Fafa",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
    });
    assert.equal(payload.url, `${APP}/invite/kojo-fafa?guest=esther-token`);
    assert.match(payload.text, /Dear Esther/);
    const generic = buildInviteSharePayload({
      category: "wedding",
      uniqueLink: "kojo-fafa",
      origin: APP,
      event: {
        title: "Kojo & Fafa",
        hostName: "Kojo & Fafa",
        description: null,
        startDate: "",
        venueName: null,
        landmark: null,
        mapsLink: null,
        contactPhone: null,
        dressCode: null,
      },
    });
    assert.equal(generic.url, `${APP}/invite/kojo-fafa`);
    assert.doesNotMatch(generic.text, /Dear /);
  });

  it("truncates a long title and renders unicode names", () => {
    const long = resolveSocialEventTitle({
      eventTitle:
        "The Grand Celebration of Kwame Mensah and Ama Boateng With Both Extended Families And Friends From Accra",
    });
    assert.ok(long.title.length <= 72);
    const unicode = surfaceFor({ eventTitle: "Amélie & José" });
    assert.equal(unicode.title, "Amélie & José");
    const tree = SocialPlaceCardMarkup({ title: "Amélie & José" });
    assert.match(collectText(tree), /Amélie & José/);
  });
});

describe("catalogue coverage — every CATALOG_TEMPLATES SKU", () => {
  it("gives every registered template a valid social-preview strategy without leaking identity", () => {
    assert.ok(CATALOG_TEMPLATES.length >= 40);
    for (const template of CATALOG_TEMPLATES) {
      const kind = resolveSocialEventKind({ catalogSlug: template.slug, layoutSlug: template.layoutSlug });
      const copy = socialCopyForKind(kind);
      const surface = surfaceFor({
        uniqueLink: `sku-${template.slug}`,
        catalogSlug: template.slug,
        layoutSlug: template.layoutSlug,
        catalogCategory: template.category,
        eventTitle: template.name,
        invitationName: template.slug,
      });
      assert.equal(surface.kind, kind, template.slug);
      assert.equal(surface.image.width, SOCIAL_PLACE_CARD_WIDTH, template.slug);
      assert.equal(surface.image.height, SOCIAL_PLACE_CARD_HEIGHT, template.slug);
      assert.match(surface.image.url, /\/api\/social\/invite\//, template.slug);
      assert.equal(surface.title, copy.fallbackTitle, `${template.slug} should not use catalog name ${template.name}`);
      const blob = `${surface.title} ${surface.shareTitle} ${surface.description} ${surface.phrase} ${surface.kicker}`;
      assert.doesNotMatch(blob, new RegExp(template.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), template.slug);
      assert.doesNotMatch(blob, new RegExp(template.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), template.slug);
      if (template.blueprintId) {
        assert.doesNotMatch(blob, new RegExp(template.blueprintId, "i"), template.slug);
      }
      if (template.themeId) {
        assert.doesNotMatch(blob, new RegExp(template.themeId, "i"), template.slug);
      }
      assert.doesNotMatch(blob, LEAK_RE, template.slug);
      if (kind === "funeral") {
        assert.doesNotMatch(`${surface.phrase} ${surface.shareText}`, /celebrate/i, template.slug);
      }
    }
  });

  it("still produces a complete card for a future SKU with no social override", () => {
    const surface = surfaceFor({
      catalogSlug: "moonlit-orchid-2027",
      layoutSlug: "moonlit-orchid-2027",
      eventTitle: "Ama & Yaw",
    });
    assert.equal(surface.title, "Ama & Yaw");
    assert.equal(surface.image.width, 1200);
    assert.equal(surface.image.height, 630);
    assert.equal(surface.heroUrl, null);
    assert.doesNotMatch(`${surface.title} ${surface.description}`, /moonlit-orchid/i);
  });
});
