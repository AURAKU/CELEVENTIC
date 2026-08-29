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
  resolveFashionShareOgImageForInvitation,
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
