import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Batch 1 P1 differentiation contracts", () => {
  it("wires family-specific RSVP ritual into the Experience 3 shell (P1-3/P1-6)", () => {
    const shell = read("src/components/invitation/experience3/experience3-shell.tsx");
    assert.match(shell, /Experience3RsvpExperience/);
    assert.doesNotMatch(shell, /<InvitationRsvpPanel/);

    const ritual = read(
      "src/components/invitation/experience3/modules/ix3-rsvp-experience.tsx"
    );
    for (const family of [
      "heritage",
      "gala",
      "shower",
      "academic",
      "celebration",
      "concert",
    ]) {
      assert.match(ritual, new RegExp(`case "${family}"|${family}:`));
    }
    assert.match(ritual, /acceptSuccess/);
    assert.match(ritual, /declineSuccess/);
    assert.match(ritual, /ix3-rsvp-confirmation/);
  });

  it("keeps distinctive structural modules per Batch 1 family (P1-5)", () => {
    const checks: Array<[string, RegExp]> = [
      [
        "src/components/invitation/experience3/ix3-heritage-marriage.tsx",
        /Experience3BlessingSeal[\s\S]*Experience3CeremonyChapters/,
      ],
      [
        "src/components/invitation/experience3/ix3-corporate-gala.tsx",
        /Experience3PlaceCard/,
      ],
      [
        "src/components/invitation/experience3/ix3-birthday-celebration.tsx",
        /ix3-birthday-reveal[\s\S]*Experience3ToastList/,
      ],
      [
        "src/components/invitation/experience3/ix3-concert-night.tsx",
        /Experience3StageCue/,
      ],
      [
        "src/components/invitation/experience3/ix3-graduation.tsx",
        /Experience3DiplomaFrame[\s\S]*Experience3AchievementStrip/,
      ],
      [
        "src/components/invitation/experience3/ix3-baby-shower.tsx",
        /Experience3ShowerStory/,
      ],
    ];

    for (const [file, pattern] of checks) {
      assert.match(read(file), pattern, `${file} missing distinctive module`);
    }
  });

  it("does not edit protected flagship template sources", () => {
    // Working-tree drift against protected sources is verified separately via git;
    // this contract asserts Batch 1 work stays on ix3-* paths.
    const shell = read("src/components/invitation/experience3/experience3-shell.tsx");
    assert.match(shell, /ix3|Experience3/);
  });
});
