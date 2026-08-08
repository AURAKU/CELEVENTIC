import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SEATING_MAX_MATCHES,
  SEATING_OUTCOME_COPY,
  buildSeatingMatch,
  effectiveMaxMatches,
  effectiveMinQuery,
  normalizeNameKey,
  partyLabel,
  scorePartyNameMatch,
  selectSeatingOutcome,
  suggestPartyLabels,
  SEATING_SUGGESTION_LIMIT,
  validateQueryLength,
  type CandidateGuest,
  type CandidateParty,
} from "../seating-finder";

function guest(over: Partial<CandidateGuest> & { name: string }): CandidateGuest {
  return {
    id: `g_${over.name.replace(/\s+/g, "_")}`,
    invitationId: null,
    plusOnes: 0,
    seatingAssignments: [],
    ...over,
  };
}

function party(over: Partial<CandidateParty> & { invitationId: string; partyName: string }): CandidateParty {
  return { guests: [], ...over };
}

const RECEPTION = {
  tableNumber: "12",
  seatLabel: "4",
  zone: "Garden marquee",
  seatingPlan: { planType: "RECEPTION" },
};
const CEREMONY = {
  tableNumber: "Row C",
  seatLabel: "7",
  zone: null,
  seatingPlan: { planType: "CEREMONY" },
};

describe("normalizeNameKey", () => {
  it("folds case, accents, punctuation and spacing to one key", () => {
    assert.equal(normalizeNameKey("  Chiamaka   O'Brien-Éze  "), "chiamaka o brien eze");
    assert.equal(normalizeNameKey("JOSÉ MARÍA"), "jose maria");
  });

  it("gives the same key regardless of how the name was typed", () => {
    assert.equal(normalizeNameKey("Mr. & Mrs. Okafor"), "mr mrs okafor");
    assert.equal(normalizeNameKey("MR   MRS   OKAFOR"), "mr mrs okafor");
  });

  it("collapses an empty or symbol-only name to an empty key", () => {
    assert.equal(normalizeNameKey("   "), "");
    assert.equal(normalizeNameKey("!!!"), "");
  });
});

describe("query length gating", () => {
  it("enforces a floor per mode that configuration cannot lower", () => {
    assert.equal(effectiveMinQuery("ADMISSION_CODE", 1), 4);
    assert.equal(effectiveMinQuery("GUEST_NAME", 1), 3);
    assert.equal(effectiveMinQuery("GUEST_NAME", null), 3);
    assert.equal(effectiveMinQuery("GUEST_NAME", Number.NaN), 3);
  });

  it("lets an organizer raise the floor, up to a sane ceiling", () => {
    assert.equal(effectiveMinQuery("GUEST_NAME", 6), 6);
    assert.equal(effectiveMinQuery("GUEST_NAME", 999), 24);
  });

  it("rejects a short query before any database read", () => {
    const result = validateQueryLength("GUEST_NAME", "ad", 3);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.outcome.status, "query_too_short");
      assert.equal(result.outcome.minQueryLength, 3);
    }
  });

  it("accepts a query at exactly the minimum", () => {
    assert.equal(validateQueryLength("GUEST_NAME", "ada", 3).ok, true);
  });

  it("caps how many candidates may ever be considered", () => {
    assert.equal(effectiveMaxMatches(999), SEATING_MAX_MATCHES);
    assert.equal(effectiveMaxMatches(0), 1);
    assert.equal(effectiveMaxMatches(null), 3);
  });
});

