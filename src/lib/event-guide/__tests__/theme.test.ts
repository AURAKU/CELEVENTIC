import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assessGuideContrast,
  contrastRatio,
  parseThemeOverrides,
  relativeLuminance,
  resolveGuideTheme,
} from "../theme";
import type { GuideThemeTokens } from "../types";

// Deliberately unlike the neutral fallback, so a test that expects the
// invitation to be ignored cannot pass by coincidence.
const INVITATION = {
  designConfig: {
    layout: "royal-plum",
    colors: {
      primary: "#4a1942",
      secondary: "#b8860b",
      accent: "#6d2461",
      background: "#fdf7fb",
      text: "#241021",
    },
    fonts: { heading: "Cormorant", script: "Great Vibes", body: "Lato", eyebrow: "Cinzel" },
  },
  template: { slug: "royal-plum", config: {} },
};

function themeWith(colors: Partial<GuideThemeTokens["colors"]>): GuideThemeTokens {
  return resolveGuideTheme({
    useInvitationTheme: true,
    overrides: { colors },
    invitation: INVITATION,
  });
}

describe("inheriting the invitation theme", () => {
  it("carries the invitation's colours and fonts into the guide", () => {
    const theme = resolveGuideTheme({
      useInvitationTheme: true,
      overrides: null,
      invitation: INVITATION,
    });
    assert.equal(theme.colors.primary, "#4a1942");
    assert.equal(theme.fonts.heading, "Cormorant");
    assert.equal(theme.fonts.body, "Lato");
  });

  it("falls back to a readable neutral theme when there is no invitation", () => {
    const theme = resolveGuideTheme({
      useInvitationTheme: true,
      overrides: null,
      invitation: null,
    });
    assert.equal(assessGuideContrast(theme).passes, true, "the fallback must be readable");
  });

  it("ignores the invitation entirely when the organizer opts out", () => {
    const theme = resolveGuideTheme({
      useInvitationTheme: false,
      overrides: { colors: { background: "#ffffff" } },
      invitation: INVITATION,
    });
    assert.equal(theme.colors.background, "#ffffff");
    assert.notEqual(theme.colors.primary, "#4a1942");
  });

  it("always produces a complete font set, never an undefined slot", () => {
    const theme = resolveGuideTheme({
      useInvitationTheme: true,
      overrides: null,
      invitation: { designConfig: { colors: INVITATION.designConfig.colors }, template: null },
    });
    for (const slot of ["heading", "script", "body", "eyebrow"] as const) {
      assert.equal(typeof theme.fonts[slot], "string", slot);
      assert.ok(theme.fonts[slot].length > 0, slot);
    }
  });
});

describe("override validation", () => {
  it("accepts valid hex colours and normalises their case", () => {
    const parsed = parseThemeOverrides({ colors: { primary: "  #ABCDEF  " } });
    assert.equal(parsed.colors?.primary, "#abcdef");
  });

  it("drops colours that are not plain hex", () => {
    const parsed = parseThemeOverrides({
      colors: {
        primary: "red",
        secondary: "linear-gradient(#fff,#000)",
        accent: "rgb(1,2,3)",
        background: "#12345",
        text: "#123",
      },
    });
    assert.deepEqual(parsed.colors, { text: "#123" });
  });

  it("rejects font names that could break out of a CSS font stack", () => {
    const parsed = parseThemeOverrides({
      fonts: {
        heading: 'Inter"; background: url(evil)',
        body: "Lato, sans-serif",
        script: "Great Vibes",
      },
    });
    assert.equal(parsed.fonts?.heading, undefined);
    assert.equal(parsed.fonts?.body, undefined);
    assert.equal(parsed.fonts?.script, "Great Vibes");
  });

  it("rejects a javascript: background image", () => {
    const parsed = parseThemeOverrides({ backgroundImageUrl: "javascript:alert(1)" });
    assert.equal(parsed.backgroundImageUrl, null);
  });

  it("accepts a same-origin path and an https url for the background", () => {
    assert.equal(parseThemeOverrides({ backgroundImageUrl: "/uploads/bg.jpg" }).backgroundImageUrl, "/uploads/bg.jpg");
    assert.equal(
      parseThemeOverrides({ backgroundImageUrl: "https://cdn.example.com/bg.jpg" }).backgroundImageUrl,
      "https://cdn.example.com/bg.jpg"
    );
  });

  it("returns an empty override set for junk input", () => {
    assert.deepEqual(parseThemeOverrides(null), {});
    assert.deepEqual(parseThemeOverrides("nope"), {});
    assert.deepEqual(parseThemeOverrides({ colors: "nope", fonts: 7 }), {});
  });
});

