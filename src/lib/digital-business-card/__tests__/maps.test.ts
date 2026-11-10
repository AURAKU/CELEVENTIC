import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCeleCardPlace } from "@/lib/digital-business-card/maps";
import {
  digitalCardSocialHref,
  isCompleteReachValue,
  listDigitalCardReachItems,
  reviewReachInput,
} from "@/lib/digital-business-card/socials";
import { buildVCard } from "@/lib/digital-business-card/vcard";

describe("CeleYou location places", () => {
  it("reads Google Maps, Amap, Apple Maps, and a street address", () => {
    const google = parseCeleCardPlace(
      "https://www.google.com/maps/place/Ridge+Hospital/@5.5600,-0.1960,17z"
    );
    assert.equal(google?.provider, "Google Maps");
    assert.equal(google?.label, "Ridge Hospital");
    assert.equal(google?.lat, 5.56);
    assert.equal(google?.lng, -0.196);
    assert.match(google?.embedUrl ?? "", /maps\.google\.com\/maps\?q=/);
    assert.match(google?.embedUrl ?? "", /output=embed/);

    const shortGoogle = parseCeleCardPlace("https://maps.app.goo.gl/folioHouse");
    assert.equal(shortGoogle?.provider, "Google Maps");
    assert.match(shortGoogle?.href ?? "", /maps\.app\.goo\.gl\/folioHouse/);

    const amap = parseCeleCardPlace("https://uri.amap.com/marker?position=113.3245,23.1291");
    assert.equal(amap?.provider, "Amap");
    assert.equal(amap?.lng, 113.3245);
    assert.equal(amap?.lat, 23.1291);

    const apple = parseCeleCardPlace("https://maps.apple.com/?ll=51.5074,-0.1278&q=London");
    assert.equal(apple?.provider, "Apple Maps");
    assert.equal(apple?.label, "London");
    assert.equal(apple?.lat, 51.5074);

    const street = parseCeleCardPlace("Oxford Street, Accra");
    assert.equal(street?.provider, "Maps");
    assert.equal(street?.label, "Oxford Street, Accra");
    assert.match(street?.href ?? "", /google\.com\/maps\/search/);
    assert.match(street?.embedUrl ?? "", /output=embed/);
  });

  it("reads Waze, OSM, Bing, Baidu, and geo pins", () => {
    assert.equal(parseCeleCardPlace("https://www.waze.com/ul?ll=5.56,-0.19")?.provider, "Waze");
    assert.equal(
      parseCeleCardPlace("https://www.openstreetmap.org/#map=17/5.5600/-0.1960")?.provider,
      "OpenStreetMap"
    );
    assert.equal(parseCeleCardPlace("https://www.bing.com/maps?cp=5.56~-0.19")?.provider, "Bing Maps");
    assert.equal(parseCeleCardPlace("https://map.baidu.com/search")?.provider, "Baidu Maps");
    const geo = parseCeleCardPlace("geo:5.56,-0.196");
    assert.equal(geo?.lat, 5.56);
    assert.equal(geo?.lng, -0.196);
  });

  it("rejects social handles and unrelated links", () => {
    assert.equal(parseCeleCardPlace("@amaserwaa"), null);
    assert.equal(parseCeleCardPlace("https://www.instagram.com/amaserwaa"), null);
    assert.equal(parseCeleCardPlace("ama"), null);
    assert.equal(reviewReachInput("location", "https://www.tiktok.com/@ama").status, "review");
    assert.equal(reviewReachInput("location", "Oxford Street, Accra").status, "ok");
    assert.equal(isCompleteReachValue("location", "https://maps.app.goo.gl/folioHouse"), true);
    assert.equal(isCompleteReachValue("location", "https://instagram.com/ama"), false);
  });

  it("publishes a guest location tap with a map href", () => {
    const href = digitalCardSocialHref(
      "location",
      "https://www.google.com/maps/place/Ridge+Hospital/@5.5600,-0.1960,17z"
    );
    assert.match(href, /google\.com\/maps\/place\/Ridge\+Hospital/);
    const items = listDigitalCardReachItems({
      email: null,
      phone: null,
      website: null,
      socials: {
        location: "https://www.google.com/maps/place/Ridge+Hospital/@5.5600,-0.1960,17z",
      },
    });
    const place = items.find((item) => item.brand === "location");
    assert.equal(place?.title, "Ridge Hospital");
    assert.equal(place?.subtitle, "Google Maps");
    assert.equal(place?.surface, "stack");
    assert.match(place?.href ?? "", /google\.com\/maps/);
  });

  it("puts the place on the saved contact card", () => {
    const vcf = buildVCard({
      id: "card_loc",
      slug: "ama",
      publicToken: "tok_ama",
      displayName: "Ama Mensah",
      title: "Founder",
      company: "Celeventic",
      bio: null,
      email: null,
      phone: null,
      website: null,
      socials: {
        location: "https://www.google.com/maps/place/Ridge+Hospital/@5.5600,-0.1960,17z",
      },
      themeId: "elegant-frost",
      avatarUrl: null,
      pronouns: null,
      nfcEnabled: true,
      connectBackEnabled: true,
      defaultMode: "professional",
      isLive: true,
    });
    assert.match(vcf, /GEO:5\.56;-0\.196/);
    assert.match(vcf, /ADR;TYPE=WORK:;;Ridge Hospital;;;;/);
    assert.match(vcf, /X-ABLabel:Location/);
  });
});
