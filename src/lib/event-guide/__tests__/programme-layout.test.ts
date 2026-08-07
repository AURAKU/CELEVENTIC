import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseProgrammeScript } from "../programme-script";
import { layoutProgramme, type ProgrammeBlock } from "../programme-layout";

/**
 * The layout is fed by the same reader the builder and the API use, so these
 * tests start from a script an organizer would actually paste rather than from
 * hand-built items. What is asserted is the shape of the guest's page: a title
 * page set as one, people set as people, and the clock set on the clock.
 */
function layoutOf(script: string): ProgrammeBlock[] {
  return layoutProgramme(parseProgrammeScript(script).items);
}

function kinds(blocks: ProgrammeBlock[]): string[] {
  return blocks.map((block) => block.kind);
}

const SOLEMNIZATION = [
  "WEDDING SOLEMNIZATION",
  "BETWEEN",
  "MR. KWAME MENSAH",
  "AND",
  "MISS AKOSUA ADJEI",
  "SATURDAY, 12TH DECEMBER 2026",
  "CALVARY METHODIST CHURCH, ACCRA",
  "FUNCTIONARIES",
  "OFFICIATING MINISTER: REV. DR. K. ANNAN",
  "ORGANIST: MR. KOFI BOATENG",
  "CEREMONY",
  "10:00 AM - Processional",
  "  The bridal party enters to the choir.",
  "10:15 AM - Opening prayer",
  "RECEPTION",
  "1:00 PM - Dinner is served",
].join("\n");

describe("arranging a wedding programme", () => {
  const blocks = layoutOf(SOLEMNIZATION);

  it("opens with a title page rather than seven headings in a row", () => {
    assert.equal(blocks[0]!.kind, "cover");
    const cover = blocks[0]!;
    assert.ok(cover.kind === "cover");
    assert.equal(cover.lines.length, 7);
    assert.deepEqual(
      cover.lines.map((line) => line.role),
      ["title", "connector", "name", "connector", "name", "meta", "meta"]
    );
  });

  it("keeps the couple's names as written, capitals and all", () => {
    const cover = blocks[0]!;
    assert.ok(cover.kind === "cover");
    const names = cover.lines.filter((line) => line.role === "name");
    assert.deepEqual(names.map((line) => line.text), ["MR. KWAME MENSAH", "MISS AKOSUA ADJEI"]);
    assert.ok(names.every((line) => line.shouted), "capitals are flagged for the renderer");
  });

  it("reads the functionaries as a roster of role and name", () => {
    const roster = blocks.find((block) => block.kind === "roster");
    assert.ok(roster?.kind === "roster");
    assert.equal(roster.groups.length, 1);
    assert.equal(roster.groups[0]!.title, undefined);
    assert.deepEqual(
      roster.groups[0]!.people.map((person) => [person.label, person.name]),
      [
        ["OFFICIATING MINISTER", "REV. DR. K. ANNAN"],
        ["ORGANIST", "MR. KOFI BOATENG"],
      ]
    );
  });

  it("signposts the sections that carry the running order", () => {
    const signposts = blocks.filter((block) => block.kind === "signpost");
    assert.deepEqual(
      signposts.map((block) => (block.kind === "signpost" ? block.title : "")),
      ["FUNCTIONARIES", "CEREMONY", "RECEPTION"]
    );
  });

  it("puts the timed items on the clock, with their detail", () => {
    const schedules = blocks.filter((block) => block.kind === "schedule");
    assert.equal(schedules.length, 2);
    const first = schedules[0]!;
    assert.ok(first.kind === "schedule");
    assert.equal(first.entries[0]!.time, "10:00 AM");
    assert.equal(first.entries[0]!.title, "Processional");
    assert.equal(first.entries[0]!.description, "The bridal party enters to the choir.");
    assert.equal(first.entries[1]!.time, "10:15 AM");
  });

  it("reads as a document: cover, people, then the day", () => {
    assert.deepEqual(kinds(blocks), [
      "cover",
      "signpost",
      "roster",
      "signpost",
      "schedule",
      "signpost",
      "schedule",
    ]);
  });
});

