import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hourglassEngraving, weddingBoardUsesHourglass } from "../hourglass-identity";

test("hourglass engraving uses the couple on the board", () => {
  const kojo = hourglassEngraving({
    name1: "Kojo",
    name2: "Fafa",
    seal: "K | F",
    displayDate: "NOVEMBER • 13 & 14 • 2026",
  });
  assert.equal(kojo.monogram, "K | F");
  assert.equal(kojo.coupleLine, "Kojo & Fafa");
  assert.equal(kojo.tag, "");
  assert.match(kojo.dateLine, /13 & 14/);
  assert.doesNotMatch(`${kojo.monogram} ${kojo.coupleLine} ${kojo.dateLine}`, /edwin|lordina|blankson|anderson/i);

  const edwin = hourglassEngraving({
    name1: "Edwin Ebow Blankson",
    name2: "Lordina Ewurafua Anderson",
    seal: "E | L",
    displayDate: "DECEMBER • 24 & 26 • 2026",
  });
  assert.equal(edwin.coupleLine, "Edwin & Lordina");
  assert.equal(edwin.monogram, "E | L");
  assert.equal(edwin.tag, "#EdWinsDina26");
  assert.doesNotMatch(`${edwin.monogram} ${edwin.coupleLine} ${edwin.dateLine}`, /kojo|fafa|westville|esther/i);
});

test("an empty board does not fall back to another couple", () => {
  const blank = hourglassEngraving({});
  assert.equal(blank.monogram, "");
  assert.equal(blank.coupleLine, "");
  assert.equal(blank.dateLine, "");
  assert.equal(blank.tag, "");
  assert.doesNotMatch(JSON.stringify(blank), /kojo|fafa|edwin|lordina|jeffery|chelsy/i);
});

test("gold-royal stays numeric unless the board is Edwin and Lordina", () => {
  assert.equal(weddingBoardUsesHourglass("hourglass", "Anyone", "Else"), true);
  assert.equal(weddingBoardUsesHourglass("gold-royal", "EDWIN", "LORDINA"), true);
  assert.equal(
    weddingBoardUsesHourglass("gold-royal", "Edwin Ebow Blankson", "Lordina Ewurafua Anderson"),
    true
  );
  assert.equal(weddingBoardUsesHourglass("gold-royal", "OWURAKU AFARI", "FRANCISCA"), false);
  assert.equal(weddingBoardUsesHourglass("classic", "EDWIN", "LORDINA"), false);
  assert.equal(weddingBoardUsesHourglass(undefined, "EDWIN", "LORDINA"), false);
});

test("the wedding template shows the hourglass only when the design asks for it", () => {
  const source = readFileSync(
    "src/components/invitation/templates/forever-afaris-wedding.tsx",
    "utf8"
  );
  assert.match(source, /weddingBoardUsesHourglass/);
  assert.match(source, /hourglassEngraving/);
  assert.doesNotMatch(source, /Kojo & Fafa|Edwin Ebow|JEFFERY|CHELSY/);
});
