import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  celeCardOwnerShareFlags,
  guestMayUsePublicAction,
  guestPayloadExposesProfile,
  isCeleCardCourtesyReachable,
  isCeleCardProductIntent,
  isCeleCardPubliclyReachable,
  ownerMayManageCard,
  publicPayloadExposesOwnerSecrets,
  toGuestPublicPayload,
  withheldGuestPayload,
} from "@/lib/digital-business-card/access";
import { courtesyPayloadExposesPrivateReach } from "@/lib/digital-business-card/courtesy";
import { DEFAULT_CELECARD_LIFECYCLE_POLICY } from "@/lib/digital-business-card/lifecycle";

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "card_owner_1",
    slug: "ama-serwaa",
    publicToken: "tok_secret_qr",
    displayName: "Ama Serwaa",
    title: "Creative Director",
    company: "Folio Maison",
    bio: "Private studio bio",
    email: "ama@secret.test",
    phone: "+233240000000",
    website: "https://folio.secret",
    socials: { instagram: "amaserwaa", momo: "0240000000" },
    themeId: "gold-folio",
    avatarUrl: "/digital-cards/demo/ama-serwaa.jpg",
    nfcEnabled: true,
    connectBackEnabled: true,
    defaultMode: "professional",
    isPublished: true,
    subscriptionStatus: "ACTIVE",
    subscriptionExpiresAt: future,
    userId: "user_owner",
    viewCount: 128,
    ...overrides,
  };
}

