import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRange } from "../../../../lib/uploads/range";

const SIZE = 1000;

describe("parseRange — byte-range parsing for local-disk video/media serving", () => {
  it("returns null when there is no Range header (full-file 200 response)", () => {
    assert.equal(parseRange(null, SIZE), null);
  });

  it("parses a standard 'bytes=start-end' range", () => {
    assert.deepEqual(parseRange("bytes=100-199", SIZE), { start: 100, end: 199 });
  });

  it("defaults the end to the last byte when only a start is given ('bytes=500-')", () => {
    assert.deepEqual(parseRange("bytes=500-", SIZE), { start: 500, end: 999 });
  });

  it("handles a suffix range ('bytes=-500' — last 500 bytes)", () => {
    assert.deepEqual(parseRange("bytes=-500", SIZE), { start: 500, end: 999 });
  });

  it("clamps an end beyond the file size to the last byte", () => {
    assert.deepEqual(parseRange("bytes=0-99999", SIZE), { start: 0, end: 999 });
  });

  it("rejects malformed ranges instead of throwing", () => {
    assert.equal(parseRange("bytes=abc-def", SIZE), null);
    assert.equal(parseRange("not-a-range", SIZE), null);
  });

  it("rejects an unsatisfiable range (start past the end of the file)", () => {
    assert.equal(parseRange("bytes=5000-6000", SIZE), null);
  });

  it("rejects an inverted range (end before start)", () => {
    assert.equal(parseRange("bytes=500-100", SIZE), null);
  });

  it("rejects multi-range requests (falls back to a full 200 response — rarely sent by video players)", () => {
    assert.equal(parseRange("bytes=0-99,200-299", SIZE), null);
  });
});
