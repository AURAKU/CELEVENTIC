import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMonthCells,
  calendarMonthFromHighlights,
  civilDateInZone,
  highlightedCeremonyDays,
} from "@/lib/experience/aurelia-editorial/hero-calendar";
import { SERAPHINE_WEDDING_DEFAULTS } from "@/lib/experience/aurelia-editorial/preset";

test("November 2026 starts on Sunday and includes the 13th and 14th", () => {
  const cells = buildMonthCells(2026, 10);
  assert.equal(cells[0]?.day, 1);
  assert.equal(cells[12]?.day, 13);
  assert.equal(cells[12]?.key, "2026-11-13");
  assert.equal(cells[13]?.day, 14);
  assert.equal(cells[13]?.key, "2026-11-14");
  assert.equal(cells.length % 7, 0);
});

test("Seraphine ceremonies highlight only 13 and 14 November 2026", () => {
  const days = highlightedCeremonyDays(SERAPHINE_WEDDING_DEFAULTS.ceremonies);
  assert.deepEqual(
    days.map((day) => [day.key, day.title]),
    [
      ["2026-11-13", "Traditional Ceremony"],
      ["2026-11-14", "Wedding Ceremony"],
    ]
  );
  const month = calendarMonthFromHighlights(days);
  assert.equal(month?.year, 2026);
  assert.equal(month?.month, 10);
  assert.equal(civilDateInZone(SERAPHINE_WEDDING_DEFAULTS.ceremonies[0]?.startAtIso ?? "")?.day, 13);
});
