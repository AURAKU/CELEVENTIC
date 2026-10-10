import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CELEVENTIC_OFFICIAL_LOGO } from "../qr-constants";
import {
  extractDesignQrPhotoSources,
  isEdwinCoupleQrCenter,
  isFamilyAlbumQrCenter,
  isFamilyHeroQrCenter,
  isOfficialCeleventicQrCenter,
  isOrganizerUploadedQrCenter,
  isPinnedQrCenterAllowed,
  isStockQrCenter,
  resolveQrCenterMark,
} from "../qr-center-resolution";

describe("QR center resolution", () => {
  it("uses an uploaded hero photograph before a QR-center upload or logo", () => {
    const mark = resolveQrCenterMark({
      heroImageUrl: "/uploads/events/enock-ruth-hero.jpg",
      coverImageUrl: "/uploads/events/gallery-1.jpg",
      qrCenterImageUrl: "/uploads/events/qr-center.jpg",
    });
    assert.equal(mark.url, "/uploads/events/enock-ruth-hero.jpg");
    assert.equal(mark.source, "hero");
    assert.equal(mark.logoSize, "hero");
  });

  it("uses the event cover when hero is template stock", () => {
    const mark = resolveQrCenterMark({
      heroImageUrl: "/templates/aurelia/hero.jpg",
      coverImageUrl: "/uploads/events/couple-cover.jpg",
      galleryUrls: ["/uploads/events/couple-1.jpg"],
    });
    assert.equal(mark.url, "/uploads/events/couple-cover.jpg");
    assert.equal(mark.source, "couple");
  });

  it("ignores gallery and intro dumps — those are not the QR center", () => {
    const mark = resolveQrCenterMark({
      heroImageUrl: "/templates/aurelia/hero.jpg",
      introImageUrl: "/uploads/events/intro-kente.jpg",
      galleryUrls: ["/uploads/events/couple-1.jpg", "/uploads/events/couple-2.jpg"],
    });
    assert.equal(mark.url, CELEVENTIC_OFFICIAL_LOGO);
    assert.equal(mark.source, "logo");
  });

  it("uses an explicit organizer-uploaded QR-center photograph when hero is absent", () => {
    const mark = resolveQrCenterMark({
      heroImageUrl: "/templates/aurelia/hero.jpg",
      galleryUrls: ["/templates/seraphine/hero.jpg"],
      qrCenterImageUrl: "/uploads/events/qr-center.jpg",
    });
    assert.equal(mark.url, "/uploads/events/qr-center.jpg");
    assert.equal(mark.source, "qr-upload");
    assert.equal(mark.logoSize, "hero");
  });

  it("uses Edwin and Lordina's published portrait when that is the QR center", () => {
    const mark = resolveQrCenterMark({
      heroImageUrl: "/templates/edwin-lordina/hero-navy.jpg",
      coverImageUrl: "/templates/edwin-lordina/hero-navy.jpg",
      qrCenterImageUrl: "/templates/edwin-lordina/hero-navy.jpg",
    });
    assert.equal(mark.url, "/templates/edwin-lordina/hero-navy.jpg");
    assert.equal(mark.source, "couple");
    assert.equal(mark.logoSize, "hero");
  });

  it("falls back to the official Celeventic logo when nothing was uploaded", () => {
    const mark = resolveQrCenterMark({
      heroImageUrl: "/templates/aurelia/hero.jpg",
      coverImageUrl: "/templates/seraphine/hero.jpg",
      qrCenterImageUrl: "/templates/seraphine/monogram-qr.png",
      introImageUrl: "/templates/aurelia/hero.svg",
    });
    assert.equal(mark.url, CELEVENTIC_OFFICIAL_LOGO);
    assert.equal(mark.source, "logo");
    assert.equal(mark.logoSize, "balanced");
  });

  it("never treats template stock, brand marks, Unsplash, or WhatsApp art as a couple photo", () => {
    assert.equal(isStockQrCenter("/templates/aurelia/hero.jpg"), true);
    assert.equal(isFamilyAlbumQrCenter("/templates/aurelia/qr-center.jpg"), true);
    assert.equal(isFamilyHeroQrCenter("/templates/seraphine/hero.jpg"), true);
    assert.equal(isFamilyHeroQrCenter("/templates/aurelia/hero.jpg"), true);
    assert.equal(isFamilyHeroQrCenter("/templates/aurelia/qr-center.jpg"), false);
    assert.equal(isStockQrCenter("/templates/aurelia/qr-center.jpg"), false);
    assert.equal(isOrganizerUploadedQrCenter("/templates/aurelia/qr-center.jpg"), false);
    assert.equal(isPinnedQrCenterAllowed("/templates/aurelia/qr-center.jpg"), true);
    assert.equal(isStockQrCenter("/brand/logo-full.png"), true);
    assert.equal(isStockQrCenter("/icons/whatsapp.png"), true);
    assert.equal(isOrganizerUploadedQrCenter("/uploads/events/whatsapp-image-hero.jpg"), true);
    assert.equal(isOrganizerUploadedQrCenter("/uploads/events/hero.webp"), true);
    assert.equal(isOrganizerUploadedQrCenter("https://cdn.celeventic.com/uploads/hero.jpg"), true);
    assert.equal(isOrganizerUploadedQrCenter("/templates/aurelia/hero.jpg"), false);
    assert.equal(
      isOrganizerUploadedQrCenter(
        "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900"
      ),
      false
    );
    assert.equal(isOfficialCeleventicQrCenter("/brand/logo-full.png"), true);
    assert.equal(isPinnedQrCenterAllowed("/brand/logo-full.png"), true);
    assert.equal(isPinnedQrCenterAllowed("/uploads/events/hero.jpg"), true);
    assert.equal(isPinnedQrCenterAllowed("/templates/aurelia/hero.jpg"), true);
    assert.equal(isPinnedQrCenterAllowed("/templates/seraphine/hero.jpg"), true);
    assert.equal(isPinnedQrCenterAllowed("/templates/edwin-lordina/hero-navy.jpg"), true);
    assert.equal(isEdwinCoupleQrCenter("/templates/edwin-lordina/hero-navy.jpg"), true);
    assert.equal(isEdwinCoupleQrCenter("/templates/edwin-lordina/cover-sofa.jpg"), false);
    assert.equal(isPinnedQrCenterAllowed("/templates/seraphine/monogram-qr.png"), false);
  });

  it("reads uploaded hero from published design config and ignores stock wedding art", () => {
    const sources = extractDesignQrPhotoSources({
      media: [
        { url: "/templates/aurelia/hero.jpg", type: "image", role: "hero" },
        { url: "/uploads/events/intro.jpg", type: "image", role: "intro" },
      ],
      experience: { aureliaWedding: { heroImageUrl: "/templates/aurelia/hero.jpg" } },
    });
    assert.equal(sources.heroImageUrl, null);
    assert.equal(sources.introImageUrl, "/uploads/events/intro.jpg");
  });
});
