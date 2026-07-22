/**
 * Phase 2 Experience Engine — pure-function unit tests (node:test).
 * Run: npm run test:experience-engine
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeActionKey,
  validateExperienceAction,
  getActionLabel,
  ACTION_ALIASES,
} from "../action-registry";
import {
  getMotionLanguageProfile,
  motionLanguageToThemeProfile,
  listMotionLanguageIds,
  CORE_MOTION_LANGUAGES,
} from "../motion-language-profiles";
import {
  getRevealContract,
  getRevealContractForOpening,
  revealMechanicFromOpening,
  listRevealMechanics,
} from "../interactive-reveal-contract";
import {
  isPreviewInvitationId,
  resolvePreviewMode,
  shouldSuppressGuestSideEffect,
} from "../preview-mode";
import {
  shouldShowSoftIntro,
  resolveInitialInvitePhase,
  phaseAfterSoftIntro,
  softIntroHoldMs,
  SOFT_INTRO_DURATION_MS,
  SOFT_INTRO_REDUCED_MOTION_MS,
} from "../soft-intro";
import {
  parseSceneArchitecture,
  buildExperienceSequence,
} from "../experience-sequence";
import {
  adaptLegacyRevealMode,
  adaptLegacyActionLabel,
  adaptSceneTransition,
  adaptThemeMotionToLanguage,
} from "../legacy-adapters";
import { buildInvitationExperienceConfig } from "../build-invitation-experience";
import {
  createRevealSession,
  markRevealComplete,
  resetRevealForReplay,
  isRevealComplete,
} from "../reveal-runtime";
import { listTemplateCreativeProfiles } from "@/lib/invitation/template-creative-registry";
import { createAudioDirector } from "../audio-director";

describe("action-registry", () => {
  it("canonicalizes Phase 2 aliases", () => {
    assert.equal(canonicalizeActionKey("ADD_TO_CALENDAR"), "SAVE_DATE");
    assert.equal(canonicalizeActionKey("FIND_SEAT"), "SEATING");
    assert.equal(canonicalizeActionKey("TICKET"), "QR_PASS");
    assert.equal(canonicalizeActionKey("rsvp"), "RSVP");
    assert.equal(canonicalizeActionKey("unknown-xyz"), null);
  });

  it("exposes alias map for ADD_TO_CALENDAR / FIND_SEAT / TICKET", () => {
    assert.equal(ACTION_ALIASES.ADD_TO_CALENDAR, "SAVE_DATE");
    assert.equal(ACTION_ALIASES.FIND_SEAT, "SEATING");
    assert.equal(ACTION_ALIASES.TICKET, "QR_PASS");
  });

  it("validates RSVP preview suppression", () => {
    const result = validateExperienceAction("RSVP", {
      invitationId: "preview-royal-emerald",
      isPreview: true,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.previewSuppressed, true);
    assert.equal(result.key, "RSVP");
  });

  it("blocks seating without entitlement", () => {
    const result = validateExperienceAction("FIND_SEAT", {
      invitationId: "inv_live_1",
      entitlements: { seating: false },
    });
    assert.equal(result.allowed, false);
    assert.equal(result.key, "SEATING");
  });

  it("blocks LOCATION when required data missing", () => {
    const result = validateExperienceAction("LOCATION", {
      invitationId: "inv_live_1",
      requiredData: { LOCATION: { hasLocation: false } },
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason ?? "", /Location/i);
  });

  it("labels aliases for UI", () => {
    assert.equal(getActionLabel("ADD_TO_CALENDAR"), "Add to Calendar");
    assert.equal(getActionLabel("FIND_SEAT"), "Find Seat");
    assert.equal(getActionLabel("TICKET"), "Ticket");
  });
});

describe("motion-language-profiles", () => {
  it("defines the ten core languages plus registry extras", () => {
    const ids = listMotionLanguageIds();
    for (const required of CORE_MOTION_LANGUAGES) {
      assert.ok(ids.includes(required), `missing ${required}`);
      const profile = getMotionLanguageProfile(required);
      assert.ok(profile.durationMs > 0);
      assert.ok(profile.staggerMs >= 0);
      assert.ok(profile.themeProfileId);
      assert.ok(profile.media.durationMs > 0);
      assert.ok(profile.button.durationMs > 0);
      assert.ok(profile.outro.durationMs > 0);
      assert.ok(typeof profile.camera.intensity === "number");
    }
  });

  it("maps solemn language to solemn theme profile", () => {
    assert.equal(motionLanguageToThemeProfile("solemn"), "solemn");
    assert.equal(motionLanguageToThemeProfile("cinematic"), "layered-drift");
    assert.equal(motionLanguageToThemeProfile("minimal"), "still");
  });
});

describe("interactive-reveal-contract", () => {
  it("covers required mechanics", () => {
    const mechanics = listRevealMechanics();
    for (const m of [
      "envelope",
      "wax-seal",
      "scratch",
      "swipe",
      "curtain",
      "ribbon",
      "gate",
      "card-flip",
      "paper-unfold",
      "tap-to-bloom",
      "press-hold",
      "peel",
      "photo-develop",
    ] as const) {
      assert.ok(mechanics.includes(m), `missing mechanic ${m}`);
      const c = getRevealContract(m);
      assert.equal(c.supportsKeyboardFallback, true);
      assert.equal(c.supportsReducedMotion, true);
    }
  });

  it("maps opening experiences to mechanics", () => {
    assert.equal(revealMechanicFromOpening("wax-seal-gold"), "wax-seal");
    assert.equal(revealMechanicFromOpening("letter-unfold"), "paper-unfold");
    assert.equal(revealMechanicFromOpening("flower-bloom"), "tap-to-bloom");
    assert.equal(revealMechanicFromOpening("press-hold"), "press-hold");
    assert.equal(revealMechanicFromOpening("pop-reveal"), "pop");
    assert.equal(getRevealContractForOpening("scratch").mechanic, "scratch");
    assert.equal(getRevealContract("press-hold").openingExperience, "press-hold");
  });
});

describe("preview-mode", () => {
  it("detects strengthened preview ids", () => {
    assert.equal(isPreviewInvitationId("preview-abc"), true);
    assert.equal(isPreviewInvitationId("demo-wedding"), true);
    assert.equal(isPreviewInvitationId("catalog-royal"), true);
    assert.equal(isPreviewInvitationId("thumb-1"), true);
    assert.equal(isPreviewInvitationId("inv_live_real"), false);
  });

  it("suppresses side effects in studio surface", () => {
    const mode = resolvePreviewMode({ surface: "studio" });
    assert.equal(mode.isPreview, true);
    assert.equal(mode.suppressRsvpSubmit, true);
    assert.equal(shouldSuppressGuestSideEffect("preview-x", "rsvp"), true);
    assert.equal(shouldSuppressGuestSideEffect("inv_live", "analytics"), false);
  });
});

describe("experience-sequence", () => {
  it("parses scene architecture arrows", () => {
    const scenes = parseSceneArchitecture("Cover → Couple → RSVP → Gold outro");
    assert.equal(scenes.length, 4);
    assert.equal(scenes[0].sectionId, "invitation");
    assert.ok(scenes.some((s) => s.sectionId === "rsvp"));
  });

  it("builds a default sequence", () => {
    const seq = buildExperienceSequence(null, "curtain");
    assert.equal(seq.transition, "curtain");
    assert.ok(seq.scenes.length >= 3);
  });
});

describe("legacy-adapters", () => {
  it("maps legacy reveal modes and action labels", () => {
    assert.equal(adaptLegacyRevealMode("scratch"), "scratch");
    assert.equal(adaptLegacyActionLabel("Add to Calendar"), "SAVE_DATE");
    assert.equal(adaptLegacyActionLabel("Find Seat"), "SEATING");
    assert.equal(adaptSceneTransition("sparkle"), "sparkle");
    assert.equal(adaptSceneTransition("unknown"), "fade");
    assert.equal(adaptThemeMotionToLanguage("solemn"), "solemn");
  });
});

describe("buildInvitationExperienceConfig", () => {
  it("builds a usable config for classic layout without catalog slug", () => {
    const cfg = buildInvitationExperienceConfig({
      layoutSlug: "classic-gold",
      invitationId: "preview-test",
      previewMode: true,
    });
    assert.equal(cfg.flags.isPreview, true);
    assert.equal(cfg.flags.suppressSideEffects, true);
    assert.ok(cfg.openingExperience);
    assert.ok(cfg.sequence.scenes.length > 0);
    assert.ok(cfg.primaryActions.includes("RSVP"));
  });
});

describe("reveal-runtime", () => {
  it("tracks completion and replay", () => {
    let session = createRevealSession();
    assert.equal(isRevealComplete(session), false);
    session = markRevealComplete(session);
    assert.equal(isRevealComplete(session), true);
    session = resetRevealForReplay(session);
    assert.equal(session.state, "idle");
    assert.equal(session.replayCount, 1);
  });
});

describe("template-creative-registry brief fields", () => {
  it("exposes id/name/audioProfile/sections on every SKU", () => {
    const profiles = listTemplateCreativeProfiles();
    assert.ok(profiles.length >= 31);
    for (const p of profiles) {
      assert.equal(p.id, p.catalogSlug);
      assert.ok(p.name.length > 0);
      assert.ok(p.audioProfile.length > 0);
      assert.equal(p.audioProfile, p.defaultAudioTrack);
      assert.ok(p.supportedSections.length > 0);
      assert.ok(Array.isArray(p.optionalSections));
      assert.ok(p.creativeConcept);
      assert.ok(p.reducedMotionFallback);
      assert.ok(p.packageAccess);
    }
  });
});

describe("audio-director", () => {
  it("creates a suppressible director with scene/outro API", async () => {
    const director = createAudioDirector({ suppressPlayback: true, defaultVolume: 0.4 });
    assert.equal(await director.play(), false);
    assert.equal(await director.onSceneStart(), false);
    director.setLoop(false);
    director.onOutro({ fadeMs: 10 });
    director.destroy();
    assert.equal(director.getManager(), null);
  });
});

describe("soft-intro gate", () => {
  it("shows soft intro on live path by default", () => {
    assert.equal(shouldShowSoftIntro({}), true);
    assert.equal(resolveInitialInvitePhase({ introEnabled: true, needsTapGate: true, showReveal: true }), "soft-intro");
  });

  it("gates reveal behind soft intro then DNA intro", () => {
    const flags = { introEnabled: true, needsTapGate: true, showReveal: true };
    assert.equal(resolveInitialInvitePhase(flags), "soft-intro");
    assert.equal(phaseAfterSoftIntro(flags), "intro");
  });

  it("skips soft intro when skipIntro is set (thumbnail preview pattern)", () => {
    assert.equal(shouldShowSoftIntro({ skipIntro: true }), false);
    assert.equal(
      resolveInitialInvitePhase({ skipIntro: true, needsTapGate: false, showReveal: true }),
      "reveal"
    );
  });

  it("allows explicit skipSoftIntro override while keeping DNA intro", () => {
    assert.equal(shouldShowSoftIntro({ skipSoftIntro: true, skipIntro: false }), false);
    assert.equal(
      resolveInitialInvitePhase({ skipSoftIntro: true, skipIntro: false, introEnabled: true }),
      "intro"
    );
  });

  it("uses shortened hold for reduced motion", () => {
    assert.equal(softIntroHoldMs(false), SOFT_INTRO_DURATION_MS);
    assert.equal(softIntroHoldMs(true), SOFT_INTRO_REDUCED_MOTION_MS);
    assert.ok(SOFT_INTRO_REDUCED_MOTION_MS < SOFT_INTRO_DURATION_MS);
  });

  it("curtain path: soft-intro → reveal (no tap gate, no DNA intro)", () => {
    const flags = {
      introEnabled: false,
      needsTapGate: false,
      showReveal: true,
    };
    assert.equal(resolveInitialInvitePhase(flags), "soft-intro");
    assert.equal(phaseAfterSoftIntro(flags), "reveal");
  });
});
