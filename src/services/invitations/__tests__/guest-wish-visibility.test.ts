import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { guestWishService } from "@/services/invitations/guest-wish.service";

/**
 * Integration: approved public wishes are event-wide across invitation parties.
 * Ownership (invitationId) is stored on write but must not filter public reads.
 */

const SUFFIX = randomBytes(4).toString("hex");
const MARKER = `wish-vis-${SUFFIX}`;

let organizerId = "";
let eventId = "";
let invObuah = "";
let invAkua = "";
let invOtherEvent = "";
let otherEventId = "";
const wishIds: string[] = [];

async function cleanup() {
  if (wishIds.length) {
    await prisma.invitationGuestWish.deleteMany({ where: { id: { in: wishIds } } }).catch(() => {});
  }
  if (eventId) {
    await prisma.invitationGuestWish.deleteMany({ where: { eventId } }).catch(() => {});
    await prisma.invitation.deleteMany({ where: { eventId } }).catch(() => {});
    await prisma.event.deleteMany({ where: { id: eventId } }).catch(() => {});
  }
  if (otherEventId) {
    await prisma.invitationGuestWish.deleteMany({ where: { eventId: otherEventId } }).catch(() => {});
    await prisma.invitation.deleteMany({ where: { eventId: otherEventId } }).catch(() => {});
    await prisma.event.deleteMany({ where: { id: otherEventId } }).catch(() => {});
  }
  if (organizerId) {
    await prisma.user.deleteMany({ where: { id: organizerId } }).catch(() => {});
  }
}

