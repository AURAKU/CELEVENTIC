import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSocialInvitationSurface } from "../social-engine";
import { buildLiveSocialInvitationInput } from "../social-live-input";

describe("buildLiveSocialInvitationInput hero", () => {
  it("prefers an organizer-uploaded photograph over the catalogue hero", () => {
    const input = buildLiveSocialInvitationInput({
      appUrl: "https://www.celeventic.com",
      catalogSlug: "seraphine-champagne-wedding",
      layoutSlug: "seraphine-champagne-wedding",
      guestDisplayName: "Pastor Christopher Fiave",
      guestToken: "guest-token",
      includeGuestInCanonicalUrl: true,
      invitation: {
        uniqueLink: "kojo-fafa",
        name: "Kojo & Fafa",
        event: {
          title: "Seraphine Champagne",
          hostName: "Kojo & Fafa",
          eventType: "WEDDING",
          coverImageUrl: "/uploads/events/kojo-fafa-hero.jpg",
        },
      },
      liveDesign: {
        layout: "seraphine-champagne-wedding",
        media: [
          {
            type: "image",
            role: "hero",
            url: "/templates/seraphine/hero.jpg",
          },
        ],
        experience: {
          aureliaWedding: {
            heroImageUrl: "/templates/seraphine/hero.jpg",
          },
        },
      },
    });

    assert.equal(input.coverImageUrl, "/uploads/events/kojo-fafa-hero.jpg");
    assert.equal(input.mediaHeroUrl, null);

    const surface = buildSocialInvitationSurface(input);
    assert.equal(surface.heroUrl, "/uploads/events/kojo-fafa-hero.jpg");
    assert.equal(surface.guestGreeting, "Dear Pastor Christopher Fiave,");
    assert.match(surface.shareText, /You are personally invited\./);
  });

  it("uses the opening couple photograph and both wedding dates for Edwin and Lordina", () => {
    const input = buildLiveSocialInvitationInput({
      appUrl: "https://www.celeventic.com",
      catalogSlug: "forever-afaris-wedding",
      layoutSlug: "forever-afaris-wedding",
      guestDisplayName: "Ama",
      guestToken: "ama-token",
      includeGuestInCanonicalUrl: true,
      invitation: {
        uniqueLink: "ihJPaMQxfFCRK21YPJwgGvhxFzqqP7oK",
        name: "Edwin and Lordina",
        event: {
          title: "Edwin and Lordina",
          hostName: "Edwin Ebow Blankson",
          eventType: "WEDDING",
          coverImageUrl: "/templates/edwin-lordina/hero-navy.jpg",
        },
      },
      liveDesign: {
        layout: "forever-afaris-wedding",
        media: [
          {
            type: "image",
            role: "hero",
            url: "/templates/edwin-lordina/hero-navy.jpg",
          },
          {
            type: "image",
            role: "intro",
            url: "/templates/edwin-lordina/tap-begin.jpg",
          },
          {
            type: "image",
            role: "share",
            url: "/templates/edwin-lordina/moments/07-stool.jpg",
          },
        ],
        studio: {
          weddingBoard: {
            coupleName1: "Edwin Ebow Blankson",
            coupleName2: "Lordina Ewurafua Anderson",
            displayDate: "DECEMBER • 24 & 26 • 2026",
          },
        },
      },
    });

    assert.equal(input.introImageUrl, "/templates/edwin-lordina/tap-begin.jpg");
    assert.equal(input.shareImageUrl, "/templates/edwin-lordina/moments/07-stool.jpg");
    assert.equal(input.dateDisplay, "DECEMBER • 24 & 26 • 2026");
    const surface = buildSocialInvitationSurface(input);
    assert.equal(surface.heroUrl, "/templates/edwin-lordina/moments/07-stool.jpg");
    assert.deepEqual(surface.dateLines, ["24 DECEMBER 2026", "26 DECEMBER 2026"]);
    assert.equal(surface.canonicalUrl, "https://www.celeventic.com/invite/edwin-and-lordina?guest=ama-token");
    assert.equal(surface.guestGreeting, "Dear Ama,");
    assert.equal(surface.phrase, "You are personally invited.");
    assert.doesNotMatch(surface.shareText, /admission code|https?:\/\//i);
  });
});