describe("nothing is regrouped away", () => {
  /** Everything the blocks would put on the page, as one string. */
  function rendered(blocks: ProgrammeBlock[]): string {
    const parts: string[] = [];
    for (const block of blocks) {
      if (block.kind === "cover") parts.push(...block.lines.map((line) => line.text));
      if (block.kind === "signpost") parts.push(block.title);
      if (block.kind === "roster") {
        for (const group of block.groups) {
          if (group.title) parts.push(group.title);
          parts.push(
            ...group.people.map(
              (person) => `${person.label ?? ""} ${person.name} ${person.notes.join(" ")}`
            )
          );
        }
      }
      if (block.kind === "hymn") {
        parts.push(`${block.time} ${block.cue ?? ""} ${block.title}`);
        parts.push(...block.stanzas.flatMap((stanza) => stanza.lines));
      }
      if (block.kind === "appreciation") {
        if (block.title) parts.push(block.title);
        parts.push(...block.lines);
      }
      if (block.kind === "schedule") {
        parts.push(
          ...block.entries.map((entry) => `${entry.time} ${entry.title} ${entry.description ?? ""}`)
        );
      }
    }
    return parts.join("\n");
  }

  const scripts = [
    SOLEMNIZATION,
    "1:00 PM - Arrival\nCEREMONY\n2:00 PM - Vows\n  Rings are exchanged.\nRECEPTION\n7:00 PM - Dinner",
    "Guest welcome\nCutting of the cake\nFirst dance",
    "PROGRAMME OF EVENTS\n12:30 PM Guests seated\nCEREMONY\n2:00 PM Exchange of vows\nToasts and speeches",
    "OFFICIATING MINISTER\nREV. K. ANNAN\nORGANIST\nMR. BOATENG\n10:00 AM - Processional",
    [
      "OFFICIATING MINISTERS",
      "Rev. Mensah Adjetey",
      "OPENING HYMN",
      "CAPTAIN OF ISRAEL'S HOST",
      "Captain of Israel's host, and Guide",
      "Of all who seek the land above,",
      "Our end, the glory of the Lord.",
      "10:00 AM - Processional",
    ].join("\n"),
    "> A note before anything happens\n# THE QUIET HOUR\n2:00 PM - Vows",
  ];

  it("puts every stored item somewhere on the page", () => {
    for (const script of scripts) {
      const items = parseProgrammeScript(script).items;
      const page = rendered(layoutProgramme(items));
      for (const item of items) {
        // A roster splits `ROLE: Name` into a label and a name, so the check
        // is that every word of the item survived rather than the exact line.
        const written = `${item.time} ${item.title} ${item.description ?? ""}`;
        const spoken = written
          .split(/\s+/)
          .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
          .filter(Boolean);
        for (const word of spoken) {
          assert.ok(
            page.includes(word),
            `"${word}" from "${item.title}" was lost laying out: ${script.slice(0, 40)}…`
          );
        }
      }
    }
  });

  it("keeps a role written above its person as the heading of that person", () => {
    const blocks = layoutOf(
      "OFFICIATING MINISTER\nREV. K. ANNAN\nORGANIST\nMR. BOATENG\n10:00 AM - Processional"
    );
    const roster = blocks.find((block) => block.kind === "roster");
    assert.ok(roster?.kind === "roster");
    assert.deepEqual(
      roster.groups.map((group) => [group.title, group.people.map((person) => person.name)]),
      [
        ["OFFICIATING MINISTER", ["REV. K. ANNAN"]],
        ["ORGANIST", ["MR. BOATENG"]],
      ]
    );
  });
});

