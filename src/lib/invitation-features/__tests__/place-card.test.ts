import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlaceCardViewModel,
  deriveGuestPlaceCardMonogram,
  formatAllowanceCopy,
  formatPlaceCardMonogram,
  inferRecipientType,
  PLACE_CARD_DEFAULTS,
  PLACE_CARD_PRESETS,
  resolvePlaceCardConfig,
  resolvePlaceCardGuestName,
  resolveRecipientLine,
  shouldShowPlaceCard,
  type PlaceCardConfig,
  type PlaceCardPartyState,
} from "../place-card";
import { INVITATION_FEATURE_DEFAULTS, resolveAllFeatureStates } from "../registry";
import { defaultFeatureAdapter, getTemplateFeatureAdapter } from "../adapters";
import type { InvitationDesignConfig } from "@/types/invitation-design";

const config = (patch: Partial<PlaceCardConfig> = {}): PlaceCardConfig => ({
  ...PLACE_CARD_DEFAULTS,
  ...patch,
});

const party = (patch: Partial<PlaceCardPartyState> = {}): PlaceCardPartyState => ({
  allowance: 1,
  ...patch,
});

const recipient = (patch: Record<string, unknown> = {}) => ({
  invitationName: "The Mensah Family",
  guestName: "Ama Mensah",
  groupName: null,
  partySize: 3,
  assigned: true,
  ...patch,
});

/* ── badge initials ───────────────────────────────────────────────────── */

test("personalized place-card initials use the guest first and last names", () => {
  assert.equal(deriveGuestPlaceCardMonogram("Mabel Wiah"), "M | W");
  assert.equal(deriveGuestPlaceCardMonogram("Jeffery Owuraku Afari"), "J | A");
});

test("guest initials ignore honorifics and support single names", () => {
  assert.equal(deriveGuestPlaceCardMonogram("Mr Joshua Obuah"), "J | O");
  assert.equal(deriveGuestPlaceCardMonogram("Regina"), "R");
});

test("the event seal remains available as the non-personalized fallback", () => {
  assert.equal(formatPlaceCardMonogram("CJ"), "C | J");
});

test("the QR pass recipient wins over unrelated event guests", () => {
  assert.equal(
    resolvePlaceCardGuestName({
      passDisplayName: "Mabel Wiah",
      guestNames: ["Mother of Groom", "Mabel Wiah", "Ivan Cronze", "Bright Kweku Darko"],
    }),
    "Mabel Wiah"
  );
});

test("multiple event guests are never joined into one place-card recipient", () => {
  assert.equal(
    resolvePlaceCardGuestName({
      guestNames: ["Mabel Wiah", "Ivan Cronze", "Bright Kweku Darko"],
    }),
    null
  );
});

test("a sole guest remains the safe fallback when no token or pass name exists", () => {
  assert.equal(resolvePlaceCardGuestName({ guestNames: ["Mabel Wiah"] }), "Mabel Wiah");
});

/* ── config resolution ─────────────────────────────────────────────────── */

test("an invitation with no place card config still resolves to safe defaults", () => {
  const resolved = resolvePlaceCardConfig(null);
  assert.deepEqual(resolved, PLACE_CARD_DEFAULTS);
});

test("sparse organiser overrides merge onto defaults without dropping fields", () => {
  const resolved = resolvePlaceCardConfig({ heading: "Reserved for you", theme: "elegant" });
  assert.equal(resolved.heading, "Reserved for you");
  assert.equal(resolved.theme, "elegant");
  assert.equal(resolved.salutation, PLACE_CARD_DEFAULTS.salutation);
  assert.equal(resolved.allowanceDisplayWording, PLACE_CARD_DEFAULTS.allowanceDisplayWording);
});

test("unknown enum values fall back rather than reaching the renderer", () => {
  const resolved = resolvePlaceCardConfig({
    theme: "neon",
    frameStyle: "wobbly",
    animation: "explode",
    visibility: "sometimes",
    recipientDisplay: "vibes",
  });
  assert.equal(resolved.theme, PLACE_CARD_DEFAULTS.theme);
  assert.equal(resolved.frameStyle, PLACE_CARD_DEFAULTS.frameStyle);
  assert.equal(resolved.animation, PLACE_CARD_DEFAULTS.animation);
  assert.equal(resolved.visibility, PLACE_CARD_DEFAULTS.visibility);
  assert.equal(resolved.recipientDisplay, PLACE_CARD_DEFAULTS.recipientDisplay);
});

test("a preset is applied and can still be overridden field by field", () => {
  const resolved = resolvePlaceCardConfig({ preset: "reserved_table", heading: "Our head table" });
  assert.equal(resolved.recipientType, PLACE_CARD_PRESETS.reserved_table.recipientType);
  assert.equal(resolved.heading, "Our head table");
  assert.equal(resolved.preset, "reserved_table");
});

/* ── visibility ────────────────────────────────────────────────────────── */

test("the default visibility keeps the card off unpersonalised share links", () => {
  assert.equal(shouldShowPlaceCard(config(), true, false), false);
  assert.equal(shouldShowPlaceCard(config(), true, true), true);
});

