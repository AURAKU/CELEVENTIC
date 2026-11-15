import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_STUDIO_DESK,
  isClassicStudioMode,
  parseStudioDesk,
  readStudioDeskFromLocation,
  studioDeskFromHash,
  studioDeskShows,
  STUDIO_DESKS,
} from "@/lib/digital-business-card/studio-desk";

describe("CeleYou Studio desk routing", () => {
  it("defaults to My Card and accepts only known desks", () => {
    assert.equal(parseStudioDesk(null), DEFAULT_STUDIO_DESK);
    assert.equal(parseStudioDesk("insights"), "insights");
    assert.equal(parseStudioDesk("nope"), "card");
    assert.equal(STUDIO_DESKS.length, 6);
  });

  it("maps legacy hash anchors without treating studio=1 as classic", () => {
    assert.equal(studioDeskFromHash("#studio-activity"), "insights");
    assert.equal(studioDeskFromHash("#studio-look"), "design");
    assert.equal(studioDeskFromHash("#studio-inbox"), "audience");
    assert.equal(isClassicStudioMode(new URLSearchParams("studio=1")), false);
    assert.equal(isClassicStudioMode(new URLSearchParams("studio=classic")), true);
  });

  it("keeps preview on editing desks and hides heavy mounts off-desk", () => {
    assert.equal(studioDeskShows("card", false, "card"), true);
    assert.equal(studioDeskShows("card", false, "insights"), false);
    assert.equal(studioDeskShows("insights", false, "insights"), true);
    assert.equal(studioDeskShows("card", false, "preview"), true);
    assert.equal(studioDeskShows("audience", false, "preview"), false);
    assert.equal(studioDeskShows("audience", true, "preview"), true);
  });

  it("prefers hash aliases when reading the location", () => {
    const fromHash = readStudioDeskFromLocation("?desk=card", "#studio-reach");
    assert.equal(fromHash.classic, false);
    assert.equal(fromHash.desk, "links");
    const classic = readStudioDeskFromLocation("?studio=classic&desk=design", "");
    assert.equal(classic.classic, true);
  });
});
