import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEDDING_SECTION_ORDER, type WeddingSectionId } from "@/lib/invitation/wedding-board";
import {
  groupWeddingSectionPages,
  isEdwinLordinaBook,
} from "@/lib/invitation/wedding-pages";

describe("wedding pages", () => {
  it("keeps every section on exactly one page", () => {
    const pages = groupWeddingSectionPages(WEDDING_SECTION_ORDER);
    const flat = pages.flatMap((page) => page.sections);
    assert.deepEqual([...flat].sort(), [...WEDDING_SECTION_ORDER].sort());
    assert.equal(new Set(flat).size, WEDDING_SECTION_ORDER.length);
  });

  it("drops empty pages and keeps the welcome page first", () => {
    const pages = groupWeddingSectionPages(["hero", "story", "closing"] as WeddingSectionId[]);
    assert.deepEqual(
      pages.map((page) => page.id),
      ["welcome", "story", "respond"]
    );
  });

  it("opens the book only for Edwin and Lordina", () => {
    assert.equal(isEdwinLordinaBook("Edwin Ebow Blankson", "Lordina Ewurafua Anderson"), true);
    assert.equal(isEdwinLordinaBook("Kojo", "Fafa"), false);
  });
});
