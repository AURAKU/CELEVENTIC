import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  activationEventAllowsWrite,
  canAdvanceActivationStep,
  celeCardOwnerStartPath,
  celeYouStudioBypassPath,
  celeYouWelcomeActions,
  defaultCeleYouOnboardingDraft,
  hasPublishedOnboardingCard,
  ownerNeedsFirstCardActivation,
  pickFirstOnboardingCard,
  resumeActivationStep,
  sanitizeActivationEventMeta,
  shouldCreateOnboardingCard,
} from "@/lib/digital-business-card/activation";
import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";
import { CELEYOU_PRODUCT_EVENTS } from "@/lib/celeyou-growth/product-metrics";
import { SMARTCARD_BRAND_TAGLINE } from "@/lib/digital-business-card/product";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou first-card activation", () => {
  it("defaults the unpublished first card to the original Elegant Frost plate", () => {
    const draft = defaultCeleYouOnboardingDraft();
    assert.equal(draft.themeId, CELEYOU_ORIGINAL_THEME_ID);
    assert.equal(draft.themeId, "elegant-frost");
    assert.equal(draft.step, "username");
    const lib = source("src/lib/digital-business-card/activation.ts");
    const service = source("src/services/digital-business-card/activation.service.ts");
    const wizard = source("src/components/digital-business-card/celeyou-first-card-onboarding.tsx");
    assert.match(lib, /CELEYOU_ORIGINAL_THEME_ID/);
    assert.match(service, /isPublished: false/);
    assert.match(service, /CELEYOU_ORIGINAL_THEME_ID/);
    assert.match(wizard, /Original CeleYou plate/);
    assert.match(wizard, /Elegant Frost/);
    assert.equal(SMARTCARD_BRAND_TAGLINE, "One Identity. Infinite Connections.");
  });

  it("reuses the oldest retained card instead of minting a second identity", () => {
    const cards = [
      { id: "newer", isPublished: false, createdAt: "2026-11-14T12:00:00.000Z" },
      { id: "older", isPublished: false, createdAt: "2026-11-14T08:00:00.000Z" },
      { id: "gone", isPublished: false, createdAt: "2026-11-01T00:00:00.000Z", deletedAt: "2026-11-02T00:00:00.000Z" },
    ];
    assert.equal(shouldCreateOnboardingCard(cards), false);
    assert.equal(pickFirstOnboardingCard(cards)?.id, "older");
    assert.equal(shouldCreateOnboardingCard([]), true);
    assert.equal(pickFirstOnboardingCard([]), null);
  });

  it("sends unpublished owners through start and leaves published owners in studio", () => {
    const unpublished = [{ id: "draft", isPublished: false }];
    const published = [{ id: "live", isPublished: true }];
    assert.equal(ownerNeedsFirstCardActivation(unpublished), true);
    assert.equal(ownerNeedsFirstCardActivation(published), false);
    assert.equal(hasPublishedOnboardingCard(published), true);
    assert.equal(celeCardOwnerStartPath(), "/dashboard/business-card/start");
    assert.equal(celeCardOwnerStartPath("yearly", "elegant-frost"), "/dashboard/business-card/start?plan=yearly&theme=elegant-frost");
    assert.equal(celeYouStudioBypassPath("card_1"), "/dashboard/business-card?studio=1&card=card_1");
    const signup = source("src/app/auth/onboarding/page.tsx");
    const service = source("src/services/workspace/onboarding.service.ts");
    const studio = source("src/components/digital-business-card/digital-card-studio-client.tsx");
    assert.match(signup, /smartCardStartPath/);
    assert.match(service, /celeCardOwnerStartPath/);
    assert.match(studio, /ownerNeedsFirstCardActivation/);
    assert.match(studio, /studio"\) !== "1"/);
  });

  it("requires a unique username and a display name, and allows duplicate display names", () => {
    assert.equal(canAdvanceActivationStep("username", { username: "kojo", displayName: "" }), true);
    assert.equal(canAdvanceActivationStep("username", { username: "ab", displayName: "Kojo" }), false);
    assert.equal(canAdvanceActivationStep("profile", { username: "kojo", displayName: "A" }), false);
    assert.equal(canAdvanceActivationStep("profile", { username: "kojo", displayName: "Kojo Mensah" }), true);
    assert.equal(canAdvanceActivationStep("photo", { username: "kojo", displayName: "" }), true);
    const username = source("src/lib/digital-business-card/username.ts");
    assert.match(username, /Display names stay free-form and may repeat/);
    assert.equal(
      resumeActivationStep({ published: true, needsUsername: true }),
      "welcome"
    );
    assert.equal(
      resumeActivationStep({ published: false, needsUsername: true }),
      "username"
    );
  });

  it("stores only step ids for onboarding events, never reach or identity fields", () => {
    assert.deepEqual(
      sanitizeActivationEventMeta({
        step: "reach",
        email: "secret@example.com",
        phone: "+233240000000",
        username: "kojo.mensah",
      }),
      { step: "reach" }
    );
    assert.deepEqual(sanitizeActivationEventMeta({ step: "not-a-step", email: "x" }), {});
    assert.equal(activationEventAllowsWrite("OnboardingStepViewed", { step: "photo" }), true);
    assert.equal(activationEventAllowsWrite("OnboardingAbandoned", { step: "welcome" }), false);
    assert.equal(activationEventAllowsWrite("OnboardingCompleted", {}), true);
    assert.equal(activationEventAllowsWrite("ViewCount", { step: "preview" }), false);
    const route = source("src/app/api/digital-business-cards/activation/route.ts");
    const events = source("src/services/digital-business-card/activation.service.ts");
    assert.match(route, /action === "event"/);
    assert.match(events, /sanitizeActivationEventMeta/);
    assert.match(events, /kind: "FirstShare"/);
    assert.equal(CELEYOU_PRODUCT_EVENTS.onboarding_abandoned.not.includes("Field values"), true);
    assert.equal(CELEYOU_PRODUCT_EVENTS.first_successful_share.once, "card");
  });

  it("shows welcome actions that already exist, gated by live share and NFC", () => {
    const live = celeYouWelcomeActions({
      cardId: "card_1",
      profilePath: "/u/owuraku.afari",
      published: true,
      guestShareable: true,
      nfcEnabled: true,
      analyticsAvailable: true,
    });
    assert.deepEqual(
      live.map((item) => item.id),
      ["view", "share", "qr", "contact", "edit", "nfc", "analytics"]
    );
    assert.equal(live.find((item) => item.id === "view")?.href, "/u/owuraku.afari");
    assert.match(live.find((item) => item.id === "nfc")?.href || "", /\/dashboard\/business-card\/nfc/);
    const unpublished = celeYouWelcomeActions({
      cardId: "card_1",
      profilePath: "/u/owuraku.afari",
      published: false,
      guestShareable: false,
      nfcEnabled: false,
      analyticsAvailable: false,
    });
    assert.deepEqual(
      unpublished.map((item) => item.id),
      ["edit"]
    );
  });

  it("keeps QR and NFC destinations on /c and /n tokens", () => {
    const qr = source("src/app/c/[token]/page.tsx");
    const nfc = source("src/app/n/[token]/page.tsx");
    const share = source("src/lib/digital-business-card/share-identity.ts");
    const wizard = source("src/components/digital-business-card/celeyou-first-card-onboarding.tsx");
    assert.match(qr, /\/c\/\{publicToken\}/);
    assert.match(nfc, /resolveNfcDeviceTap/);
    assert.match(share, /celeYouCameraScanUrl/);
    assert.match(share, /celeYouNfcScanUrl/);
    assert.match(wizard, /celeYouCameraScanUrl/);
    assert.match(wizard, /digitalCardVcardPath/);
    assert.doesNotMatch(wizard, /\/c\/demo|ama-serwaa/);
  });

  it("does not deploy and ships a start route plus welcome desk", () => {
    const page = source("src/app/dashboard/business-card/start/page.tsx");
    const welcome = source("src/components/digital-business-card/celeyou-welcome-desk.tsx");
    const labels = source("src/lib/digital-business-card/activation.ts");
    const create = source("src/app/api/digital-business-cards/route.ts");
    assert.match(page, /CeleYouFirstCardOnboarding/);
    assert.match(welcome, /action.label/);
    assert.match(welcome, /Your CeleYou is live/);
    assert.match(labels, /View My Card/);
    assert.match(labels, /Share My Card/);
    assert.match(labels, /Download QR/);
    assert.match(labels, /Save Contact/);
    assert.match(labels, /Edit Card/);
    assert.match(labels, /Connect NFC Card/);
    assert.match(labels, /View Analytics/);
    assert.match(create, /createDigitalCard/);
    assert.doesNotMatch(create, /ensureFirstOnboardingCard/);
  });
});
