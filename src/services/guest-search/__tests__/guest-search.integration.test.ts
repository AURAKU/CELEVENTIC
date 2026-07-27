import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/**
 * End-to-end coverage for Smart Guest Search and the Quick Invitation
 * Generator, against the real database.
 *
 * The unit tests in `src/lib/guest-search/__tests__` prove the pure query and
 * allowance rules. This file proves the parts that only exist once rows are
 * written: that a name and nothing else produces a *complete, admissible*
 * invitation; that the credentials it mints are unique and event-scoped; that
 * editing a published invitation never moves its URL; that archiving withdraws
 * the pass rather than deleting history; and that a guest can be found by
 * every credential the organiser might have to hand.
 *
 * Every row created here is namespaced by a run id and removed in `after`.
 */

process.env.ADMISSION_PASS_SECRET ??= "test-admission-secret-do-not-use-in-production";

const RUN = randomUUID().slice(0, 8);

let organizerId: string;
let eventId: string;

type Prisma = (typeof import("../../../lib/prisma"))["prisma"];
let prisma: Prisma;

async function loadPrisma(): Promise<Prisma> {
  if (!prisma) ({ prisma } = await import("../../../lib/prisma"));
  return prisma;
}

async function quickCreate(input: {
  name: string;
  partySize?: number;
  phone?: string | null;
  email?: string | null;
  acknowledgeDuplicates?: boolean;
}) {
  const { createQuickInvitation } = await import("../quick-invite.service");
  return createQuickInvitation({
    eventId,
    actorUserId: organizerId,
    acknowledgeDuplicates: true,
    ...input,
  });
}

async function search(query: string, options: { includeArchived?: boolean } = {}) {
  const { searchGuests } = await import("../guest-search.service");
  return searchGuests({ eventId, query, ...options });
}

before(async () => {
  const db = await loadPrisma();
  const user = await db.user.create({
    data: { name: `Search Test Organizer ${RUN}`, email: `search-test-${RUN}@example.test` },
  });
  organizerId = user.id;
  const event = await db.event.create({
    data: {
      slug: `search-test-${RUN}`,
      title: `Search Test Event ${RUN}`,
      eventType: "WEDDING",
      hostName: "Test Host",
      startDate: new Date(Date.now() + 60 * 60_000),
      organizerId,
    },
  });
  eventId = event.id;
});

after(async () => {
  const db = await loadPrisma();
  // Cascades clear invitations, guests, passes and seating assignments.
  await db.event.deleteMany({ where: { organizerId } }).catch(() => {});
  await db.user.delete({ where: { id: organizerId } }).catch(() => {});
  await db.$disconnect();
});

describe("quick create with a name and nothing else", () => {
  it("produces a complete, admissible invitation", async () => {
    const db = await loadPrisma();
    const result = await quickCreate({ name: `Mr Kofi Obuah ${RUN}` });

    assert.ok(result.invitationId);
    assert.ok(result.inviteUrl.includes("/invite/"), "the link must be shareable");
    assert.ok(result.inviteUrl.includes("?guest="), "the link must identify the guest");
    assert.ok(result.admissionCode, "a name-only guest still gets an admission code");
    assert.equal(result.status, "ACTIVE", "published so the link works immediately");

    const invitation = await db.invitation.findUnique({
      where: { id: result.invitationId },
      include: { guests: true, guestPasses: true },
    });

    assert.ok(invitation);
    assert.equal(invitation!.guests.length, 1);
    assert.equal(invitation!.guests[0].email, null, "no email was given and none was invented");
    assert.equal(invitation!.guests[0].phone, null);
    assert.equal(invitation!.guestPasses.length, 1, "exactly one entry pass");
    assert.equal(invitation!.admissionAllowance, 1);

    // Place card and entry pass must be switched on, or the pass renders bare.
    const features = invitation!.featureConfig as Record<string, { enabled?: boolean }> | null;
    assert.equal(features?.PLACE_CARD?.enabled, true, "a name-only guest still gets a place card");
    assert.equal(features?.ENTRY_PASS?.enabled, true);
  });

  it("mints an admission code of the length the gate prints", async () => {
    const result = await quickCreate({ name: `Code Shape ${RUN}` });
    assert.ok(result.admissionCode);
    assert.ok(
      result.admissionCode!.length === 4 || result.admissionCode!.length === 6,
      `expected a 4- or 6-digit code, got ${result.admissionCode}`
    );
    assert.match(result.admissionCode!, /^\d+$/);
  });

  it("never issues the same credential twice within an event", async () => {
    const db = await loadPrisma();
    const names = Array.from({ length: 8 }, (_, i) => `Unique Cred ${i} ${RUN}`);
    for (const name of names) await quickCreate({ name });

    const passes = await db.guestPass.findMany({ where: { eventId }, select: { code: true } });
    const invitations = await db.invitation.findMany({
      where: { eventId },
      select: { uniqueLink: true, slug: true },
    });

    assert.equal(new Set(passes.map((p) => p.code)).size, passes.length, "admission codes collided");
    assert.equal(
      new Set(invitations.map((i) => i.uniqueLink)).size,
      invitations.length,
      "invite links collided"
    );
    assert.equal(new Set(invitations.map((i) => i.slug)).size, invitations.length, "slugs collided");
  });
});

