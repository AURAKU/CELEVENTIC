import test from "node:test";
import assert from "node:assert/strict";
import {
  eventGetStatus,
  payloadContainsForbiddenEventFields,
  toEventApiResponse,
  toGuestDirectoryRecord,
} from "../event-dto";

const rawEvent = {
  id: "evt_1",
  title: "Ama & Kofi",
  eventType: "WEDDING",
  organizerId: "org_1",
  guests: [
    {
      id: "g1",
      name: "Guest One",
      email: "guest@example.com",
      phone: "0240000000",
      qrToken: "secret-qr",
      manualCode: "1234",
      notes: "VIP",
    },
  ],
  invitations: [{ id: "inv_1", uniqueLink: "bearer-token", name: "Main" }],
  tickets: [{ id: "t1", name: "VIP", qrToken: "ticket-secret", price: 100 }],
  _count: { guests: 1, invitations: 1, tickets: 1, qrScans: 0 },
};

test("anonymous and guest actors cannot read organizer event documents", () => {
  assert.equal(eventGetStatus({ kind: "anonymous" }), 401);
  assert.equal(eventGetStatus({ kind: "guest" }), 401);
});

test("cross-tenant and unauthorized collaborators are forbidden", () => {
  assert.equal(eventGetStatus({ kind: "unauthorized" }), 403);
});

test("members receive 200 but the payload still excludes the guest graph", () => {
  assert.equal(eventGetStatus({ kind: "member", canManageGuests: false }), 200);
  const payload = toEventApiResponse(rawEvent);
  assert.equal("guests" in payload, false);
  assert.equal("invitations" in payload, false);
  assert.equal(payload.guestCount, 1);
  assert.equal(payload.invitationCount, 1);
  assert.deepEqual(payloadContainsForbiddenEventFields(payload), []);
  assert.equal("qrToken" in (payload.tickets as object[])[0], false);
});

test("organizers with guest permission still do not receive guests on the general event GET", () => {
  const payload = toEventApiResponse(rawEvent);
  assert.equal(payloadContainsForbiddenEventFields(payload).includes("guests"), false);
  assert.equal(payloadContainsForbiddenEventFields(payload).includes("uniqueLink"), false);
  assert.equal(payloadContainsForbiddenEventFields(payload).includes("qrToken"), false);
});

test("guest directory records drop QR tokens, gate codes and invitation bearer links", () => {
  const record = toGuestDirectoryRecord({
    id: "g1",
    name: "Guest One",
    email: "a@b.c",
    qrToken: "secret-qr",
    manualCode: "9999",
    invitation: { id: "inv_1", name: "Main", uniqueLink: "bearer-token" },
  });
  assert.equal("qrToken" in record, false);
  assert.equal("manualCode" in record, false);
  assert.equal(record.invitation?.uniqueLink, undefined);
  assert.equal(record.invitation?.id, "inv_1");
  assert.deepEqual(payloadContainsForbiddenEventFields(record), []);
});
