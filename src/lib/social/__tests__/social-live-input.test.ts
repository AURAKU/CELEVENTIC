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
});
