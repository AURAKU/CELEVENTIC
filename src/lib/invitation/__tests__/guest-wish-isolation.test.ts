import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Pure documentation of invitation-wish isolation rules used by
 * GuestWishService.listForEvent / create. Keeps the contract visible in CI.
 */
function buildWishListWhere(input: {
  eventId: string;
  invitationId?: string | null;
  publicOnly?: boolean;
}) {
  const where: Record<string, unknown> = { eventId: input.eventId };
  if (input.invitationId) where.invitationId = input.invitationId;
  if (input.publicOnly) {
    where.isVisible = true;
    where.status = "APPROVED";
  }
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

describe("guest wish invitation isolation", () => {
  it("scopes public invite wish lists to invitationId when present", () => {
    const where = buildWishListWhere({
      eventId: "evt-1",
      invitationId: "inv-akua",
      publicOnly: true,
    });
    assert.equal(where.eventId, "evt-1");
    assert.equal(where.invitationId, "inv-akua");
    assert.equal(where.isVisible, true);
    assert.equal(where.status, "APPROVED");
  });

  it("keeps thank-you / event-wide lists without invitationId", () => {
    const where = buildWishListWhere({ eventId: "evt-1", publicOnly: true });
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
});