describe("roles, people and the lines under them", () => {
  const script = [
    "FUNCTIONARIES",
    "OFFICIATING MINISTERS",
    "Prophet Amos Kpodo",
    "Rev. Mensah Adjetey",
    "GUEST MUSIC MINISTER",
    "Sister Akosua Danso",
    "  Assemblies of God, Adenta",
    "COUNSELLORS",
    "Mr & Mrs Boateng",
    "2:00 PM - Processional",
  ].join("\n");

  const roster = layoutOf(script).find((block) => block.kind === "roster");

  it("heads each list with its role instead of bulleting it like a person", () => {
    assert.ok(roster?.kind === "roster");
    assert.deepEqual(
      roster.groups.map((group) => group.title),
      ["OFFICIATING MINISTERS", "GUEST MUSIC MINISTER", "COUNSELLORS"]
    );
  });

  it("puts the people under the role that introduces them", () => {
    assert.ok(roster?.kind === "roster");
    assert.deepEqual(
      roster.groups.map((group) => group.people.map((person) => person.name)),
      [["Prophet Amos Kpodo", "Rev. Mensah Adjetey"], ["Sister Akosua Danso"], ["Mr & Mrs Boateng"]]
    );
  });

  it("keeps a parish under its minister as a note, not as another person", () => {
    assert.ok(roster?.kind === "roster");
    const guest = roster.groups[1]!.people[0]!;
    assert.deepEqual(guest.notes, ["Assemblies of God, Adenta"]);
  });

  it("leaves the timed item on the clock", () => {
    const schedule = layoutOf(script).find((block) => block.kind === "schedule");
    assert.ok(schedule?.kind === "schedule");
    assert.deepEqual(
      schedule.entries.map((entry) => [entry.time, entry.title]),
      [["2:00 PM", "Processional"]]
    );
  });

  it("does not demote a person to a footnote on a hunch", () => {
    const blocks = layoutOf("OFFICIATING MINISTERS\nProphet Amos Kpodo\nRev. Mensah\n2:00 PM - Vows");
    const people = blocks.find((block) => block.kind === "roster");
    assert.ok(people?.kind === "roster");
    assert.equal(people.groups[0]!.people.length, 2);
    assert.ok(people.groups[0]!.people.every((person) => person.notes.length === 0));
  });
});

describe("the date and the hour stay on the title page", () => {
  const script = [
    "THE WEDDING",
    "OF",
    "JEFFERY OWURAKU AFARI",
    "AND",
    "FRANCISCA CHELSY SERWAAH OPOKU",
    "ON AUGUST 15, 2026",
    "AT 2:00 PM",
    "2:30 PM - Processional",
  ].join("\n");

  const blocks = layoutOf(script);

  it("keeps the hour with the date, under the couple", () => {
    const cover = blocks[0]!;
    assert.ok(cover.kind === "cover");
    assert.deepEqual(
      cover.lines.filter((line) => line.role === "meta").map((line) => line.text),
      ["ON AUGUST 15, 2026", "AT 2:00 PM"]
    );
  });

  it("never splits a clock into a role and a person", () => {
    // `AT 2:00 PM` was being read as the role "AT 2" held by "00 PM", which
    // threw the ceremony hour out of the cover and into a roster row.
    assert.ok(!blocks.some((block) => block.kind === "roster"));
    const cover = blocks[0]!;
    assert.ok(cover.kind === "cover");
    assert.ok(cover.lines.some((line) => line.text === "AT 2:00 PM"));
  });

  it("shows the time exactly as it was written", () => {
    const cover = blocks[0]!;
    assert.ok(cover.kind === "cover");
    const hour = cover.lines.find((line) => line.text.includes("2:00"));
    assert.equal(hour?.text, "AT 2:00 PM");
  });

  it("still gives the couple both their names, and only theirs", () => {
    const cover = blocks[0]!;
    assert.ok(cover.kind === "cover");
    assert.deepEqual(
      cover.lines.filter((line) => line.role === "name").map((line) => line.text),
      ["JEFFERY OWURAKU AFARI", "FRANCISCA CHELSY SERWAAH OPOKU"]
    );
  });

  it("leaves the timed item on the clock, not on the cover", () => {
    const schedule = blocks.find((block) => block.kind === "schedule");
    assert.ok(schedule?.kind === "schedule");
    assert.deepEqual(schedule.entries, [
      { id: schedule.entries[0]!.id, time: "2:30 PM", title: "Processional" },
    ]);
  });

  it("still reads a real role and name apart", () => {
    const roster = layoutOf(
      "OFFICIATING MINISTER: REV. ANNAN\nORGANIST: MR. BOATENG\n2:00 PM - Vows"
    ).find((block) => block.kind === "roster");
    assert.ok(roster?.kind === "roster");
    const first = roster.groups[0]!.people[0]!;
    assert.equal(first.label, "OFFICIATING MINISTER");
    assert.equal(first.name, "REV. ANNAN");
  });
});

