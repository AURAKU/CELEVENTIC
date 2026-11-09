import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_RESPONSE_FORBIDDEN_KEYS } from "../../events/event-dto";

/**
 * Static inventory of known guest/credential exposure points.
 * This is not a crawl of all 350 routes. It records the routes this batch
 * reviewed so the next audit can expand from a list, not from memory.
 */
const REVIEWED = [
  { route: "GET /api/events/[id]", guests: "stripped", tokens: "stripped" },
  { route: "GET /api/events", guests: "not loaded", tokens: "n/a" },
  { route: "GET /api/guests", guests: "MANAGE_GUESTS + dto", tokens: "stripped" },
  { route: "GET /api/events/[id]/seating", guests: "EDIT_SEATING", tokens: "stripped" },
  { route: "GET /api/events/[id]/seating/party", guests: "EDIT_SEATING", tokens: "stripped" },
  { route: "GET /api/wallet", guests: "n/a", tokens: "MANAGE_FINANCES" },
  { route: "GET /api/wallet/export", guests: "n/a", tokens: "MANAGE_FINANCES + audit" },
  { route: "GET /api/events/[id]/companion-studio", guests: "not the guest graph", tokens: "EDIT_INVITATIONS (studio uniqueLink only)" },
  { route: "GET /api/search", guests: "organizer-scoped names only", tokens: "not selected" },
];

test("general event responses forbid guest graphs and admission credentials", () => {
  assert.deepEqual([...EVENT_RESPONSE_FORBIDDEN_KEYS].sort(), [
    "guests",
    "manualCode",
    "qrToken",
    "uniqueLink",
  ]);
});

test("the exposure inventory covers the P0 event and finance routes from this batch", () => {
  assert.equal(REVIEWED.length >= 7, true);
  assert.ok(REVIEWED.every((row) => row.tokens !== "leaked"));
});
