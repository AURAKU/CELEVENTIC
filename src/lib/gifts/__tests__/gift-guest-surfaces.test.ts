import test from "node:test";
import assert from "node:assert/strict";

import { isCampaignPlaceable } from "../gift-placement";

/**
 * Contract: guest gift CTAs only on Event Guide + Event Companion when the
 * campaign is live and the surface flag is on. Digital invitation is always off.
 */
test("guest gift CTA surfaces when feature placement is on", () => {
  const live = {
    status: "ACTIVE",
    showOnInvitation: true,
    showOnCompanion: true,
  };

  assert.equal(isCampaignPlaceable(live, "event-guide"), true);
  assert.equal(isCampaignPlaceable(live, "companion"), true);
  assert.equal(isCampaignPlaceable(live, "invitation"), false);
});

test("turning a surface flag off hides that CTA only", () => {
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: false, showOnCompanion: true },
      "event-guide"
    ),
    false
  );
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: false, showOnCompanion: true },
      "companion"
    ),
    true
  );
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: true, showOnCompanion: false },
      "companion"
    ),
    false
  );
  assert.equal(
    isCampaignPlaceable(
      { status: "ACTIVE", showOnInvitation: true, showOnCompanion: false },
      "event-guide"
    ),
    true
  );
});

test("paused campaign hides every guest CTA surface", () => {
  const paused = {
    status: "PAUSED",
    showOnInvitation: true,
    showOnCompanion: true,
  };
  assert.equal(isCampaignPlaceable(paused, "event-guide"), false);
  assert.equal(isCampaignPlaceable(paused, "companion"), false);
  assert.equal(isCampaignPlaceable(paused, "invitation"), false);
});