describe("what is not a title page", () => {
  it("leaves a plain list of items as a schedule", () => {
    const blocks = layoutOf("Guest welcome\nCutting of the cake\nFirst dance");
    assert.deepEqual(kinds(blocks), ["schedule"]);
    const schedule = blocks[0]!;
    assert.ok(schedule.kind === "schedule");
    assert.equal(schedule.entries.length, 3);
    assert.ok(schedule.entries.every((entry) => entry.time === ""));
  });

  it("does not read a single heading as a cover", () => {
    const blocks = layoutOf("CEREMONY\n2:00 PM - Vows\n4:00 PM - Photos");
    assert.deepEqual(kinds(blocks), ["signpost", "schedule"]);
  });

  it("does not read a Chinese programme as a title page", () => {
    const blocks = layoutOf("婚礼仪式\n晚宴\n自助餐\n14:00 交换誓言");
    assert.ok(!blocks.some((block) => block.kind === "cover"));
  });

  it("needs a date or a connector before it will set a cover", () => {
    // Three shouted items and nothing that dates or joins them: a running
    // order written in capitals, not a title page.
    const blocks = layoutOf("GUEST WELCOME\nCUTTING OF THE CAKE\nFIRST DANCE\n8:00 PM - Dancing");
    assert.ok(!blocks.some((block) => block.kind === "cover"));
  });
});

describe("the rules stop multiplying", () => {
  it("never sets two signposts in a row from one run of capitals", () => {
    const blocks = layoutOf(
      ["THE ORDER OF SERVICE", "PROCESSIONAL", "OPENING HYMN", "SERMON", "2:00 PM - Vows"].join("\n")
    );
    const names = kinds(blocks);
    for (let index = 1; index < names.length; index += 1) {
      assert.ok(
        !(names[index] === "signpost" && names[index - 1] === "signpost"),
        `two signposts in a row: ${names.join(", ")}`
      );
    }
    assert.equal(names.filter((name) => name === "signpost").length, 1);
  });

  it("sets a run of shouted lines under a heading as its entries", () => {
    const blocks = layoutOf("CEREMONY\nPROCESSIONAL\nOPENING HYMN\n2:00 PM - Vows");
    assert.deepEqual(kinds(blocks), ["signpost", "schedule"]);
    const schedule = blocks[1]!;
    assert.ok(schedule.kind === "schedule");
    assert.deepEqual(
      schedule.entries.map((entry) => entry.title),
      ["PROCESSIONAL", "OPENING HYMN", "Vows"]
    );
  });
});

describe("rosters found without a heading", () => {
  it("reads a run of `role: name` lines as a roster", () => {
    const blocks = layoutOf(
      "Chairman: Mr. Osei\nMaster of Ceremonies: Nana Yaw\n3:00 PM - Speeches"
    );
    assert.deepEqual(kinds(blocks), ["roster", "schedule"]);
  });

  it("does not read a clock as a label and a name", () => {
    const blocks = layoutOf("10:00 Processional\n10:30 Hymn");
    assert.deepEqual(kinds(blocks), ["schedule"]);
    const schedule = blocks[0]!;
    assert.ok(schedule.kind === "schedule");
    assert.equal(schedule.entries[0]!.time, "10:00");
  });
});

/**
 * The bug that started this: an order of service that opens with its
 * ministers and then sings a hymn. Every line of it is time-less and most of
 * them are in capitals, so the roster reader claimed the whole page — and the
 * hymn's six lines came out as footnotes under a person called `Captain of
 * Israel's host, and Guide`.
 */
