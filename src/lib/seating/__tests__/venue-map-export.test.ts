import assert from "node:assert/strict";
import test from "node:test";
import { buildVenueMapSvg, venueMapFilename } from "../venue-map-export";

test("buildVenueMapSvg renders ceremony rows, zones, and venue features", () => {
  const { svg, width, height } = buildVenueMapSvg({
    planName: "Ama & Kofi Ceremony",
    planType: "CEREMONY",
    subtitle: "St. Mary's Chapel",
    directions: ["Enter from the west door", "Family rows are nearest the altar"],
    layout: {
      tables: [],
      ceremonySections: [
        { id: "family", name: "Family", color: "#EC4899" },
        { id: "reserved", name: "Reserved", color: "#F59E0B" },
      ],
      elements: [
        {
          id: "el-1",
          kind: "stage",
          label: "Altar",
          x: 120,
          y: 20,
          width: 200,
          height: 80,
          color: "#0B8A83",
        },
      ],
      status: "published",
      planKind: "CEREMONY",
    },
    ceremonyRows: [
      {
        id: "row-a",
        label: "Row A",
        sectionId: "family",
        chairCount: 2,
        chairs: [
          { id: "c1", label: "A1", index: 1, x: 40, y: 140 },
          { id: "c2", label: "A2", index: 2, x: 80, y: 140 },
        ],
        x: 40,
        y: 140,
      },
    ],
  });

  assert.ok(width > 100);
  assert.ok(height > 100);
  assert.match(svg, /Ama &amp; Kofi Ceremony/);
  assert.match(svg, /Altar/);
  assert.match(svg, /Row A/);
  assert.match(svg, /Family/);
  assert.match(svg, /How to find your way/);
  assert.match(svg, /west door/);
});

test("venueMapFilename slugs plan names", () => {
  assert.equal(venueMapFilename("Ama & Kofi Ceremony!", "CEREMONY"), "ama-kofi-ceremony-ceremony-map.png");
  assert.equal(venueMapFilename("Event Seating", "RECEPTION"), "event-seating-reception-map.png");
});