describe("WCAG contrast maths", () => {
  it("matches the reference luminance for black and white", () => {
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("#ffffff"), 1);
  });

  it("gives 21:1 for black on white and 1:1 for a colour on itself", () => {
    assert.equal(contrastRatio("#000000", "#ffffff"), 21);
    assert.equal(contrastRatio("#3a2a2e", "#3a2a2e"), 1);
  });

  it("expands three-digit hex the same as six", () => {
    assert.equal(contrastRatio("#fff", "#000"), contrastRatio("#ffffff", "#000000"));
  });

  it("reports null for a token it cannot measure", () => {
    assert.equal(contrastRatio("linear-gradient(#fff,#000)", "#ffffff"), null);
  });
});

describe("the publish contrast gate", () => {
  it("passes a legible theme", () => {
    const result = assessGuideContrast(themeWith({}));
    assert.equal(result.passes, true);
    assert.equal(result.findings.length, 4);
  });

  it("blocks body text that is unreadable against the background", () => {
    // Pale gold text on cream — the classic wedding-stationery mistake.
    const result = assessGuideContrast(themeWith({ text: "#e8d9a8", background: "#fbf8f3" }));
    assert.equal(result.passes, false);
    const body = result.findings.find((f) => f.pair === "Body text on background");
    assert.ok(body);
    assert.equal(body.passes, false);
    assert.equal(body.required, 4.5);
    assert.ok(body.ratio < 4.5);
  });

  it("blocks a primary action nobody can read", () => {
    const result = assessGuideContrast(themeWith({ accent: "#fdfdfd", background: "#ffffff" }));
    assert.equal(result.passes, false);
    assert.ok(result.findings.some((f) => f.pair === "Primary action label" && !f.passes));
  });

  it("holds text to 4.5:1 and display/action text to 3:1", () => {
    const required = new Map(assessGuideContrast(themeWith({})).findings.map((f) => [f.pair, f.required]));
    assert.equal(required.get("Body text on background"), 4.5);
    assert.equal(required.get("Section labels on background"), 4.5);
    assert.equal(required.get("Heading on background"), 3);
    assert.equal(required.get("Primary action label"), 3);
  });

  it("does not block a decorative gold on cream — it darkens the label instead", () => {
    const theme = themeWith({ secondary: "#c7a35a", background: "#fbf8f3" });
    const result = assessGuideContrast(theme);

    assert.equal(result.passes, true, "a classic gold-on-cream palette must be publishable");
    assert.notEqual(theme.labelColor, "#c7a35a", "labels must be darkened to stay readable");
    assert.equal(theme.colors.secondary, "#c7a35a", "the decorative accent itself is untouched");
    assert.equal(result.adjustments.length, 1);
    assert.match(result.adjustments[0]!, /small labels/i);
  });

  it("says nothing about adjustments when the accent is already readable", () => {
    const result = assessGuideContrast(themeWith({ secondary: "#3d2f0a", background: "#fbf8f3" }));
    assert.deepEqual(result.adjustments, []);
  });

  it("lightens rather than darkens the label on a dark background", () => {
    const theme = themeWith({
      secondary: "#4a3c10",
      background: "#12100a",
      text: "#f5f0e6",
      primary: "#e8d9a8",
      accent: "#d9a441",
    });
    assert.equal(assessGuideContrast(theme).passes, true);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.labelColor.slice(i, i + 2), 16));
    assert.ok(r! + g! + b! > 0x4a + 0x3c + 0x10, "the label must move toward white, not black");
  });

  it("reports an unmeasurable token instead of failing a legitimate design", () => {
    const theme = themeWith({});
    const gradient: GuideThemeTokens = {
      ...theme,
      colors: { ...theme.colors, background: "linear-gradient(#fff,#eee)" },
    };
    const result = assessGuideContrast(gradient);
    assert.ok(result.unmeasured.length > 0);
    assert.ok(result.findings.every((f) => f.passes));
  });
});