before(async () => {
  await cleanup();
  const user = await prisma.user.create({
    data: {
      email: `wish-vis-${SUFFIX}@example.test`,
      name: "Wish Tester",
      role: "ORGANIZER",
    },
  });
  organizerId = user.id;

  const event = await prisma.event.create({
    data: {
      title: `Wish Visibility ${MARKER}`,
      slug: `wish-vis-${SUFFIX}`,
      organizerId,
      hostName: "Hosts",
      eventType: "WEDDING",
      status: "PUBLISHED",
      startDate: new Date(),
    },
  });
  eventId = event.id;

  const other = await prisma.event.create({
    data: {
      title: `Other Event ${MARKER}`,
      slug: `wish-other-${SUFFIX}`,
      organizerId,
      hostName: "Other Hosts",
      eventType: "WEDDING",
      status: "PUBLISHED",
      startDate: new Date(),
    },
  });
  otherEventId = other.id;

  const a = await prisma.invitation.create({
    data: {
      eventId,
      uniqueLink: `obuah-${SUFFIX}`,
      slug: `obuah-${SUFFIX}`,
      name: "The OBUAH Family",
      status: "ACTIVE",
    },
  });
  invObuah = a.id;

  const b = await prisma.invitation.create({
    data: {
      eventId,
      uniqueLink: `akua-${SUFFIX}`,
      slug: `akua-${SUFFIX}`,
      name: "Akua & Kelly",
      status: "ACTIVE",
    },
  });
  invAkua = b.id;

  const c = await prisma.invitation.create({
    data: {
      eventId: otherEventId,
      uniqueLink: `other-${SUFFIX}`,
      slug: `other-${SUFFIX}`,
      name: "Other Party",
      status: "ACTIVE",
    },
  });
  invOtherEvent = c.id;

  const created = await Promise.all([
    guestWishService.create({
      eventId,
      invitationId: invObuah,
      authorName: "Obuah Guest",
      message: "Blessings from the OBUAH Family",
    }),
    guestWishService.create({
      eventId,
      invitationId: invAkua,
      authorName: "Akua",
      message: "Congrats from Akua and Kelly",
    }),
    guestWishService.create({
      eventId,
      invitationId: invObuah,
      authorName: "Pending Person",
      message: "Still awaiting approval",
      requireApproval: true,
    }),
    prisma.invitationGuestWish.create({
      data: {
        eventId,
        invitationId: invAkua,
        authorName: "Rejected",
        message: "Should not show",
        status: "REJECTED",
        isVisible: false,
        source: "INVITATION",
      },
      select: { id: true },
    }),
    prisma.invitationGuestWish.create({
      data: {
        eventId,
        invitationId: invObuah,
        authorName: "Hidden",
        message: "Hidden wish",
        status: "HIDDEN",
        isVisible: false,
        source: "INVITATION",
      },
      select: { id: true },
    }),
    prisma.invitationGuestWish.create({
      data: {
        eventId,
        invitationId: invAkua,
        authorName: "Removed",
        message: "Removed wish",
        status: "REMOVED",
        isVisible: false,
        source: "INVITATION",
      },
      select: { id: true },
    }),
    guestWishService.create({
      eventId: otherEventId,
      invitationId: invOtherEvent,
      authorName: "Other Event Guest",
      message: "Wish on a different event",
    }),
  ]);

  for (const row of created) {
    wishIds.push(row.id);
  }
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("event-wide public guest wishes (integration)", () => {
  it("Party A sees approved wishes from Party A and Party B", async () => {
    const data = await guestWishService.listForEvent(eventId, 1, 25, {
      publicOnly: true,
      invitationId: invObuah, // must be ignored for publicOnly
    });
    const messages = data.items.map((w) => w.message);
    assert.ok(messages.includes("Blessings from the OBUAH Family"));
    assert.ok(messages.includes("Congrats from Akua and Kelly"));
    assert.equal(data.items.length, 2);
    assert.ok(!messages.some((m) => /pending|Should not|Hidden|Removed|different event/i.test(m)));
  });

  it("Party B sees the same approved public wishes without submitting first", async () => {
    const data = await guestWishService.listForEvent(eventId, 1, 25, {
      publicOnly: true,
      invitationId: invAkua,
    });
    assert.equal(data.items.length, 2);
    const ids = data.items.map((w) => w.id).sort();
    const fromObuah = await guestWishService.listForEvent(eventId, 1, 25, {
      publicOnly: true,
      invitationId: invObuah,
    });
    assert.deepEqual(ids, fromObuah.items.map((w) => w.id).sort());
  });

  it("does not expose guestId / invitationId in public items", async () => {
    const data = await guestWishService.listForEvent(eventId, 1, 25, { publicOnly: true });
    for (const item of data.items) {
      assert.equal("guestId" in item, false);
      assert.equal("invitationId" in item, false);
      assert.ok(item.id);
      assert.ok(item.authorName);
      assert.ok(item.message);
    }
  });

  it("other-event wishes never appear", async () => {
    const data = await guestWishService.listForEvent(eventId, 1, 25, { publicOnly: true });
    assert.ok(!data.items.some((w) => w.message.includes("different event")));
  });

  it("pagination appends without duplication", async () => {
    // Create enough approved wishes for 2 pages of size 1
    const extra = await guestWishService.create({
      eventId,
      invitationId: invObuah,
      authorName: "Extra",
      message: `Extra wish ${MARKER}`,
    });
    wishIds.push(extra.id);

    const page1 = await guestWishService.listForEvent(eventId, 1, 1, { publicOnly: true });
    const page2 = await guestWishService.listForEvent(eventId, 2, 1, { publicOnly: true });
    assert.equal(page1.items.length, 1);
    assert.equal(page2.items.length, 1);
    assert.notEqual(page1.items[0]!.id, page2.items[0]!.id);

    const merged = [...page1.items, ...page2.items];
    const unique = new Set(merged.map((w) => w.id));
    assert.equal(unique.size, merged.length);
  });

  it("invalid invitation cannot authorize via mismatched event ownership on create", async () => {
    await assert.rejects(
      () =>
        guestWishService.create({
          eventId,
          invitationId: invOtherEvent,
          authorName: "Leak",
          message: "Should fail cross-event invite",
        }),
      /Invitation not found for this event/
    );
  });
});
