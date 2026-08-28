import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  introLinePlaceholderForEventType,
  resolveHeadlineNames,
  resolveOrderEventType,
} from "@/lib/invitation/catalog-event-type";

describe("resolveOrderEventType", () => {
  it("maps Funeral category to FUNERAL even when WEDDING is requested", () => {
    assert.equal(resolveOrderEventType("Funeral", "WEDDING"), "FUNERAL");
  });

  it("maps Birthday category to BIRTHDAY", () => {
    assert.equal(resolveOrderEventType("Birthday", undefined), "BIRTHDAY");
    assert.equal(resolveOrderEventType("Birthday", "WEDDING"), "BIRTHDAY");
  });

  it("maps Lunch category to PRODUCT_LAUNCH", () => {
    assert.equal(resolveOrderEventType("Lunch"), "PRODUCT_LAUNCH");
    assert.equal(resolveOrderEventType("Lunch", "WEDDING"), "PRODUCT_LAUNCH");
    assert.equal(resolveOrderEventType("Lunch", "CORPORATE_EVENT"), "CORPORATE_EVENT");
  });

  it("keeps Wedding as WEDDING", () => {
    assert.equal(resolveOrderEventType("Wedding"), "WEDDING");
    assert.equal(resolveOrderEventType("Wedding", "FUNERAL"), "WEDDING");
  });

  it("allows compatible Corporate ↔ Conference picks", () => {
    assert.equal(resolveOrderEventType("Corporate", "CONFERENCE"), "CONFERENCE");
  });
});

describe("resolveHeadlineNames", () => {
  it("does not couple-split memorial layouts", () => {
    const names = resolveHeadlineNames({
      layout: "memorial-candle-tribute",
      title: "In Loving Memory of Ama Serwaa",
      hostName: "The Mensah Family",
    });
    assert.equal(names.name2, "");
    assert.match(names.name1, /Ama/);
  });

  it("uses couple names for weddings", () => {
    const names = resolveHeadlineNames({
      eventType: "WEDDING",
      title: "Amara & Kwame",
      hostName: "Hosts",
      coupleName1: "Amara",
      coupleName2: "Kwame",
    });
    assert.deepEqual(names, { name1: "Amara", name2: "Kwame" });
  });

  it("uses single headline for birthday", () => {
    const names = resolveHeadlineNames({
      eventType: "BIRTHDAY",
      title: "Nia's 30th Birthday",
      hostName: "Organizer",
    });
    assert.deepEqual(names, { name1: "Nia's 30th Birthday", name2: "" });
  });
});

describe("introLinePlaceholderForEventType", () => {
  it("returns funeral-appropriate intro", () => {
    assert.equal(introLinePlaceholderForEventType("FUNERAL"), "In loving memory");
  });

  it("returns wedding-appropriate intro", () => {
    assert.equal(
      introLinePlaceholderForEventType("WEDDING"),
      "Together with their families"
    );
  });
});