describe("scoring refuses to be an enumeration oracle", () => {
  const okafor = party({
    invitationId: "inv_1",
    partyName: "The Okafor Family",
    guests: [guest({ name: "Chidi Okafor" }), guest({ name: "Ngozi Okafor" })],
  });

  it("scores an exact key match highest", () => {
    assert.equal(scorePartyNameMatch(okafor, normalizeNameKey("Chidi Okafor")), 100);
  });

  it("scores a full multi-token match above a single token", () => {
    const two = scorePartyNameMatch(okafor, "chidi okafor");
    const one = scorePartyNameMatch(okafor, "okafor");
    assert.ok(two > one, `expected ${two} > ${one}`);
  });

  it("does not match on a single loose letter", () => {
    assert.equal(scorePartyNameMatch(okafor, "c"), 0);
    assert.equal(scorePartyNameMatch(okafor, "ok"), 0);
  });

  it("does not match a completely different name", () => {
    assert.equal(scorePartyNameMatch(okafor, "adebayo williams"), 0);
  });

  it("does not match an empty query", () => {
    assert.equal(scorePartyNameMatch(okafor, ""), 0);
  });
});

describe("selectSeatingOutcome returns one party or nothing", () => {
  const okafor = party({
    invitationId: "inv_1",
    partyName: "The Okafor Family",
    guests: [guest({ name: "Chidi Okafor", seatingAssignments: [RECEPTION, CEREMONY] })],
  });
  const adeleke = party({
    invitationId: "inv_2",
    partyName: "The Adeleke Family",
    guests: [guest({ name: "Tunde Adeleke", seatingAssignments: [RECEPTION] })],
  });

  it("returns no_match rather than a nearest guess", () => {
    const outcome = selectSeatingOutcome([okafor, adeleke], "someone else entirely", 3);
    assert.equal(outcome.status, "no_match");
  });

  it("returns a single match with its seat", () => {
    const outcome = selectSeatingOutcome([okafor, adeleke], normalizeNameKey("Chidi Okafor"), 3);
    assert.equal(outcome.status, "ok");
    if (outcome.status === "ok") {
      assert.equal(outcome.match.tableNumber, "12");
      assert.equal(outcome.match.seatLabel, "4");
      assert.equal(outcome.match.ceremonyRowLabel, "Row C");
    }
  });

  it("reports a tie as a count only, never as a list of names", () => {
    const twinA = party({
      invitationId: "inv_a",
      partyName: "Emeka Nwosu",
      guests: [guest({ name: "Emeka Nwosu", seatingAssignments: [RECEPTION] })],
    });
    const twinB = party({
      invitationId: "inv_b",
      partyName: "Emeka Nwosu",
      guests: [guest({ name: "Emeka Nwosu", seatingAssignments: [RECEPTION] })],
    });

    const outcome = selectSeatingOutcome([twinA, twinB], "emeka nwosu", 3);
    assert.equal(outcome.status, "ambiguous");
    if (outcome.status === "ambiguous") {
      assert.equal(outcome.matchCount, 2);
      // The serialized outcome must not carry any guest identity.
      assert.doesNotMatch(JSON.stringify(outcome), /emeka|nwosu|inv_/i);
    }
  });

  it("never returns a list of parties in any code path", () => {
    const outcome = selectSeatingOutcome([okafor, adeleke], "the", 3);
    assert.ok(!("matches" in outcome), "no code path may return a list");
  });
});

