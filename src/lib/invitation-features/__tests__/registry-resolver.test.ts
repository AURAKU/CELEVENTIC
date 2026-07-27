import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INVITATION_FEATURE_DEFAULTS,
  ALL_GUEST_FEATURE_KEYS,
  resolveFeatureState,
  resolveAllFeatureStates,
} from "../registry";
import { combineFeatureStates } from "@/services/invitation-features/feature-resolver";

test("inheritance: invitation override wins over event over default", () => {
  const def = INVITATION_FEATURE_DEFAULTS.EVENT_MENU; // enabledByDefault: false
  // default
  assert.equal(resolveFeatureState(def, undefined, null).enabled, false);
  assert.equal(resolveFeatureState(def, undefined, null).source, "default");
  // event enables
  assert.equal(resolveFeatureState(def, true, null).enabled, true);
  assert.equal(resolveFeatureState(def, true, null).source, "event");
  // invitation override disables even when event enables
  const r = resolveFeatureState(def, true, { enabled: false });
  assert.equal(r.enabled, false);
  assert.equal(r.source, "invitation");
});

test("order override + sorting", () => {
  const states = resolveAllFeatureStates({}, { RSVP: { order: 999 } });
  // RSVP pushed to the end
  assert.equal(states.at(-1)?.key, "RSVP");
  // default order otherwise ascending
  const plain = resolveAllFeatureStates({});
  for (let i = 1; i < plain.length; i++) {
    assert.ok(plain[i].order >= plain[i - 1].order);
  }
});

test("defaults reproduce today's behaviour (RSVP/countdown/seating/help on; menu/gift off)", () => {
  const s = Object.fromEntries(resolveAllFeatureStates({}).map((f) => [f.key, f.enabled]));
  assert.equal(s.RSVP, true);
  assert.equal(s.COUNTDOWN, true);
  assert.equal(s.SEATING_REVEAL, true);
  assert.equal(s.GUEST_HELP, true);
  assert.equal(s.MEMORY_VAULT, true);
  assert.equal(s.EVENT_MENU, false);
  assert.equal(s.GIFT_WALLET, false);
  assert.equal(s.POST_ADMISSION_PORTAL, false);
});

test("every key has a default descriptor", () => {
  for (const k of ALL_GUEST_FEATURE_KEYS) {
    assert.ok(INVITATION_FEATURE_DEFAULTS[k], `missing default for ${k}`);
    assert.equal(INVITATION_FEATURE_DEFAULTS[k].key, k);
  }
});

test("combineFeatureStates: post-admission portal driven by invitation flag", () => {
  const off = combineFeatureStates({ postAdmissionEnabled: false, featureConfig: null }, []);
  assert.equal(off.find((f) => f.key === "POST_ADMISSION_PORTAL")?.enabled, false);
  const on = combineFeatureStates({ postAdmissionEnabled: true, featureConfig: null }, []);
  assert.equal(on.find((f) => f.key === "POST_ADMISSION_PORTAL")?.enabled, true);
});

test("combineFeatureStates: event entitlement row maps to guest feature", () => {
  // MENU entitlement enabled at event → EVENT_MENU guest feature on
  const rows = [{ featureKey: "MENU", isEnabled: true }];
  const states = combineFeatureStates({ postAdmissionEnabled: false, featureConfig: null }, rows);
  assert.equal(states.find((f) => f.key === "EVENT_MENU")?.enabled, true);
  assert.equal(states.find((f) => f.key === "EVENT_MENU")?.source, "event");
});

test("combineFeatureStates: invitation featureConfig override applies", () => {
  const states = combineFeatureStates(
    { postAdmissionEnabled: false, featureConfig: { GIFT_WALLET: { enabled: true, order: 5 } } },
    []
  );
  const gift = states.find((f) => f.key === "GIFT_WALLET");
  assert.equal(gift?.enabled, true);
  assert.equal(gift?.order, 5);
  assert.equal(gift?.source, "invitation");
});