test("visibility 'always' shows the card even before a guest is assigned", () => {
  assert.equal(shouldShowPlaceCard(config({ visibility: "always" }), true, false), true);
});

test("a disabled feature or a disabled card always wins over visibility", () => {
  assert.equal(shouldShowPlaceCard(config({ visibility: "always" }), false, true), false);
  assert.equal(shouldShowPlaceCard(config({ enabled: false }), true, true), false);
});

/* ── capacity copy (personalized, never a raw headcount) ───────────────── */

test("unassigned invitations leave capacity blank", () => {
  assert.equal(formatAllowanceCopy("", 19), "");
  assert.equal(formatAllowanceCopy("", 1, { assigned: false }), "");
});

test("single-guest capacity addresses the invited guest only", () => {
  assert.equal(
    formatAllowanceCopy("", 1, { assigned: true }),
    "This invitation admits only you."
  );
  assert.equal(
    formatAllowanceCopy(PLACE_CARD_DEFAULTS.allowanceDisplayWording, 1, {
      assigned: true,
    }),
    "This invitation admits only you."
  );
});

test("plus-ones are stated as companions, never as a raw guest total", () => {
  assert.equal(
    formatAllowanceCopy("This invitation admits {n} guests", 2, { assigned: true }),
    "This invitation admits you and 1 guest."
  );
  assert.equal(
    formatAllowanceCopy("", 3, { assigned: true }),
    "This invitation admits you and 2 guests."
  );
});

test("organiser templates cannot override the guest-facing capacity line", () => {
  assert.equal(
    formatAllowanceCopy("This table seats {n} guests", 8, { assigned: true }),
    "This invitation admits you and 7 guests."
  );
});

/* ── recipient resolution ──────────────────────────────────────────────── */

test("recipient display modes name the guest, the group, or both", () => {
  const input = recipient({ guestName: "Ama Mensah", groupName: "The Mensah Family" });
  assert.equal(resolveRecipientLine(config({ recipientDisplay: "name" }), input), "Ama Mensah");
  assert.equal(
    resolveRecipientLine(config({ recipientDisplay: "group" }), input),
    "The Mensah Family"
  );
  assert.equal(
    resolveRecipientLine(config({ recipientDisplay: "both" }), input),
    "Ama Mensah · The Mensah Family"
  );
});

test("ceremony titles never appear as the place-card recipient", () => {
  const line = resolveRecipientLine(
    config({ recipientDisplay: "name" }),
    recipient({
      guestName: null,
      invitationName: "TRADITIONAL MARRIAGE CEREMONY",
      groupName: null,
    })
  );
  assert.equal(line, "Dear invited guest");
});

test("unassigned invitations always address Dear invited guest", () => {
  const line = resolveRecipientLine(
    config({ recipientDisplay: "name" }),
    recipient({
      guestName: "",
      invitationName: "",
      groupName: null,
      assigned: false,
    })
  );
  assert.equal(line, "Dear invited guest");
});

test("named guests win over invitation labels", () => {
  const line = resolveRecipientLine(
    config({ recipientDisplay: "name" }),
    recipient({
      guestName: "Kwame Asante",
      invitationName: "TRADITIONAL MARRIAGE CEREMONY",
    })
  );
  assert.equal(line, "Kwame Asante");
});

test("ceremony-titled guest rows still fall back to Dear invited guest", () => {
  const line = resolveRecipientLine(
    config({ recipientDisplay: "name" }),
    recipient({
      guestName: "TRADITIONAL MARRIAGE CEREMONY",
      invitationName: "TRADITIONAL MARRIAGE CEREMONY",
      assigned: true,
    })
  );
  assert.equal(line, "Dear invited guest");
});

test("default greeting hides the duplicate Dear salutation", () => {
  const model = buildPlaceCardViewModel(
    config(),
    recipient({
      guestName: null,
      invitationName: "TRADITIONAL MARRIAGE CEREMONY",
      assigned: false,
    }),
    party({ allowance: 1 })
  );
  assert.equal(model.salutation, "");
  assert.equal(model.recipientLine, "Dear invited guest");
});

test("assigned guests keep Dear above their name", () => {
  const model = buildPlaceCardViewModel(
    config(),
    recipient({ guestName: "Ama Mensah" }),
    party({ allowance: 1 })
  );
  assert.equal(model.salutation, "Dear");
  assert.equal(model.recipientLine, "Ama Mensah");
});

test("a group name identical to the guest name is not printed twice", () => {
  const line = resolveRecipientLine(
    config({ recipientDisplay: "both" }),
    recipient({ guestName: "Ama Mensah", groupName: "ama mensah" })
  );
  assert.equal(line, "Ama Mensah");
});

test("recipient type is inferred across the supported party shapes", () => {
  assert.equal(inferRecipientType(1), "individual");
  assert.equal(inferRecipientType(2), "couple");
  assert.equal(inferRecipientType(2, { plusOnes: 1 }), "plus_one");
  assert.equal(inferRecipientType(4), "family");
  assert.equal(inferRecipientType(9), "household");
  assert.equal(inferRecipientType(3, { hasGroupName: true }), "custom");
});

