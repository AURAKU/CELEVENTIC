import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FEMMORA_CATALOG_SLUG,
  FEMMORA_HOUSE_DEFAULTS,
  FEMMORA_SHARE_PLACECARD,
  FEMMORA_SHARE_PLACECARD_HEIGHT,
  FEMMORA_SHARE_PLACECARD_WIDTH,
  LUXURY_FASHION_LAYOUT_SLUG,
  MAISON_VALE_HOUSE,
} from "@/lib/experience/luxury-fashion";
import {
  FEMMORA_SHARE_PLACECARD_TYPE,
  resolveAureliaShareOgImageForInvitation,
  resolveFashionShareOgImageForInvitation,
  resolveInvitationShareOgImage,
  resolvePlatformShareOgImageForInvitation,
  shareOgImageToOpenGraph,
} from "../share-image";

const APP = "https://www.celeventic.com";
const LOCAL = "http://127.0.0.1:3000";

describe("resolveFashionShareOgImageForInvitation", () => {
  it("uses the Femmora physical card photo for the Femmora SKU", () => {
    const image = resolveFashionShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: FEMMORA_CATALOG_SLUG,
      layoutSlug: LUXURY_FASHION_LAYOUT_SLUG,
      fashionHouse: FEMMORA_HOUSE_DEFAULTS,
    });
    assert.ok(image);
    assert.equal(image?.url, `${APP}${FEMMORA_SHARE_PLACECARD}`);
    assert.equal(image?.width, FEMMORA_SHARE_PLACECARD_WIDTH);
    assert.equal(image?.height, FEMMORA_SHARE_PLACECARD_HEIGHT);
    assert.equal(image?.type, FEMMORA_SHARE_PLACECARD_TYPE);
    const og = shareOgImageToOpenGraph(image!, "Soft Opening");
    assert.equal(og.type, "image/jpeg");
    assert.equal(og.width, 1600);
    assert.equal(og.height, 1234);
  });

  it("still resolves the Femmora card when stored house predates shareOgImageUrl", () => {
    const { shareOgImageUrl: _dropped, ...legacyHouse } = FEMMORA_HOUSE_DEFAULTS;
    const image = resolveFashionShareOgImageForInvitation({
      appUrl: LOCAL,
      catalogSlug: FEMMORA_CATALOG_SLUG,
      layoutSlug: LUXURY_FASHION_LAYOUT_SLUG,
      fashionHouse: legacyHouse,
    });
    assert.equal(image?.url, `${LOCAL}${FEMMORA_SHARE_PLACECARD}`);
  });

  it("keeps a Studio replacement instead of the Femmora default", () => {
    const image = resolveFashionShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: FEMMORA_CATALOG_SLUG,
      fashionHouse: { ...FEMMORA_HOUSE_DEFAULTS, shareOgImageUrl: "https://cdn.example.com/custom.jpg" },
    });
    assert.equal(image?.url, "https://cdn.example.com/custom.jpg");
    assert.equal(image?.width, undefined);
  });

  it("does not attach the Femmora card to Maison Vale", () => {
    const image = resolveFashionShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: LUXURY_FASHION_LAYOUT_SLUG,
      layoutSlug: LUXURY_FASHION_LAYOUT_SLUG,
      fashionHouse: MAISON_VALE_HOUSE,
    });
    assert.equal(image, null);
  });

  it("does not attach the Femmora card to a generic fashion house", () => {
    const image = resolveFashionShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: LUXURY_FASHION_LAYOUT_SLUG,
      layoutSlug: LUXURY_FASHION_LAYOUT_SLUG,
      fashionHouse: undefined,
    });
    assert.equal(image, null);
  });
});

describe("resolveAureliaShareOgImageForInvitation", () => {
  it("uses the generated 1200×630 social place card for a published Aurelia invite", () => {
    const image = resolveAureliaShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "aurelia-editorial-wedding",
      layoutSlug: "aurelia-editorial-wedding",
      uniqueLink: "enock-ruth",
      versionParts: ["/templates/aurelia/hero.jpg", "Enock & Ruth"],
      heroImageUrl: "/templates/aurelia/hero.jpg",
    });
    assert.ok(image);
    assert.match(image?.url ?? "", /\/api\/social\/invite\/enock-ruth\/image\?v=/);
    assert.equal(image?.width, 1200);
    assert.equal(image?.height, 630);
    assert.equal(image?.type, "image/png");
    const og = shareOgImageToOpenGraph(image!, "Enock & Ruth");
    assert.equal(og.width, 1200);
    assert.equal(og.height, 630);
    assert.doesNotMatch(og.alt ?? "", /Aurelia/i);
  });

  it("uses the generated social place card for a published Seraphine invite", () => {
    const image = resolveAureliaShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      uniqueLink: "kojo-fafa",
      heroImageUrl: "/templates/seraphine/hero.jpg",
    });
    assert.ok(image);
    assert.match(image?.url ?? "", /\/api\/social\/invite\/kojo-fafa\/image\?v=/);
    assert.notEqual(image?.url, `${APP}/templates/aurelia/hero.jpg`);
    assert.equal(image?.width, 1200);
    assert.equal(image?.height, 630);
  });

  it("falls back to the couple hero photograph when no guest link is available", () => {
    const image = resolveAureliaShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "aurelia-editorial-wedding",
      layoutSlug: "aurelia-editorial-wedding",
    });
    assert.ok(image);
    assert.equal(image?.url, `${APP}/templates/aurelia/hero.jpg`);
    assert.equal(image?.width, 731);
    assert.equal(image?.height, 1024);
    assert.equal(image?.type, "image/jpeg");
  });

  it("uses a Studio replacement hero when no guest link is available", () => {
    const image = resolveAureliaShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "aurelia-editorial-wedding",
      mediaHeroUrl: "https://cdn.example.com/custom-hero.jpg",
    });
    assert.equal(image?.url, "https://cdn.example.com/custom-hero.jpg");
    assert.equal(image?.width, undefined);
  });

  it("does not attach the Aurelia hero to unrelated layouts", () => {
    const image = resolveAureliaShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "forever-afaris-wedding",
      layoutSlug: "forever-afaris-wedding",
    });
    assert.equal(image, null);
  });

  it("uses the Seraphine atmosphere instead of the Aurelia couple photograph without a guest link", () => {
    const image = resolveAureliaShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
    });
    assert.ok(image);
    assert.equal(image?.url, `${APP}/templates/seraphine/hero.jpg`);
    assert.notEqual(image?.url, `${APP}/templates/aurelia/hero.jpg`);
  });
});

describe("resolvePlatformShareOgImageForInvitation", () => {
  it("generates a 1200×630 card for any published catalogue invitation", async () => {
    const generated = resolvePlatformShareOgImageForInvitation({
      appUrl: APP,
      catalogSlug: "forever-afaris-wedding",
      uniqueLink: "akosua-yaw",
      versionParts: ["hero-v1"],
    });
    assert.ok(generated);
    assert.match(generated?.url ?? "", /\/api\/social\/invite\/akosua-yaw\/image\?v=/);
    assert.equal(generated?.width, 1200);
    assert.equal(generated?.height, 630);

    const birthday = await resolveInvitationShareOgImage({
      eventId: "evt_1",
      appUrl: APP,
      catalogSlug: "gold-glam-milestone",
      uniqueLink: "ama-30",
    });
    assert.match(birthday.url, /\/api\/social\/invite\/ama-30\/image\?v=/);
    assert.equal(birthday.width, 1200);
  });
});