describe("a hymn is not a list of people", () => {
  const script = [
    "OFFICIATING MINISTERS",
    "Rev. Mensah Adjetey",
    "COUNSELORS",
    "Mr & Mrs Boateng",
    "OPENING HYMN",
    "CAPTAIN OF ISRAEL'S HOST",
    "Captain of Israel's host, and Guide",
    "Of all who seek the land above,",
    "Beneath Thy shadow we abide,",
    "The cloud of Thy protecting love;",
    "Our strength, Thy grace, our rule, Thy Word;",
    "Our end, the glory of the Lord.",
    "10:00 AM - Processional",
  ].join("\n");

  const blocks = layoutOf(script);

  it("reads as a roster, a signpost, the hymn, and then the clock", () => {
    // The hymn is its own block. Set on the running order it was one bullet on
    // the same rail as `Order of photography`, with six lines of verse
    // squeezed into the footnote slot under it.
    assert.deepEqual(kinds(blocks), ["roster", "signpost", "hymn", "schedule"]);
  });

  it("keeps the roles as the headings of the people under them", () => {
    const roster = blocks[0]!;
    assert.ok(roster.kind === "roster");
    assert.deepEqual(
      roster.groups.map((group) => [group.title, group.people.map((person) => person.name)]),
      [
        ["OFFICIATING MINISTERS", ["Rev. Mensah Adjetey"]],
        ["COUNSELORS", ["Mr & Mrs Boateng"]],
      ]
    );
  });

  it("never lets a line of the hymn become a person", () => {
    const roster = blocks[0]!;
    assert.ok(roster.kind === "roster");
    const named = roster.groups.flatMap((group) =>
      group.people.flatMap((person) => [person.name, ...person.notes])
    );
    assert.ok(
      !named.some((line) => line.includes("Israel")),
      `a verse was set as a person: ${named.join(" | ")}`
    );
  });

  it("sets the hymn as a hymn, with every line of its verse", () => {
    const hymn = blocks[2]!;
    assert.ok(hymn.kind === "hymn");
    assert.equal(hymn.title, "CAPTAIN OF ISRAEL'S HOST");
    assert.equal(hymn.stanzas.length, 1);
    assert.equal(hymn.stanzas[0]!.lines.length, 6);
    assert.equal(hymn.stanzas[0]!.lines[0], "Captain of Israel's host, and Guide");
    assert.equal(hymn.stanzas[0]!.lines[5], "Our end, the glory of the Lord.");
  });

  it("leaves the processional on the clock behind the hymn", () => {
    const schedule = blocks[3]!;
    assert.ok(schedule.kind === "schedule");
    const last = schedule.entries[schedule.entries.length - 1]!;
    assert.deepEqual([last.time, last.title], ["10:00 AM", "Processional"]);
  });

  it("sets exactly one signpost, and it is the one the organizer wrote", () => {
    const signposts = blocks.filter((block) => block.kind === "signpost");
    assert.deepEqual(
      signposts.map((block) => (block.kind === "signpost" ? block.title : "")),
      ["OPENING HYMN"]
    );
  });
});

/**
 * An order of service that never mentions a clock — the commonest shape a
 * Ghanaian church programme arrives in. Every line is time-less, so the
 * "one signpost per run" rule swallowed all of them: forty-seven bullets in a
 * single column under one heading.
 */
describe("a programme with no clock in it still reads as a document", () => {
  const script = [
    "FUNCTIONARIES",
    "OFFICIATING MINISTERS",
    "Rev. Selina Klu-Abini, Area Supervising Minister",
    "GUEST MINISTERS",
    "Apostle Elias Hagan",
    "Rev. Jesse Hagan",
    "COUNSELORS",
    "Deacon Dr. & Mrs. Omaboe",
    "ORDER OF SERVICE",
    "Musical Interlude / Arrival of Guests",
    "Opening Prayer",
    "ORDER OF PHOTOGRAPHY",
    "Wedding Party",
    "Both Families",
  ].join("\n");

  const blocks = layoutOf(script);

  it("sets every heading the organizer wrote, not just the first", () => {
    const signposts = blocks
      .filter((block) => block.kind === "signpost")
      .map((block) => (block.kind === "signpost" ? block.title : ""));
    assert.deepEqual(signposts, ["FUNCTIONARIES", "ORDER OF SERVICE", "ORDER OF PHOTOGRAPHY"]);
  });

  it("groups the people under the role that announces them", () => {
    const roster = blocks.find((block) => block.kind === "roster");
    assert.ok(roster?.kind === "roster");
    assert.deepEqual(
      roster.groups.map((group) => group.title),
      ["OFFICIATING MINISTERS", "GUEST MINISTERS", "COUNSELORS"]
    );
  });

  it("keeps a minister whose title ran long as a person, not as a footnote", () => {
    const roster = blocks.find((block) => block.kind === "roster");
    assert.ok(roster?.kind === "roster");
    const first = roster.groups[0]!;
    assert.equal(first.title, "OFFICIATING MINISTERS");
    assert.deepEqual(
      first.people.map((person) => person.name),
      ["Rev. Selina Klu-Abini, Area Supervising Minister"]
    );
  });

  it("keeps each section's own lines under it", () => {
    const schedules = blocks.filter((block) => block.kind === "schedule");
    assert.deepEqual(
      schedules.map((block) =>
        block.kind === "schedule" ? block.entries.map((entry) => entry.title) : []
      ),
      [
        ["Musical Interlude / Arrival of Guests", "Opening Prayer"],
        ["Wedding Party", "Both Families"],
      ]
    );
  });
});