describe("party allowance", () => {
  it("admits the number the organiser set, not the number of guest rows", async () => {
    const db = await loadPrisma();
    const result = await quickCreate({ name: `Allowance Four ${RUN}`, partySize: 4 });

    assert.equal(result.partySize, 4);
    const pass = await db.guestPass.findFirst({ where: { invitationId: result.invitationId } });
    assert.equal(pass?.partySize, 4, "the gate honours the allowance, not the row count");
  });

  it("reads a couple out of the name when no size is given", async () => {
    const result = await quickCreate({ name: `Mr & Mrs Adjei ${RUN}` });
    assert.equal(result.partySize, 2);
    assert.equal(result.partyType, "COUPLE");
  });

  it("refuses an allowance beyond the ceiling", async () => {
    const result = await quickCreate({ name: `Huge Party ${RUN}`, partySize: 9999 });
    assert.ok(result.partySize <= 20, "a stray keystroke must not open the gate to a coach party");
  });
});

describe("duplicate protection", () => {
  it("refuses a second invitation for the same name until acknowledged", async () => {
    const { createQuickInvitation, DuplicateGuestError } = await import("../quick-invite.service");
    const name = `Twice Over ${RUN}`;
    await quickCreate({ name });

    await assert.rejects(
      () =>
        createQuickInvitation({
          eventId,
          name,
          actorUserId: organizerId,
          acknowledgeDuplicates: false,
        }),
      (error: unknown) => {
        assert.ok(error instanceof DuplicateGuestError);
        assert.ok((error as InstanceType<typeof DuplicateGuestError>).duplicates.length > 0);
        return true;
      }
    );
  });

  it("creates a genuinely separate invitation once acknowledged", async () => {
    const db = await loadPrisma();
    const name = `Real Namesakes ${RUN}`;
    const first = await quickCreate({ name });
    const second = await quickCreate({ name });

    assert.notEqual(first.invitationId, second.invitationId);
    const passes = await db.guestPass.findMany({
      where: { invitationId: { in: [first.invitationId, second.invitationId] } },
      select: { code: true },
    });
    assert.equal(new Set(passes.map((p) => p.code)).size, 2, "namesakes must not share a code");
  });

  it("sees through an honorific the second time round", async () => {
    const { previewQuickInvitation } = await import("../quick-invite.service");
    await quickCreate({ name: `Kwesi Honorific ${RUN}` });

    // The organiser types it more formally the second time. Matching on the
    // whole string would miss this; matching on the surname does not.
    const preview = await previewQuickInvitation({
      eventId,
      name: `Nana Kwesi Honorific ${RUN}`,
    });
    assert.ok(
      preview.duplicates.length > 0,
      "an added title must not hide an existing guest"
    );
  });

  it("does not cry duplicate over an unrelated guest", async () => {
    const { previewQuickInvitation } = await import("../quick-invite.service");
    await quickCreate({ name: `Akosua Distinct ${RUN}` });

    const preview = await previewQuickInvitation({ eventId, name: `Yaw Separate ${RUN}` });
    assert.equal(preview.duplicates.length, 0, "unrelated names must not warn");
  });

  it("previews a duplicate without creating anything", async () => {
    const db = await loadPrisma();
    const { previewQuickInvitation } = await import("../quick-invite.service");
    const name = `Preview Only ${RUN}`;
    await quickCreate({ name });

    const before = await db.invitation.count({ where: { eventId } });
    const preview = await previewQuickInvitation({ eventId, name });

    assert.ok(preview.duplicates.length > 0);
    assert.equal(await db.invitation.count({ where: { eventId } }), before, "preview wrote a row");
  });
});