describe("CeleYou public access policy", () => {
  it("lets anonymous visitors open a published paid card with public actions", () => {
    const live = source();
    assert.equal(isCeleCardPubliclyReachable(live), true);
    for (const action of ["view", "save", "connect", "share", "pay"] as const) {
      assert.equal(guestMayUsePublicAction(live, action), true, action);
    }
    const payload = toGuestPublicPayload(live);
    assert.equal(payload.isLive, true);
    assert.equal(payload.email, "ama@secret.test");
    assert.equal(payload.phone, "+233240000000");
    assert.equal(payload.socials.instagram, "amaserwaa");
    assert.equal(publicPayloadExposesOwnerSecrets(payload), false);
  });

  it("withholds unpublished cards from anonymous visitors", () => {
    const unpublished = source({ isPublished: false });
    assert.equal(isCeleCardPubliclyReachable(unpublished), false);
    assert.equal(guestMayUsePublicAction(unpublished, "save"), false);
    const payload = toGuestPublicPayload(unpublished);
    assert.equal(payload.isLive, false);
    assert.equal(payload.presentationMode, "unavailable");
    assert.equal(guestPayloadExposesProfile(payload), false);
    assert.equal(payload.email, null);
    assert.equal(payload.phone, null);
    assert.equal(payload.publicToken, "");
    assert.equal(payload.displayName, "");
    assert.equal(publicPayloadExposesOwnerSecrets(payload), false);
  });

  it("lets recipients open a published trial CeleYou without installing anything", () => {
    const trial = source({ subscriptionStatus: "TRIAL", lastActivatedAt: null });
    assert.equal(isCeleCardPubliclyReachable(trial), true);
    assert.equal(guestMayUsePublicAction(trial, "save"), true);
    const flags = celeCardOwnerShareFlags(trial);
    assert.equal(flags.isLive, false);
    assert.equal(flags.guestShareable, true);
    const payload = toGuestPublicPayload(trial);
    assert.equal(payload.isLive, true);
    assert.equal(payload.presentationMode, "live");
    assert.equal(payload.email, "ama@secret.test");
    assert.equal(payload.phone, "+233240000000");
    assert.equal(payload.displayName, "Ama Serwaa");
    assert.equal(publicPayloadExposesOwnerSecrets(payload), false);
  });

  it("withholds an expired trial from anonymous visitors", () => {
    const expiredTrial = source({
      subscriptionStatus: "TRIAL",
      subscriptionExpiresAt: past,
      lastActivatedAt: null,
    });
    assert.equal(isCeleCardPubliclyReachable(expiredTrial), false);
    const payload = toGuestPublicPayload(expiredTrial);
    assert.equal(payload.presentationMode, "unavailable");
    assert.equal(payload.email, null);
    assert.equal(payload.displayName, "");
  });

  it("keeps a published paid card live during the grace window", () => {
    const graced = source({ subscriptionExpiresAt: past, lastActivatedAt: new Date(Date.now() - 40 * 86400000) });
    assert.equal(isCeleCardPubliclyReachable(graced), true);
    assert.equal(toGuestPublicPayload(graced).isLive, true);
    const zeroGrace = { ...DEFAULT_CELECARD_LIFECYCLE_POLICY, gracePeriodDays: 0 };
    assert.equal(isCeleCardPubliclyReachable(graced, zeroGrace), false);
    assert.equal(toGuestPublicPayload(graced, [], zeroGrace).presentationMode, "courtesy");
  });

  it("serves a sanitized courtesy preview after grace, never private reach", () => {
    const courtesy = source({
      subscriptionStatus: "EXPIRED",
      subscriptionExpiresAt: new Date(Date.now() - 5 * 86400000),
      lastActivatedAt: new Date(Date.now() - 40 * 86400000),
    });
    assert.equal(isCeleCardPubliclyReachable(courtesy), false);
    assert.equal(isCeleCardCourtesyReachable(courtesy), true);
    const payload = toGuestPublicPayload(courtesy);
    assert.equal(payload.isLive, false);
    assert.equal(payload.presentationMode, "courtesy");
    assert.equal(payload.displayName, "Ama Serwaa");
    assert.equal(payload.publicToken, "");
    assert.equal(payload.email, null);
    assert.equal(payload.phone, null);
    assert.equal(payload.bio, null);
    assert.equal(courtesyPayloadExposesPrivateReach(payload), false);
    assert.equal(publicPayloadExposesOwnerSecrets(payload), false);
  });

  it("does not let payment language leak from a withheld payload", () => {
    const unpublished = toGuestPublicPayload(source({ isPublished: false }));
    assert.equal(unpublished.presentationMode, "unavailable");
  });

  it("never returns owner secrets on the withheld public shape", () => {
    const withheld = withheldGuestPayload("hidden-card");
    assert.equal(publicPayloadExposesOwnerSecrets(withheld), false);
    assert.equal(guestPayloadExposesProfile(withheld), false);
  });

  it("keeps a paid deactivated card unavailable without courtesy billing copy", () => {
    const deactivated = source({ adminDeactivatedAt: new Date() });
    assert.equal(isCeleCardPubliclyReachable(deactivated), false);
    const payload = toGuestPublicPayload(deactivated);
    assert.equal(payload.presentationMode, "unavailable");
    assert.equal(payload.email, null);
    assert.equal(payload.displayName, "");
    assert.equal(publicPayloadExposesOwnerSecrets(payload), false);
  });

  it("keeps a suspended card generic and does not let a live entitlement show private reach", () => {
    const suspended = source({ adminSuspendedAt: new Date() });
    assert.equal(isCeleCardPubliclyReachable(suspended), false);
    const payload = toGuestPublicPayload(suspended);
    assert.equal(payload.presentationMode, "suspended");
    assert.equal(payload.email, null);
    assert.equal(payload.phone, null);
    assert.equal(payload.publicToken, "");
  });

  it("lets owners manage only their authorized cards", () => {
    assert.equal(ownerMayManageCard("user_owner", "user_owner"), true);
    assert.equal(ownerMayManageCard("user_owner", "user_other"), false);
    assert.equal(ownerMayManageCard("", "user_owner"), false);
  });

  it("treats CeleYou signup as a product intent on the shared account", () => {
    assert.equal(isCeleCardProductIntent("celecard"), true);
    assert.equal(isCeleCardProductIntent("smartcard"), true);
    assert.equal(isCeleCardProductIntent("host"), false);
  });

  it("keeps dummy live walkthroughs to platform admins only", async () => {
    const { roleMayOpenDummyLive } = await import("@/lib/digital-business-card/demo-live-access");
    assert.equal(roleMayOpenDummyLive("ADMIN"), true);
    assert.equal(roleMayOpenDummyLive("SUPER_ADMIN"), true);
    assert.equal(roleMayOpenDummyLive("ORGANIZER"), false);
    assert.equal(roleMayOpenDummyLive("VENDOR"), false);
    assert.equal(roleMayOpenDummyLive("GUEST"), false);
    assert.equal(roleMayOpenDummyLive(null), false);
    assert.equal(roleMayOpenDummyLive(undefined), false);
  });
});
