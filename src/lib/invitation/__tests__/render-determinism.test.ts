/**
 * Hydration-safety guarantees for invitation rendering — pure-function unit tests
 * (node:test). Run: npm run test:live-editability
 *
 * Invitation templates render on the server and hydrate in the guest's browser. Any
 * date value that depends on *when* or *where* it is evaluated produces different
 * text on each side, which React reports as a hydration failure and, on recovery,
 * can surface the root error boundary. These tests pin both sources of drift.
 */
process.env.TZ = "America/New_York";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatInvitationDateParts } from "../../invitation-templates";
import { buildRenderContextFromEvent } from "../../template-variables";
import { buildLivePreviewProps } from "../../invitation-mvp/demo-preview-data";

// 16:00 UTC — Africa/Accra is UTC+0, so a correctly pinned formatter says 4:00 PM
// while an unpinned one running in this file's TZ would say 12:00 PM.
const INSTANT = "2027-06-14T16:00:00.000Z";

describe("event date formatting is timezone-pinned", () => {
  it("formats invitation date parts in the host's timezone, not the runtime's", () => {
    const parts = formatInvitationDateParts(INSTANT);

    assert.equal(parts.time, "4:00 PM");
    assert.equal(parts.day, 14);
    assert.equal(parts.month, "June");
    assert.equal(parts.year, 2027);
    assert.equal(parts.weekday, "Monday");
  });

  it("formats template variables in the host's timezone", () => {
    const ctx = buildRenderContextFromEvent({
      title: "The Wedding of Amara & Kwame",
      hostName: "Amara & Kwame",
      startDate: INSTANT,
    });

    assert.equal(ctx.event_time.toUpperCase(), "4:00 PM");
    assert.match(ctx.event_date, /14 June 2027/);
  });
});

describe("demo preview data is clock-independent", () => {
  it("uses a fixed calendar slot so server and client renders agree", () => {
    const preview = buildLivePreviewProps("classic-gold", "Wedding");

    assert.match(
      preview.event.startDateRaw ?? "",
      /^\d{4}-06-14T16:00:00\.000Z$/,
      "demo event date must be a fixed UTC slot, never derived from Date.now()"
    );
  });

  it("returns the same date on every call", () => {
    const a = buildLivePreviewProps("classic-gold", "Wedding");
    const b = buildLivePreviewProps("luxury-rings", "Wedding");

    assert.equal(a.event.startDateRaw, b.event.startDateRaw);
    assert.equal(a.event.startDate, b.event.startDate);
  });
});
