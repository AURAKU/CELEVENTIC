import test from "node:test";
import assert from "node:assert/strict";
import { buildRsvpExportCsv } from "../export";

test("exports a formula-safe CSV with a BOM", () => {
  const csv = buildRsvpExportCsv([
    {
      name: "=cmd",
      email: "a@example.com",
      phone: null,
      status: "ACCEPTED",
      plusOnes: 1,
      latestResponse: "ACCEPTED",
      latestMessage: "yes, with plus one",
      respondedAt: "2026-11-07T10:00:00.000Z",
      invitationName: "Aurelia",
    },
  ]);
  assert.equal(csv.startsWith("\ufeff"), true);
  assert.equal(csv.includes("'=cmd"), true);
  assert.equal(csv.includes("Aurelia"), true);
});
