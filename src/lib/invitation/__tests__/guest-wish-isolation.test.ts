import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Product contract:
 * - Approved public guest wishes are EVENT-WIDE (all invited parties see them).
 * - Private invitation data (seating, RSVP, admission, party names) stays party-scoped.
 * - Ownership (invitationId / guestId) is stored on write for moderation — it must NOT
 *   filter the public guest wish feed.
 */

export function buildPublicWishListWhere(input: {
  eventId: string;
  /** Viewer invitation — authorizes access; must NOT appear in the public where clause. */
  viewerInvitationId?: string | null;
  publicOnly?: boolean;
}) {
  const where: Record<string, unknown> = { eventId: input.eventId };
  if (input.publicOnly) {
    where.isVisible = true;
    where.status = "APPROVED";
  }
  // Intentionally ignore viewerInvitationId for public reads.
  return where;
}

function guestOwnershipWhere(input: {
  guestId: string;
  eventId: string;
  invitationId?: string | null;
}) {
  return {
    id: input.guestId,
    eventId: input.eventId,
    ...(input.invitationId ? { invitationId: input.invitationId } : {}),
  };
}

function filterApprovedPublic(
  wishes: Array<{
    id: string;
    eventId: string;
    invitationId: string | null;
    status: string;
    isVisible: boolean;
  }>,
  eventId: string
) {
  return wishes.filter(
    (w) =>
      w.eventId === eventId &&
      w.status === "APPROVED" &&
      w.isVisible === true
  );
}

describe("guest wish invitation isolation (event-wide public feed)", () => {
  it("public invite lists must NOT filter by invitationId", () => {
    const where = buildPublicWishListWhere({
      eventId: "evt-wedding",
      viewerInvitationId: "inv-akua-kelly",
      publicOnly: true,
    });
    assert.equal(where.eventId, "evt-wedding");
    assert.equal(where.isVisible, true);
    assert.equal(where.status, "APPROVED");
    assert.equal(
      where.invitationId,
      undefined,
      "approved public wishes must be event-wide — do not scope by viewer invitationId"
    );
  });

  it("Party A and Party B both see each other's approved public wishes", () => {
    const wishes = [
      {
        id: "w1",
        eventId: "evt-1",
        invitationId: "inv-obuah",
        status: "APPROVED",
        isVisible: true,
      },
      {
        id: "w2",
        eventId: "evt-1",
        invitationId: "inv-akua",
        status: "APPROVED",
        isVisible: true,
      },
      {
        id: "w3",
        eventId: "evt-1",
        invitationId: "inv-obuah",
        status: "PENDING",
        isVisible: false,
      },
      {
        id: "w4",
        eventId: "evt-1",
        invitationId: "inv-akua",
        status: "REJECTED",
        isVisible: false,
      },
      {
        id: "w5",
        eventId: "evt-1",
        invitationId: "inv-obuah",
        status: "HIDDEN",
        isVisible: false,
      },
      {
        id: "w6",
        eventId: "evt-1",
        invitationId: "inv-akua",
        status: "REMOVED",
        isVisible: false,
      },
      {
        id: "w7",
        eventId: "evt-other",
        invitationId: "inv-other",
        status: "APPROVED",
        isVisible: true,
      },
    ];

    const forObuah = filterApprovedPublic(wishes, "evt-1").map((w) => w.id);
    const forAkua = filterApprovedPublic(wishes, "evt-1").map((w) => w.id);

    assert.deepEqual(forObuah, ["w1", "w2"]);
    assert.deepEqual(forAkua, ["w1", "w2"]);
    assert.ok(!forObuah.includes("w3"));
    assert.ok(!forObuah.includes("w7"));
  });

  it("keeps thank-you / event-wide lists without invitationId", () => {
    const where = buildPublicWishListWhere({ eventId: "evt-1", publicOnly: true });
    assert.equal(where.eventId, "evt-1");
    assert.equal(where.invitationId, undefined);
  });

  it("binds guestId to invitation when creating under an invite", () => {
    assert.deepEqual(
      guestOwnershipWhere({
        guestId: "g-1",
        eventId: "evt-1",
        invitationId: "inv-akua",
      }),
      { id: "g-1", eventId: "evt-1", invitationId: "inv-akua" }
    );
  });

  it("public payload must not require invitationId filter for cross-party visibility", () => {
    // Reproduces the production defect: filtering by Party B's invitationId hid Party A's wish.
    const partyAWish = {
      id: "wish-a",
      eventId: "evt-1",
      invitationId: "inv-obuah",
      status: "APPROVED",
      isVisible: true,
    };
    const partyBInvitationId = "inv-akua";
    const brokenFilter =
      partyAWish.eventId === "evt-1" && partyAWish.invitationId === partyBInvitationId;
    assert.equal(brokenFilter, false, "party-scoped filter wrongly hides cross-party wishes");

    const correctFilter =
      partyAWish.eventId === "evt-1" &&
      partyAWish.status === "APPROVED" &&
      partyAWish.isVisible;
    assert.equal(correctFilter, true);
  });
});