describe("party isolation", () => {
  it("shows only members belonging to the matched party's own invitation", () => {
    const mixed = party({
      invitationId: "inv_1",
      partyName: "The Okafor Family",
      guests: [
        guest({ name: "Chidi Okafor", invitationId: "inv_1", seatingAssignments: [RECEPTION] }),
        guest({ name: "Ngozi Okafor", invitationId: "inv_1" }),
        // A mislinked row from another party must never surface.
        guest({ name: "Someone Else", invitationId: "inv_999", seatingAssignments: [CEREMONY] }),
      ],
    });

    const match = buildSeatingMatch(mixed);
    assert.deepEqual(match.partyMembers, ["Chidi Okafor", "Ngozi Okafor"]);
    assert.doesNotMatch(JSON.stringify(match), /Someone Else/);
  });

  it("keeps guests whose invitation link is not yet set", () => {
    const match = buildSeatingMatch(
      party({
        invitationId: "inv_1",
        partyName: "Party",
        guests: [guest({ name: "Unlinked Guest", invitationId: null })],
      })
    );
    assert.deepEqual(match.partyMembers, ["Unlinked Guest"]);
  });

  it("sums plus-ones across the party and never goes negative", () => {
    const match = buildSeatingMatch(
      party({
        invitationId: "inv_1",
        partyName: "Party",
        guests: [
          guest({ name: "A", invitationId: "inv_1", plusOnes: 2 }),
          guest({ name: "B", invitationId: "inv_1", plusOnes: -5 }),
        ],
      })
    );
    assert.equal(match.plusOnes, 2);
  });

  it("falls back to the primary guest's name when the party has no name", () => {
    const match = buildSeatingMatch(
      party({ invitationId: "inv_1", partyName: "   ", guests: [guest({ name: "Solo Guest" })] })
    );
    assert.equal(match.partyName, "Solo Guest");
  });

  it("leaves the ceremony row blank when the event has no ceremony plan", () => {
    const match = buildSeatingMatch(
      party({
        invitationId: "inv_1",
        partyName: "Reception only",
        guests: [guest({ name: "A", seatingAssignments: [RECEPTION] })],
      })
    );
    assert.equal(match.tableNumber, "12");
    // Must not echo the dinner table back as a ceremony row.
    assert.equal(match.ceremonyRowLabel, null);
    assert.equal(match.ceremonySeatLabel, null);
  });

  it("keeps the two stages apart when a guest sits in both", () => {
    const match = buildSeatingMatch(
      party({
        invitationId: "inv_1",
        partyName: "Both stages",
        guests: [guest({ name: "A", seatingAssignments: [CEREMONY, RECEPTION] })],
      })
    );
    assert.equal(match.tableNumber, "12");
    assert.equal(match.ceremonyRowLabel, "Row C");
  });

  it("returns nulls rather than throwing when nobody has a seat yet", () => {
    const match = buildSeatingMatch(
      party({ invitationId: "inv_1", partyName: "Unseated", guests: [guest({ name: "A" })] })
    );
    assert.equal(match.tableNumber, null);
    assert.equal(match.seatLabel, null);
    assert.equal(match.zone, null);
  });
});

describe("the shape of a match", () => {
  it("carries the guest-facing fields only — no internal ids or contacts", () => {
    const match = buildSeatingMatch(
      party({
        invitationId: "inv_secret",
        partyName: "The Okafor Family",
        admissionCode: "123456",
        guests: [
          guest({
            name: "Chidi Okafor",
            id: "guest_secret_id",
            invitationId: "inv_secret",
            seatingAssignments: [RECEPTION],
          }),
        ],
      })
    );

    const keys = Object.keys(match).sort();
    assert.deepEqual(keys, [
      "admissionCode",
      "ceremonyRowLabel",
      "ceremonySeatLabel",
      "partyMembers",
      "partyName",
      "plusOnes",
      "seatLabel",
      "tableNumber",
      "zone",
    ]);

    assert.equal(match.admissionCode, "123456");
    const json = JSON.stringify(match);
    assert.doesNotMatch(json, /inv_secret|guest_secret_id/);
    assert.doesNotMatch(json, /@/, "no email may appear in a seating match");
  });

  it("omits admissionCode when the party has no live pass", () => {
    const match = buildSeatingMatch(
      party({
        invitationId: "inv_1",
        partyName: "No pass yet",
        guests: [guest({ name: "A" })],
      })
    );
    assert.equal(match.admissionCode, null);
  });
});

describe("guest-facing copy", () => {
  it("explains every non-ok outcome without technical language", () => {
    for (const status of ["query_too_short", "no_match", "ambiguous", "disabled", "rate_limited"] as const) {
      const copy = SEATING_OUTCOME_COPY[status];
      assert.ok(copy.length > 0, status);
      assert.doesNotMatch(copy, /error|invalid|null|undefined|4\d\d/i, status);
    }
  });
});

