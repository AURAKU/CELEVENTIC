import { describe, expect, it } from "vitest";
import {
  mergeCompanionFeatureConfig,
  parseProgrammeOutline,
  programmeItemsToOutline,
  readCompanionMenuConfig,
  resolveCompanionMenu,
} from "@/lib/admission/companion-studio";

describe("readCompanionMenuConfig", () => {
  it("reads menu body and url", () => {
    expect(
      readCompanionMenuConfig({ menuBody: "Starter", menuUrl: "https://menu.example" })
    ).toEqual({ menuBody: "Starter", menuUrl: "https://menu.example" });
  });

  it("falls back to empty strings", () => {
    expect(readCompanionMenuConfig(null)).toEqual({ menuBody: "", menuUrl: "" });
  });
});

describe("mergeCompanionFeatureConfig", () => {
  it("overlays companion keys without wiping place-card config", () => {
    const merged = mergeCompanionFeatureConfig(
      { PLACE_CARD: { enabled: true }, EVENT_MENU: { enabled: false } },
      { EVENT_MENU: { enabled: true, config: { menuBody: "Cake", menuUrl: "" } } }
    );
    expect(merged.PLACE_CARD).toEqual({ enabled: true });
    expect(merged.EVENT_MENU).toEqual({
      enabled: true,
      config: { menuBody: "Cake", menuUrl: "" },
    });
  });
});

describe("resolveCompanionMenu", () => {
  it("falls back to canonical when local is empty", () => {
    expect(resolveCompanionMenu({}, { menuBody: "Soup", menuUrl: "" })).toEqual({
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
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      time: "2:00 PM",
      title: "Ceremony",
      description: "Exchange of vows",
    });
    expect(items[1]).toMatchObject({ time: "4:30 PM", title: "Reception" });
  });

  it("parses title at time lines", () => {
    const items = parseProgrammeOutline("Ceremony at 2:00 PM");
    expect(items[0]).toMatchObject({ time: "2:00 PM", title: "Ceremony" });
  });

  it("keeps plain titles without inventing a time", () => {
    const items = parseProgrammeOutline("Guest welcome");
    expect(items[0]).toMatchObject({ time: "", title: "Guest welcome" });
  });

  it("round-trips through programmeItemsToOutline", () => {
    const outline = "1:30 PM — Arrival\n2:00 PM — Ceremony — Vows";
    const again = programmeItemsToOutline(parseProgrammeOutline(outline));
    expect(again).toContain("1:30 PM — Arrival");
    expect(again).toContain("2:00 PM — Ceremony — Vows");
  });
});