/* ── view model ────────────────────────────────────────────────────────── */

test("the view model binds config, recipient and live capacity together", () => {
  const model = buildPlaceCardViewModel(
    config({ heading: "A place is reserved for you" }),
    recipient(),
    party({ allowance: 3 })
  );

  assert.equal(model.heading, "A place is reserved for you");
  assert.equal(model.recipientLine, "Ama Mensah");
  assert.equal(model.allowanceCopy, "This invitation admits you and 2 guests.");
  assert.equal(model.isGroup, true);
  assert.equal("arrivalCopy" in model, false, "guest place cards must not expose arrival copy");
});

test("single-guest view models keep the exclusive capacity line", () => {
  const model = buildPlaceCardViewModel(config(), recipient({ partySize: 1 }), party({ allowance: 1 }));
  assert.equal(model.allowanceCopy, "This invitation admits only you.");
  assert.equal(model.isGroup, false);
});

test("unassigned view models leave capacity blank", () => {
  const model = buildPlaceCardViewModel(
    config(),
    recipient({ assigned: false, guestName: null }),
    party({ allowance: 19 })
  );
  assert.equal(model.allowanceCopy, "");
});

test("a blank monogram stays blank until the seal or organiser sets one", () => {
  const model = buildPlaceCardViewModel(
    config(),
    recipient({ guestName: "Ama Mensah" }),
    party({ allowance: 2 })
  );
  assert.equal(model.monogram, "");
});

test("couple seal monograms keep the pipe display form", () => {
  const model = buildPlaceCardViewModel(
    config({ monogram: "C | J" }),
    recipient({ guestName: "Thomas Mensah" }),
    party({ allowance: 1 })
  );
  assert.equal(model.monogram, "C | J");
});

test("compact couple initials expand to the pipe seal form", () => {
  const model = buildPlaceCardViewModel(
    config({ monogram: "CJ" }),
    recipient({ guestName: "Thomas Mensah" }),
    party({ allowance: 1 })
  );
  assert.equal(model.monogram, "C | J");
});

test("an already-published invitation reflects a changed allowance without arrivals", () => {
  const before = buildPlaceCardViewModel(config(), recipient(), party({ allowance: 3 }));
  const after = buildPlaceCardViewModel(config(), recipient(), party({ allowance: 4 }));

  assert.equal(before.allowanceCopy, "This invitation admits you and 2 guests.");
  assert.equal(after.allowanceCopy, "This invitation admits you and 3 guests.");
});

/* ── shared feature layer + template adapters ──────────────────────────── */

test("the place card is a registered shared feature that renders before the entry pass", () => {
  const def = INVITATION_FEATURE_DEFAULTS.PLACE_CARD;
  assert.ok(def, "PLACE_CARD must be in the shared feature registry");
  assert.equal(def.postAdmissionOnly, false);
  assert.ok(
    def.defaultOrder < INVITATION_FEATURE_DEFAULTS.ENTRY_PASS.defaultOrder,
    "the place card must order ahead of the Guest Entry Pass"
  );
  assert.equal(def.entitlementKey, undefined, "place cards must not need QR admission");
});

test("the place card resolves through the same inheritance chain as every other feature", () => {
  const resolved = resolveAllFeatureStates({}, { PLACE_CARD: { enabled: false } });
  const card = resolved.find((f) => f.key === "PLACE_CARD");
  assert.equal(card?.enabled, false);
  assert.equal(card?.source, "invitation");
});

test("every template resolves place card theming, including unknown future layouts", () => {
  const design = {
    layout: "some-template-that-does-not-exist-yet",
    colors: {
      primary: "#3A2A2E",
      secondary: "#C7A35A",
      accent: "#D99A93",
      background: "#FBF6EF",
      text: "#3A2A2E",
    },
  } as unknown as InvitationDesignConfig;

  const adapter = getTemplateFeatureAdapter(design.layout);
  assert.equal(adapter, defaultFeatureAdapter, "unknown layouts must fall back, never throw");

  const tokens = adapter.themeTokens(design);
  assert.equal(tokens.primary, "#3A2A2E");
  assert.equal(tokens.background, "#FBF6EF");
  assert.ok(tokens.fontHeading.length > 0);
  assert.ok(tokens.border.startsWith("#"));
});

test("a template with its own adapter still inherits its own palette", () => {
  const design = {
    layout: "forever-afaris-wedding",
    colors: {
      primary: "#1A1408",
      secondary: "#D4A63A",
      accent: "#E8C8C4",
      background: "#FBF8F1",
      text: "#6B5B39",
    },
  } as unknown as InvitationDesignConfig;

  const tokens = getTemplateFeatureAdapter(design.layout).themeTokens(design);
  assert.equal(tokens.primary, "#1A1408");
  assert.equal(tokens.motion, "full");
  assert.equal(tokens.radius, "1.25rem");
});
