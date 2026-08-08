import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getThankYouTemplate,
  resolveThankYouTemplateId,
  templateToResolvedDesign,
  THANK_YOU_TEMPLATES,
} from "../templates";
import {
  isGuestbookOpen,
  orderedEnabledSections,
  parseGuestbookConfig,
  parseSectionConfig,
  resolveThankYouDesign,
} from "../resolve-design";
import { getThankYouFontPairing, resolvePairingStacks } from "../font-pairings";
import { getThankYouCopyPreset } from "../copy-presets";
import { DEFAULT_SECTION_CONFIG } from "../types";
import {
  resolveWishCapabilities,
  viewerCanDeleteWish,
  viewerCanEditWish,
} from "@/lib/invitation/guest-wish-permissions";

describe("thank you premium templates", () => {
  it("preserves legacy template ids via aliases", () => {
    assert.equal(resolveThankYouTemplateId("luxury-wedding"), "eternal-ivory");
    assert.equal(resolveThankYouTemplateId("funeral-appreciation"), "dignified-remembrance");
    assert.equal(resolveThankYouTemplateId("corporate"), "corporate-minimal");
    const legacy = getThankYouTemplate("minimal-white-gold");
    assert.equal(legacy.id, "eternal-ivory");
    assert.ok(legacy.design.fontPairingId);
  });

  it("exposes full visual systems for every premium template", () => {
    for (const template of THANK_YOU_TEMPLATES) {
      const resolved = templateToResolvedDesign(template);
      assert.ok(resolved.displayFontStack.includes("var(--font-") || resolved.displayFontStack.length > 5);
      assert.ok(resolved.bodyFontStack.length > 5);
      assert.ok(resolved.accentColor.startsWith("#"));
      assert.ok(resolved.backgroundColor.startsWith("#"));
    }
  });

  it("falls back safely for unknown template ids", () => {
    const template = getThankYouTemplate("does-not-exist");
    assert.equal(template.id, THANK_YOU_TEMPLATES[0]!.id);
  });
});

describe("thank you design resolution", () => {
  it("inherits invitation colours and fonts when themeSource is INVITATION", () => {
    const design = resolveThankYouDesign({
      templateId: "eternal-ivory",
      themeSource: "INVITATION",
      invitation: {
        primaryColor: "#123456",
        accentColor: "#AABBCC",
        backgroundColor: "#FEFEFE",
        textColor: "#111111",
        displayFont: "playfair",
        bodyFont: "jost",
      },
    });
    assert.equal(design.themeSource, "INVITATION");
    assert.equal(design.accentColor, "#AABBCC");
    assert.equal(design.backgroundColor, "#FEFEFE");
    assert.ok(
      design.displayFontStack.toLowerCase().includes("playfair") ||
        design.displayFontStack.includes("--font-playfair")
    );
  });

  it("does not crash when invitation colours are non-hex", () => {
    const design = resolveThankYouDesign({
      templateId: "eternal-ivory",
      themeSource: "INVITATION",
      invitation: {
        backgroundColor: "linear-gradient(90deg, red, blue)",
        accentColor: "tomato",
        textColor: "",
      },
    });
    assert.ok(design.backgroundColor);
    assert.equal(typeof design.isLight, "boolean");
  });

  it("orderedEnabledSections tolerates missing section config", () => {
    assert.ok(orderedEnabledSections(null).length > 0);
    assert.ok(orderedEnabledSections(undefined).length > 0);
    assert.ok(orderedEnabledSections({ sections: [] }).length > 0);
  });

  it("uses preset design when themeSource is PRESET", () => {
    const design = resolveThankYouDesign({
      templateId: "royal-evening",
      themeSource: "PRESET",
    });
    assert.equal(design.themeSource, "PRESET");
    assert.equal(design.templateId, "royal-evening");
  });

  it("parses section enable/disable and ordering", () => {
    const config = parseSectionConfig({
      sections: [
        { id: "guestMessages", enabled: true, order: 2 },
        { id: "hero", enabled: false, order: 1 },
      ],
    });
    const enabled = orderedEnabledSections(config);
    assert.equal(enabled[0]?.id, "guestMessages");
    assert.ok(config.sections.some((section) => section.id === "closingSignature"));
    assert.equal(DEFAULT_SECTION_CONFIG.sections.length >= 7, true);
  });

  it("closes guestbook after closedAt", () => {
    const open = parseGuestbookConfig({ enabled: true, closedAt: null });
    assert.equal(isGuestbookOpen(open), true);
    const closed = parseGuestbookConfig({
      enabled: true,
      closedAt: new Date(Date.now() - 60_000).toISOString(),
    });
    assert.equal(isGuestbookOpen(closed), false);
  });
});

describe("thank you font pairings", () => {
  it("resolves curated pairings to invitation font stacks", () => {
    const pairing = getThankYouFontPairing("marcellus-jost");
    const stacks = resolvePairingStacks(pairing);
    assert.ok(stacks.displayFontStack.includes("marcellus") || stacks.displayFontStack.includes("Marcellus"));
    assert.ok(stacks.bodyFontStack.includes("jost") || stacks.bodyFontStack.includes("Jost"));
    assert.ok(pairing.bodySizePx >= 16);
    assert.ok(pairing.bodyLineHeight >= 1.55);
  });
});

describe("thank you copy presets", () => {
  it("provides dignified funeral copy without festive framing", () => {
    const funeral = getThankYouCopyPreset("FUNERAL");
    assert.match(funeral.title, /Appreciation|Sincere/i);
    assert.ok(!/party|celebrate with joy/i.test(funeral.message));
  });
});

describe("thank you guest ownership capabilities", () => {
  it("keeps invitation guestbook moderator-only by default", () => {
    assert.deepEqual(
      resolveWishCapabilities({ isModerator: false, hasValidAuthorToken: true }),
      { canAdd: true, canDelete: false, canEdit: false }
    );
  });

  it("allows thank-you authors to manage their own message with a token", () => {
    assert.deepEqual(
      resolveWishCapabilities({
        isModerator: false,
        hasValidAuthorToken: true,
        allowAuthorSelfManage: true,
      }),
      { canAdd: true, canDelete: true, canEdit: true }
    );
    assert.equal(
      viewerCanDeleteWish({
        canModerate: false,
        ownedToken: "tok",
        allowAuthorSelfManage: true,
      }),
      true
    );
    assert.equal(
      viewerCanEditWish(false, { ownedToken: "tok", allowAuthorSelfManage: true }),
      true
    );
    assert.equal(
      viewerCanEditWish(false, { ownedToken: null, allowAuthorSelfManage: true }),
      false
    );
  });
});