describe("the organizer's marks reach the page", () => {
  it("sets a marked heading as a signpost even in ordinary case", () => {
    const blocks = layoutOf("# the quiet hour\n2:00 PM - Vows");
    assert.deepEqual(kinds(blocks), ["signpost", "schedule"]);
    const signpost = blocks[0]!;
    assert.ok(signpost.kind === "signpost");
    assert.equal(signpost.title, "the quiet hour");
  });

  it("sets a marked subscript as detail rather than as a signpost", () => {
    const blocks = layoutOf("> PLEASE SILENCE YOUR PHONES\n2:00 PM - Vows");
    assert.deepEqual(kinds(blocks), ["schedule"]);
    const schedule = blocks[0]!;
    assert.ok(schedule.kind === "schedule");
    assert.equal(schedule.entries[0]!.note, true);
    assert.equal(schedule.entries[0]!.title, "PLEASE SILENCE YOUR PHONES");
  });

  it("keeps a marked subscript out of a roster it would otherwise join", () => {
    const blocks = layoutOf(
      "> MINISTERS ARE STILL BEING CONFIRMED\nOFFICIATING MINISTER: REV. ANNAN\nORGANIST: MR. BOATENG\n2:00 PM - Vows"
    );
    const roster = blocks.find((block) => block.kind === "roster");
    assert.ok(roster?.kind === "roster");
    const named = roster.groups.flatMap((group) => group.people.map((person) => person.name));
    assert.deepEqual(named, ["REV. ANNAN", "MR. BOATENG"]);
  });
});

/**
 * The page a real church programme produces, end to end.
 *
 * Three different kinds of thing were arriving on one rail: a hymn's verses, a
 * photographer's shot list, and the hosts' closing thank-you — each set as a
 * bullet with a border down its left, indistinguishable from the next. They
 * are read differently and they are now laid out differently.
 */
describe("a hymn, a shot list and a thank-you are three different things", () => {
  const script = [
    "ORDER OF SERVICE",
    "OPENING HYMN",
    "CAPTAIN OF ISRAEL'S HOST",
    "Captain of Israel's host, and Guide",
    "Of all who seek the land above,",
    "Beneath Thy shadow we abide,",
    "The cloud of Thy protecting love;",
    "ORDER OF PHOTOGRAPHY",
    "Couple with parents",
    "Couple with bridal party",
    "Couple with the congregation",
    "APPRECIATION",
    "WE ARE HONOURED TO CELEBRATE THIS SPECIAL DAY WITH YOU.",
    "THANK YOU FOR YOUR PRESENCE, PRAYERS, AND LOVE.",
  ].join("\n");

  const blocks = layoutOf(script);

  it("lifts the hymn off the running order and closes with the thank-you", () => {
    assert.deepEqual(kinds(blocks), [
      "signpost",
      "hymn",
      "signpost",
      "schedule",
      "appreciation",
    ]);
  });

  it("gives the hymn the cue the organizer announced it with", () => {
    const hymn = blocks.find((block) => block.kind === "hymn");
    assert.ok(hymn?.kind === "hymn");
    assert.equal(hymn.cue, "OPENING HYMN");
    assert.equal(hymn.title, "CAPTAIN OF ISRAEL'S HOST");
    assert.equal(hymn.stanzas[0]!.lines.length, 4);
  });

  it("keeps the photography list as a plain list, not as verse", () => {
    const schedule = blocks.find((block) => block.kind === "schedule");
    assert.ok(schedule?.kind === "schedule");
    assert.deepEqual(schedule.entries.map((entry) => entry.title), [
      "Couple with parents",
      "Couple with bridal party",
      "Couple with the congregation",
    ]);
  });

  it("gathers the closing words into one card under its own heading", () => {
    const closing = blocks[blocks.length - 1]!;
    assert.ok(closing.kind === "appreciation");
    assert.equal(closing.title, "APPRECIATION");
    assert.deepEqual(closing.lines, [
      "WE ARE HONOURED TO CELEBRATE THIS SPECIAL DAY WITH YOU.",
      "THANK YOU FOR YOUR PRESENCE, PRAYERS, AND LOVE.",
    ]);
  });

  it("leaves not one word of any of the three out", () => {
    const page = [
      ...blocks.flatMap((block) => {
        if (block.kind === "hymn") {
          return [block.cue ?? "", block.title, ...block.stanzas.flatMap((s) => s.lines)];
        }
        if (block.kind === "appreciation") return [block.title, ...block.lines];
        if (block.kind === "schedule") return block.entries.map((e) => e.title);
        if (block.kind === "signpost") return [block.title];
        return [];
      }),
    ].join("\n");
    for (const line of script.split("\n")) {
      assert.ok(page.includes(line), `"${line}" was lost`);
    }
  });
});

