import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDirectionsUrl,
  extractMapsCoordinates,
  googleMapsPlaceHref,
  normalizeExternalHref,
  resolveMapsLocationHref,
  toGoogleMapsDirectionsHref,
  webMercatorTile,
} from "@/lib/invitation/maps-utils";

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
    "https://www.google.com/maps/search/?api=1&query=FEMMORA%20GH%2C%20Westlands"
  );
});

test("resolveMapsLocationHref never ships a same-origin maps path on live", () => {
  assert.equal(
    resolveMapsLocationHref({
      mapsUrl: "https://maps.google.com",
      locationName: "FEMMORA GH",
      address: "Westlands",
    }),
    "https://www.google.com/maps/search/?api=1&query=FEMMORA%20GH%2C%20Westlands"
  );
  assert.equal(
    resolveMapsLocationHref({
      mapsUrl: "FEMMORA GH, Westlands",
      locationName: "FEMMORA GH",
      address: "Westlands",
    }),
    "https://www.google.com/maps/search/?api=1&query=FEMMORA%20GH%2C%20Westlands"
  );
  assert.equal(
    resolveMapsLocationHref({ mapsUrl: "javascript:alert(1)", locationName: "FEMMORA GH" }),
    "https://www.google.com/maps/search/?api=1&query=FEMMORA%20GH"
  );
});

test("googleMapsPlaceHref pins the named venue to exact coordinates", () => {
  const href = googleMapsPlaceHref({
    label: "The Forest Grove Event, Adjacent to 335 Place, Dzorwulu, Accra, Ghana",
    lat: 5.621568,
    lng: -0.18492,
  });
  assert.match(href, /^https:\/\/www\.google\.com\/maps\/place\//);
  assert.match(href, /Forest\+Grove|Dzorwulu|335/);
  assert.match(href, /@5\.621568,-0\.18492,17z/);
  assert.deepEqual(extractMapsCoordinates(href), { lat: 5.621568, lng: -0.18492 });
  assert.match(toGoogleMapsDirectionsHref(href), /destination=5\.621568%2C-0\.18492/);
});

test("webMercatorTile places the Tema church on its zoom-16 tile", () => {
  const tile = webMercatorTile(5.670683, -0.03132, 16);
  assert.equal(Math.floor(tile.x), 32762);
  assert.equal(Math.floor(tile.y), 31733);
});
