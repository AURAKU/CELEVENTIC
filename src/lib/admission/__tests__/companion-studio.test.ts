import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeCompanionFeatureConfig,
  parseProgrammeOutline,
  programmeItemsToOutline,
  readCompanionMenuConfig,
  resolveCompanionMenu,
} from "@/lib/admission/companion-studio";

describe("readCompanionMenuConfig", () => {
  it("reads menu body and url", () => {
    assert.deepEqual(
      readCompanionMenuConfig({ menuBody: "Starter", menuUrl: "https://menu.example" }),
      { menuBody: "Starter", menuUrl: "https://menu.example" }
    );
  });

  it("falls back to empty strings", () => {
    assert.deepEqual(readCompanionMenuConfig(null), { menuBody: "", menuUrl: "" });
  });
});

describe("mergeCompanionFeatureConfig", () => {
  it("overlays companion keys without wiping place-card config", () => {
    const merged = mergeCompanionFeatureConfig(
      { PLACE_CARD: { enabled: true }, EVENT_MENU: { enabled: false } },
      { EVENT_MENU: { enabled: true, config: { menuBody: "Cake", menuUrl: "" } } }
    );
    assert.deepEqual(merged.PLACE_CARD, { enabled: true });
    assert.deepEqual(merged.EVENT_MENU, {
      enabled: true,
      config: { menuBody: "Cake", menuUrl: "" },
    });
  });
});

describe("resolveCompanionMenu", () => {
  it("falls back to canonical when local is empty", () => {
    assert.deepEqual(resolveCompanionMenu({}, { menuBody: "Soup", menuUrl: "" }), {
      menuBody: "Soup",
      menuUrl: "",
    });
  });
});

describe("parseProgrammeOutline", () => {
  it("parses em-dash time | title | description lines", () => {
    const items = parseProgrammeOutline(
      "2:00 PM — Ceremony — Exchange of vows\n4:30 PM — Reception"
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
    assert.equal(items[0]!.description, "Exchange of vows");
    assert.equal(items[1]!.time, "4:30 PM");
    assert.equal(items[1]!.title, "Reception");
  });

  it("parses title at time lines", () => {
    const items = parseProgrammeOutline("Ceremony at 2:00 PM");
    assert.equal(items[0]!.time, "2:00 PM");
    assert.equal(items[0]!.title, "Ceremony");
  });

  it("keeps plain titles without inventing a time", () => {
    const items = parseProgrammeOutline("Guest welcome");
    assert.equal(items[0]!.time, "");
    assert.equal(items[0]!.title, "Guest welcome");
  });

  it("round-trips through programmeItemsToOutline", () => {
    const outline = "1:30 PM — Arrival\n2:00 PM — Ceremony — Vows";
    const again = programmeItemsToOutline(parseProgrammeOutline(outline));
    assert.match(again, /1:30 PM — Arrival/);
    assert.match(again, /2:00 PM — Ceremony — Vows/);
  });
});
