import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildShareDescription, truncateForShare } from "../share-description";

describe("buildShareDescription", () => {
  it("leads with couple names instead of dumping story text", () => {
    const description = buildShareDescription({
      hostName: "JEFFERY OWURAKU AFARI & FRANCISCA CHELSY SERWAAH OPOKU",
      title: "Jeffery & Francisca's Wedding",
    });
    assert.match(description, /^JEFFERY OWURAKU AFARI & FRANCISCA CHELSY SERWAAH OPOKU invite you/);
    assert.doesNotMatch(description, /our story|met in|fell in love/i);
  });

  it("uses singular verb agreement for a single host name", () => {
    const description = buildShareDescription({ hostName: "Ama Serwaa", title: "Ama's Birthday" });
    assert.match(description, /^Ama Serwaa invites you/);
  });

  it("falls back to a generic invite line when no host name is set", () => {
    const description = buildShareDescription({ hostName: null, title: "Founders' Day Gala" });
    assert.match(description, /Founders' Day Gala/);
    assert.match(description, /You're invited/);
  });

  it("never exceeds the WhatsApp-friendly length cap", () => {
    const description = buildShareDescription({
      hostName: "A Very Long Couple Name Indeed & Another Extremely Lengthy Name Here Too",
      title: "The Grand Celebration of the Century",
    });
    assert.ok(description.length <= 140, `expected <=140 chars, got ${description.length}`);
  });
});

describe("truncateForShare", () => {
  it("leaves short text untouched", () => {
    assert.equal(truncateForShare("Short and sweet."), "Short and sweet.");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const long = "word ".repeat(60).trim();
    const result = truncateForShare(long, 50);
    assert.ok(result.length <= 50);
    assert.ok(result.endsWith("…"));
    assert.ok(!result.slice(0, -1).endsWith(" "));
  });
});
