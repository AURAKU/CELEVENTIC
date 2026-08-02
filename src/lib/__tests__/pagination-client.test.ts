import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paginateList } from "../pagination-client";

describe("paginateList", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("slices the first page", () => {
    const result = paginateList(items, 1, 10);
    assert.deepEqual(result.items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(result.total, 25);
    assert.equal(result.pages, 3);
    assert.equal(result.page, 1);
    assert.equal(result.from, 1);
    assert.equal(result.to, 10);
  });

  it("clamps out-of-range pages", () => {
    assert.equal(paginateList(items, 99, 10).page, 3);
    assert.equal(paginateList(items, 0, 10).page, 1);
  });

  it("handles empty lists", () => {
    const result = paginateList([], 1, 10);
    assert.deepEqual(result.items, []);
    assert.equal(result.total, 0);
    assert.equal(result.pages, 1);
    assert.equal(result.from, 0);
    assert.equal(result.to, 0);
  });
});
