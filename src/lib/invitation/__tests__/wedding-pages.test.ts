import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("hides Order of the Day on the Edwin invitation only", () => {
    const edwin = JSON.parse(
      readFileSync(join(process.cwd(), "scripts/fixtures/edwin-lordina-design.json"), "utf8")
    ) as { studio?: { weddingBoard?: { features?: { programme?: boolean } } } };
    const kojo = JSON.parse(
      readFileSync(join(process.cwd(), "scripts/fixtures/kojo-fafa-design.json"), "utf8")
    ) as { studio?: { weddingBoard?: { features?: { programme?: boolean } } } };
    assert.equal(edwin.studio?.weddingBoard?.features?.programme, false);
    assert.equal(kojo.studio?.weddingBoard?.features?.programme, true);

    const source = readFileSync(
      join(process.cwd(), "src/components/invitation/templates/forever-afaris-wedding.tsx"),
      "utf8"
    );
    assert.match(source, /features\.programme &&\s*!isEdwinLordinaBook/);
  });
});
