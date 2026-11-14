import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { designAfterThemeChange } from "@/lib/digital-business-card/design";
import {
  designChangeTouchesIdentity,
  designConfigFromCard,
  identityFromCard,
  parseDesignConfig,
} from "@/lib/digital-business-card/design-vault";
import {
  CELEYOU_TEMPLATE_COLLECTIONS,
  CELEYOU_TEMPLATE_PAGE_SIZE,
  themesForCollection,
} from "@/lib/digital-business-card/template-collections";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  readCeleYouStudioDraft,
  studioDraftMayServerAutosave,
  writeCeleYouStudioDraft,
} from "@/lib/digital-business-card/studio-draft";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou advanced studio", () => {
  it("keeps paper always and finish tokens when switching looks", () => {
    const previous = {
      lettering: "neon" as const,
      accent: "gold" as const,
      faceLead: "code" as const,
      paperUrl: "/uploads/celecard-papers/x.webp",
      paperTone: "dark" as const,
      paperWeight: "rich" as const,
      composition: "grid" as const,
      atmosphere: "spotlight" as const,
      qrFinish: "stamp" as const,
    };
    const gold = resolveDigitalCardTheme("gold-folio");
    const current = resolveDigitalCardTheme("elegant-frost");
    const kept = designAfterThemeChange(previous, gold, true, current);
    assert.equal(kept.paperUrl, previous.paperUrl);
    assert.equal(kept.lettering, "neon");
    assert.equal(kept.accent, "gold");
    assert.equal(kept.faceLead, "code");
    assert.equal(kept.composition, "grid");
    const reset = designAfterThemeChange(previous, gold, false, current);
    assert.equal(reset.paperUrl, previous.paperUrl);
    assert.equal(reset.lettering, undefined);
    assert.equal(reset.composition, gold.composition);
    assert.equal(reset.atmosphere, gold.atmosphere ?? "none");
  });

  it("keeps the original classic layout when a card has no design tokens", () => {
    const original = resolveDigitalCardTheme("elegant-frost");
    const pulse = resolveDigitalCardTheme("creator-pulse");
    const kept = designAfterThemeChange({}, pulse, true, original);
    assert.equal(kept.composition, original.composition);
    assert.equal(kept.atmosphere, original.atmosphere);
    assert.notEqual(kept.composition, pulse.composition);
    assert.equal("displayName" in kept, false);
    assert.equal("avatarUrl" in kept, false);
    const reset = designAfterThemeChange({}, pulse, false, original);
    assert.equal(reset.composition, pulse.composition);
    assert.equal(reset.atmosphere, pulse.atmosphere ?? "none");
  });

  it("strips identity fields if they appear on a design object", () => {
    const original = resolveDigitalCardTheme("elegant-frost");
    const gold = resolveDigitalCardTheme("gold-folio");
    const kept = designAfterThemeChange(
      {
        composition: "classic",
        displayName: "Kojo Mensah",
        avatarUrl: "/uploads/x.webp",
        company: "Northline",
      } as never,
      gold,
      true,
      original
    );
    assert.equal(kept.composition, "classic");
    assert.equal("displayName" in kept, false);
    assert.equal("avatarUrl" in kept, false);
    assert.equal("company" in kept, false);
  });

  it("does not treat look restore as an identity change", () => {
    const card = {
      displayName: "Ama Serwaa",
      title: "Director",
      company: "Folio",
      bio: "Studio",
      email: "ama@folio.test",
      phone: "+233240000000",
      website: "https://folio.test",
      avatarUrl: "/uploads/celecard-avatars/a.webp",
      socials: {
        instagram: "ama",
        emails: ["ama@folio.test"],
        design: { lettering: "neon", faceLead: "code" },
      },
    };
    const before = identityFromCard(card);
    const after = identityFromCard({
      ...card,
      socials: {
        instagram: "ama",
        emails: ["ama@folio.test"],
        design: { lettering: "script", faceLead: "name", accent: "copper" },
        portraitFrame: "arch",
      },
    });
    assert.equal(designChangeTouchesIdentity(before, after), false);
    const renamed = identityFromCard({ ...card, displayName: "Ama S." });
    assert.equal(designChangeTouchesIdentity(before, renamed), true);
  });

  it("stores the full design in the vault config and restores without contacts", () => {
    const config = designConfigFromCard({
      themeId: "gold-folio",
      socials: {
        instagram: "ama",
        design: { lettering: "credit", faceLead: "code", paperUrl: "/uploads/celecard-papers/x.webp" },
        portraitFrame: "arch",
      },
    });
    assert.equal(config.design?.lettering, "credit");
    assert.equal(config.design?.faceLead, "code");
    assert.equal(config.portraitFrame, "arch");
    assert.equal(config.qrPlacement, "leading");
    const parsed = parseDesignConfig(config, "elegant-frost");
    assert.equal(parsed.themeId, "gold-folio");
    assert.equal(parsed.design?.paperUrl, "/uploads/celecard-papers/x.webp");
    const vault = source("src/services/digital-business-card/design-vault.service.ts");
    assert.match(vault, /themeId: theme\.id/);
    assert.match(vault, /publishedDesignVersionId: source\.id/);
    assert.match(vault, /socials,/);
    assert.doesNotMatch(vault, /displayName:/);
    assert.doesNotMatch(vault, /email:/);
    assert.doesNotMatch(vault, /isPublished:/);
  });

  it("pages industry shelves over existing themes without new IDs", () => {
    const ids = CELEYOU_TEMPLATE_COLLECTIONS.map((item) => item.id);
    assert.deepEqual(ids, [
      "personal",
      "professional",
      "corporate",
      "entrepreneur",
      "creator",
      "automotive",
      "real-estate",
      "hospitality",
      "events",
    ]);
    assert.equal(CELEYOU_TEMPLATE_PAGE_SIZE, 12);
    const personal = themesForCollection("personal");
    assert.ok(personal.length > 0);
    assert.ok(personal.every((theme) => theme.category === "personal" || theme.category === "minimal"));
    assert.equal(themesForCollection("all").length, themesForCollection(null).length);
    const picker = source("src/components/digital-business-card/digital-card-theme-picker.tsx");
    assert.match(picker, /CELEYOU_TEMPLATE_COLLECTIONS/);
    assert.match(picker, /Load more looks/);
    assert.match(picker, /CELEYOU_TEMPLATE_PAGE_SIZE/);
  });

  it("never autosaves isPublished for a live card", () => {
    assert.equal(studioDraftMayServerAutosave(true), false);
    assert.equal(studioDraftMayServerAutosave(false), true);
    const client = source("src/components/digital-business-card/digital-card-studio-client.tsx");
    assert.match(client, /studioPayloadFromForm\(nextForm, false\)/);
    assert.match(client, /studioPayloadFromForm\(form, true\)/);
    assert.match(client, /studioDraftMayServerAutosave\(publishedOnServer\)/);
    assert.match(client, /designAfterThemeChange/);
    assert.match(client, /DigitalCardStudioPreview/);
    assert.match(client, /Publish changes/);
    assert.match(client, /beforeunload/);
  });

  it("round-trips a local studio draft without publishing", () => {
    const memory = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    };
    writeCeleYouStudioDraft("card_1", { displayName: "Ama", isPublished: true }, true);
    const draft = readCeleYouStudioDraft<{ displayName: string; isPublished: boolean }>("card_1");
    assert.equal(draft?.cardId, "card_1");
    assert.equal(draft?.value.displayName, "Ama");
    assert.equal(studioDraftMayServerAutosave(draft?.published === true), false);
    delete (globalThis as { window?: unknown }).window;
  });

  it("keeps live device previews and real reach drag in the studio shell", () => {
    const preview = source("src/components/digital-business-card/digital-card-studio-preview.tsx");
    assert.match(preview, /Phone/);
    assert.match(preview, /Tablet/);
    assert.match(preview, /Desktop/);
    assert.match(preview, /Portrait/);
    assert.match(preview, /Guest page/);
    assert.match(preview, /There is no reverse face/);
    const order = source("src/components/digital-business-card/digital-card-reach-order.tsx");
    assert.match(order, /draggable/);
    assert.match(order, /onDrop/);
    const css = source("src/app/globals.css");
    assert.match(css, /max-height: min\(48vh, 26rem\)/);
    const desk = source("src/components/digital-business-card/digital-card-design-desk.tsx");
    assert.match(desk, /keepFinish/);
    assert.match(desk, /Keep my current layout, lettering, colors, and QR lead/);
    assert.match(desk, /Restore this look/);
    assert.match(desk, /Looks are optional/);
    assert.match(desk, /The live card does not change until you save/);
    const picker = source("src/components/digital-business-card/digital-card-theme-picker.tsx");
    assert.match(picker, /Looks are optional/);
    assert.match(picker, /do not replace the CeleYou logo/);
  });

  it("does not gate looks behind a new entitlement and keeps the image crop pipeline", () => {
    const picker = source("src/components/digital-business-card/digital-card-theme-picker.tsx");
    assert.doesNotMatch(picker, /entitlement/);
    assert.doesNotMatch(picker, /premiumLocked/);
    const cropper = source("src/components/media/image-upload-cropper.tsx");
    assert.match(cropper, /image\/avif/);
    const avatar = source("src/app/api/digital-business-cards/avatar/route.ts");
    assert.match(avatar, /AVIF/);
    assert.match(avatar, /Unauthorized/);
    const privacy = source("src/lib/digital-business-card/__tests__/privacy.test.ts");
    assert.match(privacy, /withholds protected destinations from guests until a grant/);
  });
});