describe("finding a guest", () => {
  it("finds them straight after creation", async () => {
    const created = await quickCreate({ name: `Findable Fiifi ${RUN}` });
    const response = await search(`Fiifi ${RUN}`);
    assert.ok(
      response.results.some((r) => r.invitationId === created.invitationId),
      "a new invitation must be searchable immediately"
    );
  });

  it("finds them by a partial surname typed in the wrong order", async () => {
    const created = await quickCreate({ name: `Mr Yaw Danquah ${RUN}` });
    const response = await search(`danquah yaw`);
    assert.ok(response.results.some((r) => r.invitationId === created.invitationId));
  });

  it("finds them by admission code", async () => {
    const created = await quickCreate({ name: `Coded Guest ${RUN}` });
    assert.ok(created.admissionCode);

    const response = await search(created.admissionCode!);
    assert.equal(response.results[0]?.invitationId, created.invitationId);
    assert.equal(response.results[0]?.matchedField, "code", "an exact code must win outright");
  });

  it("finds them by a local phone number stored internationally", async () => {
    const created = await quickCreate({
      name: `Phoned Guest ${RUN}`,
      phone: "0244123456",
    });
    const db = await loadPrisma();
    const guest = await db.guest.findFirst({ where: { invitationId: created.invitationId } });
    assert.equal(guest?.phone, "+233244123456", "the number should have been normalised");

    const response = await search("0244123456");
    assert.ok(response.results.some((r) => r.invitationId === created.invitationId));
  });

  it("finds them by email", async () => {
    const email = `emailed-${RUN}@example.test`;
    const created = await quickCreate({ name: `Emailed Guest ${RUN}`, email });
    const response = await search(email);
    assert.equal(response.results[0]?.invitationId, created.invitationId);
  });

  it("finds them by table once they are seated", async () => {
    const db = await loadPrisma();
    const created = await quickCreate({ name: `Seated Guest ${RUN}` });
    const guest = await db.guest.findFirst({ where: { invitationId: created.invitationId } });
    const plan = await db.seatingPlan.create({
      data: { eventId, name: `Plan ${RUN}`, layout: { tables: [] } },
    });
    await db.seatingAssignment.create({
      data: { seatingPlanId: plan.id, guestId: guest!.id, tableNumber: "17", seatLabel: "B" },
    });

    const response = await search("table 17");
    assert.ok(response.results.some((r) => r.invitationId === created.invitationId));
  });

  it("returns nothing for a query that matches nobody", async () => {
    const response = await search(`Nobody Here ${RUN}`);
    assert.equal(response.results.length, 0);
  });

  it("never reaches into another event", async () => {
    const db = await loadPrisma();
    const otherEvent = await db.event.create({
      data: {
        slug: `search-other-${RUN}`,
        title: `Other Event ${RUN}`,
        eventType: "WEDDING",
        hostName: "Other Host",
        startDate: new Date(Date.now() + 60 * 60_000),
        organizerId,
      },
    });

    const { createQuickInvitation } = await import("../quick-invite.service");
    const stranger = await createQuickInvitation({
      eventId: otherEvent.id,
      name: `Cross Event ${RUN}`,
      actorUserId: organizerId,
      acknowledgeDuplicates: true,
    });

    const response = await search(`Cross Event ${RUN}`);
    assert.ok(
      !response.results.some((r) => r.invitationId === stranger.invitationId),
      "an event-scoped search must not leak another event's guests"
    );
  });
});

describe("editing a published invitation", () => {
  it("changes the name and allowance without moving the URL", async () => {
    const db = await loadPrisma();
    const { updateInvitationPersonalisation } = await import("../quick-invite.service");
    const created = await quickCreate({ name: `Before Rename ${RUN}` });

    const before = await db.invitation.findUnique({
      where: { id: created.invitationId },
      select: { uniqueLink: true, slug: true },
    });

    await updateInvitationPersonalisation({
      eventId,
      invitationId: created.invitationId,
      name: `After Rename ${RUN}`,
      partySize: 3,
      actorUserId: organizerId,
    });

    const after = await db.invitation.findUnique({
      where: { id: created.invitationId },
      select: { uniqueLink: true, slug: true, name: true, admissionAllowance: true },
    });

    assert.equal(after!.uniqueLink, before!.uniqueLink, "a link already sent must keep working");
    assert.equal(after!.slug, before!.slug);
    assert.equal(after!.name, `After Rename ${RUN}`);
    assert.equal(after!.admissionAllowance, 3);

    const pass = await db.guestPass.findFirst({
      where: { invitationId: created.invitationId, status: { notIn: ["REVOKED", "REISSUED"] } },
    });
    assert.equal(pass?.partySize, 3, "widening the party must widen the pass");
    assert.equal(pass?.displayName, `After Rename ${RUN}`, "the printed name must follow the edit");
  });

  it("keeps the same pass rather than minting a replacement", async () => {
    const db = await loadPrisma();
    const { updateInvitationPersonalisation } = await import("../quick-invite.service");
    const created = await quickCreate({ name: `Stable Pass ${RUN}` });
    const before = await db.guestPass.findFirst({ where: { invitationId: created.invitationId } });

    await updateInvitationPersonalisation({
      eventId,
      invitationId: created.invitationId,
      partySize: 2,
      actorUserId: organizerId,
    });

    const after = await db.guestPass.findFirst({
      where: { invitationId: created.invitationId, status: { notIn: ["REVOKED", "REISSUED"] } },
    });
    assert.equal(after!.id, before!.id, "editing must not force a guest to be re-sent their QR");
    assert.equal(after!.code, before!.code);
  });
});

