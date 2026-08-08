import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { layoutMenu, menuCourseKind, parseMenuBody } from "../menu-layout";
import type { GuideMenu } from "../types";

/**
 * The menu a caterer actually sends, read into the courses a guest is served.
 *
 * The promise these tests exist to hold is the one an organizer is given in
 * the editor: nothing they paste is left off the menu. Every assertion about
 * headings and glyphs is secondary to that.
 */

/** Every non-blank line that went in, in the order it was written. */
function sourceLines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-–—•·*+]+|\(?\d{1,2}[.)])\s+/, "").trim())
    .map((line) => line.replace(/^[*_#\s]+|[*_\s]+$/g, "").replace(/:$/, "").trim())
    .filter(Boolean);
}

/** Everything the reading produced, headings and dishes alike. */
function renderedLines(body: string): string[] {
  return parseMenuBody(body).flatMap((course) => [
    ...(course.heading ? [course.heading] : []),
    ...course.items.map((item) => item.name),
  ]);
}

function assertNothingDropped(body: string) {
  const rendered = renderedLines(body).join("\n");
  for (const line of sourceLines(body)) {
    assert.ok(
      rendered.includes(line),
      `"${line}" was written on the menu but does not appear on the card`
    );
  }
}

const ASTERISK_MENU = [
  "*APPETIZER*",
  "Samosa",
  "Spring rolls",
  "Chicken satay",
  "*MAIN DISHES*",
  "Jollof rice",
  "Grilled tilapia",
  "Waakye with shito",
  "*DESSERT*",
  "Chocolate mousse",
].join("\n");

describe("reading a menu written with *ASTERISK* courses", () => {
  const courses = parseMenuBody(ASTERISK_MENU);

  it("reads three courses rather than one block of text", () => {
    assert.deepEqual(
      courses.map((course) => course.heading),
      ["APPETIZER", "MAIN DISHES", "DESSERT"]
    );
  });

  it("puts every dish under the course it was written below", () => {
    assert.deepEqual(courses[0]!.items.map((item) => item.name), [
      "Samosa",
      "Spring rolls",
      "Chicken satay",
    ]);
    assert.deepEqual(courses[1]!.items.map((item) => item.name), [
      "Jollof rice",
      "Grilled tilapia",
      "Waakye with shito",
    ]);
    assert.deepEqual(courses[2]!.items.map((item) => item.name), ["Chocolate mousse"]);
  });

  it("leaves nothing off the menu", () => {
    assertNothingDropped(ASTERISK_MENU);
  });

  it("names each course so the page can set its glyph", () => {
    assert.deepEqual(courses.map((course) => course.kind), ["starter", "main", "dessert"]);
  });
});

describe("reading a menu the organizer could not put line breaks in", () => {
  const oneLine =
    "*APPETIZER* Samosa, Spring rolls *MAIN DISHES* Jollof rice, Grilled tilapia *DESSERT* Fruit platter";
  const courses = parseMenuBody(oneLine);

  it("still finds the courses inside the single line", () => {
    assert.deepEqual(
      courses.map((course) => course.heading),
      ["APPETIZER", "MAIN DISHES", "DESSERT"]
    );
  });

  it("splits the dishes on the only separator they had", () => {
    assert.deepEqual(courses[0]!.items.map((item) => item.name), ["Samosa", "Spring rolls"]);
    assert.deepEqual(courses[1]!.items.map((item) => item.name), [
      "Jollof rice",
      "Grilled tilapia",
    ]);
  });

  it("never splits a dish that had a line of its own", () => {
    // The comma here joins one dish, and a line break was available, so the
    // organizer's line is left exactly as they wrote it.
    const courses = parseMenuBody("MAINS\nGrilled tilapia, banku and pepper sauce\nJollof rice");
    assert.deepEqual(courses[0]!.items.map((item) => item.name), [
      "Grilled tilapia, banku and pepper sauce",
      "Jollof rice",
    ]);
  });
});

describe("reading a menu written in the other shapes organizers use", () => {
  it("reads ALL-CAPS lines as courses", () => {
    const courses = parseMenuBody("STARTERS\nGroundnut soup\n\nMAINS\nJollof rice");
    assert.deepEqual(courses.map((c) => c.heading), ["STARTERS", "MAINS"]);
    assert.deepEqual(courses[0]!.items.map((i) => i.name), ["Groundnut soup"]);
  });

  it("reads `Dessert:` as a course, and a dish on the same line as its first", () => {
    const courses = parseMenuBody("Dessert: Chocolate mousse\nFruit platter");
    assert.equal(courses[0]!.heading, "Dessert");
    assert.deepEqual(courses[0]!.items.map((i) => i.name), [
      "Chocolate mousse",
      "Fruit platter",
    ]);
  });

  it("reads a markdown heading as a course", () => {
    const courses = parseMenuBody("## Starters\nKelewele");
    assert.deepEqual(courses.map((c) => c.heading), ["Starters"]);
    assert.deepEqual(courses[0]!.items.map((i) => i.name), ["Kelewele"]);
  });

  it("strips the bullets off a pasted list without losing the dish", () => {
    const courses = parseMenuBody("STARTERS\n- Kelewele\n• Groundnut soup\n1. Samosa");
    assert.deepEqual(courses[0]!.items.map((i) => i.name), [
      "Kelewele",
      "Groundnut soup",
      "Samosa",
    ]);
  });

  it("treats a bulleted line as a dish even when it is shouted", () => {
    const courses = parseMenuBody("STARTERS\n- KELEWELE\n- Samosa");
    assert.equal(courses.length, 1);
    assert.deepEqual(courses[0]!.items.map((i) => i.name), ["KELEWELE", "Samosa"]);
  });

  it("groups on blank lines when the organizer wrote no headings at all", () => {
    const body = "Groundnut soup\nKelewele\n\nJollof rice\nGrilled tilapia";
    const courses = parseMenuBody(body);
    assert.equal(courses.length, 2);
    assert.deepEqual(courses.map((c) => c.heading), ["", ""]);
    assert.deepEqual(courses[1]!.items.map((i) => i.name), ["Jollof rice", "Grilled tilapia"]);
    assertNothingDropped(body);
  });

  it("keeps a plain list of dishes as one untitled course", () => {
    const courses = parseMenuBody("Jollof rice\nGrilled tilapia\nKelewele");
    assert.equal(courses.length, 1);
    assert.equal(courses[0]!.heading, "");
    assert.equal(courses[0]!.items.length, 3);
  });

  it("keeps dishes written above the first heading", () => {
    const body = "Welcome drinks\n\n*MAINS*\nJollof rice";
    assert.deepEqual(renderedLines(body), ["Welcome drinks", "MAINS", "Jollof rice"]);
    assertNothingDropped(body);
  });

  it("reads a sentence as a dish, never as a course", () => {
    const courses = parseMenuBody(
      "MAINS\nJollof rice\nKindly let a steward know of any allergies before service begins."
    );
    assert.equal(courses.length, 1);
    assert.equal(courses[0]!.items.length, 2);
  });
});

describe("naming the course for its glyph", () => {
  it("recognises the words a caterer uses", () => {
    assert.equal(menuCourseKind("APPETIZER"), "starter");
    assert.equal(menuCourseKind("Starters"), "starter");
    assert.equal(menuCourseKind("Soup & Salad"), "soup");
    assert.equal(menuCourseKind("MAIN DISHES"), "main");
    assert.equal(menuCourseKind("Sides"), "side");
    assert.equal(menuCourseKind("Dessert"), "dessert");
    assert.equal(menuCourseKind("Drinks & Bar"), "drink");
    assert.equal(menuCourseKind("Welcome cocktails"), "welcome");
    assert.equal(menuCourseKind("A note on allergies"), "note");
  });

  it("falls back to the guide's own lozenge for a course it cannot name", () => {
    assert.equal(menuCourseKind("Chef's table"), "course");
    assert.equal(menuCourseKind(""), "course");
  });
});

describe("the menu a guest's page renders", () => {
  const menu = (over: Partial<GuideMenu> = {}): GuideMenu => ({
    body: "",
    sections: [],
    url: null,
    ...over,
  });

  it("is empty when the hosts have published nothing", () => {
    assert.equal(layoutMenu(menu()).isEmpty, true);
    assert.equal(layoutMenu(menu({ url: "https://example.com/menu.pdf" })).isEmpty, true);
  });

  it("renders a structured section as written, without re-reading it", () => {
    const layout = layoutMenu(
      menu({ sections: [{ id: "s1", heading: "Starters", items: ["Kelewele", "Samosa"] }] })
    );
    assert.equal(layout.isEmpty, false);
    assert.equal(layout.courses.length, 1);
    assert.equal(layout.courses[0]!.kind, "starter");
    assert.deepEqual(layout.courses[0]!.items.map((i) => i.name), ["Kelewele", "Samosa"]);
  });

  it("puts structured sections first and free text after them", () => {
    const layout = layoutMenu(
      menu({
        sections: [{ id: "s1", heading: "Starters", items: ["Kelewele"] }],
        body: "*DESSERT*\nChocolate mousse",
      })
    );
    assert.deepEqual(layout.courses.map((c) => c.heading), ["Starters", "DESSERT"]);
  });

  it("gives every course and dish a key that is stable and unique", () => {
    const layout = layoutMenu(menu({ body: ASTERISK_MENU }));
    const ids = [
      ...layout.courses.map((c) => c.id),
      ...layout.courses.flatMap((c) => c.items.map((i) => i.id)),
    ];
    assert.equal(new Set(ids).size, ids.length, "duplicate React keys");
  });
});

describe("a menu long enough to hit the ceilings", () => {
  it("keeps every dish on the card even past the course ceiling", () => {
    const body = Array.from({ length: 30 }, (_, i) => `*COURSE ${i + 1}*\nDish ${i + 1}`).join(
      "\n"
    );
    const rendered = renderedLines(body).join("\n");
    for (let i = 1; i <= 30; i += 1) {
      assert.ok(rendered.includes(`Dish ${i}`), `Dish ${i} was dropped`);
    }
  });
});