describe("telling a hymn from a thing that happens", () => {
  it("keeps a verse split across stanzas as separate stanzas", () => {
    const blocks = layoutOf(
      [
        "HOW GREAT THOU ART",
        "  O Lord my God, when I in awesome wonder,",
        "  Consider all the worlds Thy hands have made;",
        "",
        "  Then sings my soul, my Saviour God, to Thee;",
        "  How great Thou art, how great Thou art!",
      ].join("\n")
    );
    const hymn = blocks.find((block) => block.kind === "hymn");
    assert.ok(hymn?.kind === "hymn");
    assert.equal(hymn.stanzas.length, 2);
    assert.deepEqual(hymn.stanzas.map((stanza) => stanza.lines.length), [2, 2]);
  });

  it("leaves an item with a plain note under it on the clock", () => {
    const blocks = layoutOf("2:00 PM - Vows\n  Rings are exchanged.");
    assert.deepEqual(kinds(blocks), ["schedule"]);
  });

  it("does not read a photographer's shot list as a hymn", () => {
    const blocks = layoutOf(
      "ORDER OF PHOTOGRAPHY\nCouple with parents\nCouple with bridal party"
    );
    assert.ok(!blocks.some((block) => block.kind === "hymn"));
  });
});

describe("the hosts' closing words", () => {
  it("stands alone even when the organizer wrote no APPRECIATION heading", () => {
    // Built as items rather than as a script: a bare closing sentence is
    // folded into the line above it while the document is being read, so this
    // is the layout's own contract for the case where it arrives on its own.
    const blocks = layoutProgramme([
      { id: "a", time: "2:00 PM", title: "Exchange of vows" },
      { id: "b", time: "", title: "THANK YOU FOR YOUR PRESENCE, PRAYERS, AND LOVE." },
    ]);
    const closing = blocks[blocks.length - 1]!;
    assert.ok(closing.kind === "appreciation");
    // Already a sentence, so it is the message rather than the card's heading —
    // set as a heading it would come out in tracked capitals.
    assert.equal(closing.title, "");
    assert.deepEqual(closing.lines, ["THANK YOU FOR YOUR PRESENCE, PRAYERS, AND LOVE."]);
  });

  it("never claims a thank-you that happens at a time", () => {
    // `4:15 PM - Vote of thanks` is somebody standing up to speak, and it
    // belongs on the clock with everything else.
    const blocks = layoutOf("2:00 PM - Vows\n4:15 PM - Vote of thanks\n5:00 PM - Dinner");
    assert.deepEqual(kinds(blocks), ["schedule"]);
  });

  it("never swallows the programme above it", () => {
    const script = [
      "CEREMONY",
      "Processional",
      "Exchange of vows",
      "Signing of the register",
      "Recessional",
      "APPRECIATION",
      "Thank you for standing with us.",
    ].join("\n");
    const closing = layoutOf(script)[layoutOf(script).length - 1]!;
    assert.ok(closing.kind === "appreciation");
    assert.deepEqual(closing.lines, ["Thank you for standing with us."]);
  });

  it("leaves a roster of the people to thank as a roster", () => {
    const blocks = layoutOf(
      "OFFICIATING MINISTERS\nRev. Mensah Adjetey\nRev. Dr. K. Annan"
    );
    assert.ok(!blocks.some((block) => block.kind === "appreciation"));
  });
});

describe("the layout is safe to render", () => {
  it("gives back nothing for nothing", () => {
    assert.deepEqual(layoutProgramme([]), []);
  });

  it("is stable — the same items always lay out the same way", () => {
    const items = parseProgrammeScript(SOLEMNIZATION).items;
    assert.deepEqual(layoutProgramme(items), layoutProgramme(items));
  });

  it("gives every block a key that is unique on the page", () => {
    const ids = layoutOf(SOLEMNIZATION).map((block) => block.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
