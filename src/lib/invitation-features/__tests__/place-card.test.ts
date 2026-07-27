import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlaceCardViewModel,
  formatAllowanceCopy,
  inferRecipientType,
  PLACE_CARD_DEFAULTS,
  PLACE_CARD_PRESETS,
  resolveArrivalCopy,
  resolvePlaceCardConfig,
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
  admittedCount: 0,
  remainingCount: 1,
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

/* ── allowance copy ────────────────────────────────────────────────────── */

test("the allowance line is bold, uppercase, and carries the real party size", () => {
  assert.equal(
    formatAllowanceCopy("This invitation admits {n} guests", 3),
    "THIS INVITATION ADMITS 3 GUESTS"
  );
});

test("custom allowance wording is honoured for reserved tables", () => {
  assert.equal(formatAllowanceCopy("This table seats {n} guests", 8), "THIS TABLE SEATS 8 GUESTS");
});

test("a blank allowance template falls back to the platform default", () => {
  assert.equal(formatAllowanceCopy("", 2), "THIS INVITATION ADMITS 2 GUESTS");
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

/* ── arrival copy (guest-facing partial status) ────────────────────────── */

test("a party that has not arrived yet is told nothing about arrivals", () => {
  assert.equal(resolveArrivalCopy(party({ allowance: 3, admittedCount: 0 })), null);
});

test("a part-arrived party reads its position in plain words, not status codes", () => {
  const copy = resolveArrivalCopy(party({ allowance: 3, admittedCount: 2, remainingCount: 1 }));
  assert.equal(copy, "2 of your 3 guests have arrived · 1 still welcome");
  assert.ok(copy && !/PARTIAL/i.test(copy), "guest copy must not leak admission jargon");
});

test("a fully arrived party is told everyone is in", () => {
  assert.equal(
    resolveArrivalCopy(party({ allowance: 3, admittedCount: 3, remainingCount: 0 })),
    "All 3 of your guests have arrived."
  );
});

test("a single guest never sees group arrival copy", () => {
  assert.equal(resolveArrivalCopy(party({ allowance: 1, admittedCount: 1 })), null);
});

/* ── view model ────────────────────────────────────────────────────────── */

test("the view model binds config, recipient and live allowance together", () => {
  const model = buildPlaceCardViewModel(
    config({ heading: "A place is reserved for you" }),
    recipient(),
    party({ allowance: 3, admittedCount: 0, remainingCount: 3 })
  );

  assert.equal(model.heading, "A place is reserved for you");
  assert.equal(model.recipientLine, "Ama Mensah");
  assert.equal(model.allowanceCopy, "THIS INVITATION ADMITS 3 GUESTS");
  assert.equal(model.isGroup, true);
  assert.equal(model.arrivalCopy, null);
});

test("a monogram is derived from the recipient when the organiser left it blank", () => {
  const model = buildPlaceCardViewModel(
    config(),
    recipient({ guestName: "Ama Mensah" }),
    party({ allowance: 2 })
  );
  assert.equal(model.monogram, "AM");
});

test("an already-published invitation reflects a changed allowance and arrivals", () => {
  const before = buildPlaceCardViewModel(
    config(),
    recipient(),
    party({ allowance: 3, admittedCount: 0, remainingCount: 3 })
  );
  const after = buildPlaceCardViewModel(
    config(),
    recipient(),
    party({ allowance: 4, admittedCount: 2, remainingCount: 2 })
  );

  assert.equal(before.allowanceCopy, "THIS INVITATION ADMITS 3 GUESTS");
  assert.equal(after.allowanceCopy, "THIS INVITATION ADMITS 4 GUESTS");
  assert.equal(after.arrivalCopy, "2 of your 4 guests have arrived · 2 still welcome");
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
