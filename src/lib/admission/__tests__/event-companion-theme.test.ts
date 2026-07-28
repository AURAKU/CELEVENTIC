import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  companionFontStyles,
  resolveCompanionTheme,
} from "@/lib/admission/event-companion-theme";

describe("event companion theme", () => {
  it("blends invitation colors and fonts into companion tokens", () => {
    const theme = resolveCompanionTheme({
      designConfig: {
        layout: "classic-gold",
        colors: {
          primary: "#1a1a1a",
          secondary: "#B89E67",
          accent: "#D4AF37",
          background: "#FFFEFA",
          text: "#333333",
        },
        fonts: { heading: "Playfair Display", script: "Great Vibes", body: "Cormorant Garamond" },
      },
      template: { slug: "classic-gold", config: { layout: "classic-gold" } },
      eventCoverImageUrl: "https://cdn.example.com/cover.jpg",
    });

    assert.equal(theme.colors.secondary, "#B89E67");
    assert.equal(theme.backgroundImageUrl, "https://cdn.example.com/cover.jpg");
    assert.match(companionFontStyles(theme.fonts).heading, /Playfair Display/);
    assert.ok(theme.accentWash.startsWith("rgba("));
  });

  it("falls back safely when design is missing", () => {
    const theme = resolveCompanionTheme({
      designConfig: null,
      template: null,
    });
    assert.ok(theme.colors.background);
    assert.ok(theme.fonts.heading);
  });
});
