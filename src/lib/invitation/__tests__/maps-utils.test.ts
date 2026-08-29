import assert from "node:assert/strict";
import test from "node:test";
import { buildDirectionsUrl, normalizeExternalHref } from "@/lib/invitation/maps-utils";

test("normalizeExternalHref never leaves Google Maps as a same-origin path", () => {
  assert.equal(
    normalizeExternalHref("https://www.google.com/maps/search/?api=1&query=Westlands"),
    "https://www.google.com/maps/search/?api=1&query=Westlands"
  );
  assert.equal(
    normalizeExternalHref("www.google.com/maps/search/?api=1&query=Westlands"),
    "https://www.google.com/maps/search/?api=1&query=Westlands"
  );
  assert.equal(
    normalizeExternalHref("//www.google.com/maps/search/?api=1&query=Westlands"),
    "https://www.google.com/maps/search/?api=1&query=Westlands"
  );
  assert.equal(normalizeExternalHref("javascript:alert(1)"), "");
  assert.equal(normalizeExternalHref(""), "");
});

test("buildDirectionsUrl prefers an absolute maps link over a constructed destination", () => {
  assert.equal(
    buildDirectionsUrl({
      mapsLink: "www.google.com/maps/search/?api=1&query=Femmora%20GH%20Westlands",
      venueName: "FEMMORA GH",
      landmark: "Westlands",
    }),
    "https://www.google.com/maps/search/?api=1&query=Femmora%20GH%20Westlands"
  );
  assert.equal(
    buildDirectionsUrl({ venueName: "FEMMORA GH", landmark: "Westlands" }),
    "https://www.google.com/maps/dir/?api=1&destination=FEMMORA%20GH%2C%20Westlands"
  );
});