describe("suggesting names while a guest types", () => {
  const LIST = [
    party({
      invitationId: "inv_1",
      partyName: "Kofi Mensah-Boateng",
      guests: [guest({ name: "Kofi Mensah-Boateng" }), guest({ name: "Adjoa Mensah-Boateng" })],
    }),
    party({
      invitationId: "inv_2",
      partyName: "Kofi Asante",
      guests: [guest({ name: "Kofi Asante" })],
    }),
    party({
      invitationId: "inv_3",
      partyName: "Ama Darko",
      guests: [guest({ name: "Ama Darko" })],
    }),
    party({
      invitationId: "inv_4",
      partyName: "",
      guests: [guest({ name: "Kofi Owusu" })],
    }),
  ];

  it("offers the names a guest was reaching for", () => {
    // The complaint that started this: "kofi" returned nothing at all.
    assert.deepEqual(suggestPartyLabels(LIST, "kofi"), [
      "Kofi Asante",
      "Kofi Mensah-Boateng",
      "Kofi Owusu",
    ]);
  });

  it("falls back to the guest's own name when the invitation has no label", () => {
    assert.ok(suggestPartyLabels(LIST, "owusu").includes("Kofi Owusu"));
  });

  it("narrows as more is typed", () => {
    assert.deepEqual(suggestPartyLabels(LIST, "kofi asa"), ["Kofi Asante"]);
  });

  it("matches a guest inside the party, not only the party's label", () => {
    assert.deepEqual(suggestPartyLabels(LIST, "adjoa"), ["Kofi Mensah-Boateng"]);
  });

  it("folds case, accents and punctuation the same way a lookup does", () => {
    assert.deepEqual(suggestPartyLabels(LIST, normalizeNameKey("  MENSAH  ")), [
      "Kofi Mensah-Boateng",
    ]);
  });

  it("never lists the same party twice", () => {
    const twice = [LIST[0]!, party({ invitationId: "inv_dup", partyName: "kofi mensah-boateng" })];
    assert.equal(suggestPartyLabels(twice, "kofi").length, 1);
  });

  it("gives back at most five, however many match", () => {
    const crowd = Array.from({ length: 40 }, (_, i) =>
      party({ invitationId: `inv_${i}`, partyName: `Kwame Number ${i}` })
    );
    assert.equal(suggestPartyLabels(crowd, "kwame").length, SEATING_SUGGESTION_LIMIT);
  });

  it("is prefix-anchored, never fuzzy", () => {
    // Substring and near-miss matching on a public endpoint is an enumeration
    // oracle: it answers "is there anyone whose name contains…".
    assert.deepEqual(suggestPartyLabels(LIST, "ofi"), []);
    assert.deepEqual(suggestPartyLabels(LIST, "kofy"), []);
  });

  it("says nothing at all for an empty query", () => {
    assert.deepEqual(suggestPartyLabels(LIST, ""), []);
    assert.deepEqual(suggestPartyLabels(LIST, "   "), []);
  });

  it("returns labels and nothing else — no seat, no member, no identifier", () => {
    const seated = party({
      invitationId: "inv_secret",
      partyName: "Kofi Mensah-Boateng",
      guests: [
        guest({
          name: "Kofi Mensah-Boateng",
          invitationId: "inv_secret",
          plusOnes: 2,
          seatingAssignments: [RECEPTION, CEREMONY],
        }),
      ],
    });
    const json = JSON.stringify(suggestPartyLabels([seated], "kofi"));
    assert.equal(json, JSON.stringify(["Kofi Mensah-Boateng"]));
    assert.doesNotMatch(json, /inv_secret|Garden marquee|Row C/);
    assert.doesNotMatch(json, /@/);
  });

  it("reveals no name a successful lookup would have withheld", () => {
    // The rule that makes the feature safe: a suggestion is the same label
    // the finder already prints on a match.
    for (const candidate of LIST) {
      const labels = suggestPartyLabels([candidate], normalizeNameKey(partyLabel(candidate)));
      if (labels.length === 0) continue;
      assert.equal(labels[0], buildSeatingMatch(candidate).partyName);
    }
  });
});