describe("archive, revoke and restore", () => {
  it("archiving hides the invitation and withdraws the pass", async () => {
    const db = await loadPrisma();
    const { setInvitationLifecycle } = await import("../quick-invite.service");
    const created = await quickCreate({ name: `To Archive ${RUN}` });

    await setInvitationLifecycle({
      eventId,
      invitationId: created.invitationId,
      action: "ARCHIVE",
      actorUserId: organizerId,
    });

    const invitation = await db.invitation.findUnique({ where: { id: created.invitationId } });
    assert.ok(invitation!.archivedAt, "archived invitations must be marked");

    const pass = await db.guestPass.findFirst({ where: { invitationId: created.invitationId } });
    assert.equal(pass?.status, "REVOKED", "an archived invitation must not still open the door");
    assert.ok(pass, "the pass row survives so an old QR is recognised and refused");

    const visible = await search(`To Archive ${RUN}`);
    assert.equal(
      visible.results.some((r) => r.invitationId === created.invitationId),
      false,
      "archived invitations are hidden from search by default"
    );

    const withArchived = await search(`To Archive ${RUN}`, { includeArchived: true });
    assert.ok(withArchived.results.some((r) => r.invitationId === created.invitationId));
  });

  it("restoring brings back a working pass", async () => {
    const db = await loadPrisma();
    const { setInvitationLifecycle } = await import("../quick-invite.service");
    const created = await quickCreate({ name: `To Restore ${RUN}` });

    await setInvitationLifecycle({
      eventId,
      invitationId: created.invitationId,
      action: "ARCHIVE",
      actorUserId: organizerId,
    });
    await setInvitationLifecycle({
      eventId,
      invitationId: created.invitationId,
      action: "RESTORE",
      actorUserId: organizerId,
    });

    const invitation = await db.invitation.findUnique({ where: { id: created.invitationId } });
    assert.equal(invitation!.archivedAt, null);

    const active = await db.guestPass.findFirst({
      where: { invitationId: created.invitationId, status: { notIn: ["REVOKED", "REISSUED"] } },
    });
    assert.ok(active, "a restored invitation needs a live pass again");
  });

  it("revoking a pass leaves the invitation in place", async () => {
    const db = await loadPrisma();
    const { setInvitationLifecycle } = await import("../quick-invite.service");
    const created = await quickCreate({ name: `To Revoke ${RUN}` });

    await setInvitationLifecycle({
      eventId,
      invitationId: created.invitationId,
      action: "REVOKE_PASS",
      reason: "Lost phone",
      actorUserId: organizerId,
    });

    const invitation = await db.invitation.findUnique({ where: { id: created.invitationId } });
    assert.equal(invitation!.archivedAt, null, "revoking a pass is not the same as disinviting");

    const card = await search(`To Revoke ${RUN}`);
    const found = card.results.find((r) => r.invitationId === created.invitationId);
    assert.ok(found, "a revoked guest must still be findable");
    assert.equal(found!.passRevoked, true);
  });
});

describe("search result cards", () => {
  it("carry everything the organiser needs to hand the invitation over", async () => {
    const created = await quickCreate({
      name: `Card Complete ${RUN}`,
      partySize: 2,
      phone: "0244123456",
    });

    const response = await search(`Card Complete ${RUN}`);
    const card = response.results.find((r) => r.invitationId === created.invitationId);

    assert.ok(card);
    assert.ok(card!.inviteUrl.startsWith("http"), "the link must be absolute for sharing");
    assert.equal(card!.partySize, 2);
    assert.ok(card!.admissionCode);
    assert.equal(card!.phone, "+233244123456");
    assert.equal(card!.isGeneralPass, false);
    assert.ok(card!.matchReason);
  });

  it("excludes unnamed general-admission passes by default", async () => {
    const db = await loadPrisma();
    await db.invitation.create({
      data: {
        eventId,
        name: `General Pass Holder ${RUN}`,
        slug: `general-pass-${RUN}`,
        uniqueLink: `general-link-${RUN}`,
        isGeneralPass: true,
      },
    });

    const response = await search(`General Pass Holder ${RUN}`);
    assert.equal(
      response.results.length,
      0,
      "general passes belong in their own batch view, not the personalised list"
    );
  });
});
