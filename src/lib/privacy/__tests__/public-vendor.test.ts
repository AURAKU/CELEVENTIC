import test from "node:test";
import assert from "node:assert/strict";
import { assertNoPrivateVendorFields, toPublicVendorCard } from "../public-vendor";

test("public vendor cards omit contact and owner fields", () => {
  const card = toPublicVendorCard({
    id: "v1",
    slug: "aura-films",
    businessName: "Aura Films",
    email: "secret@example.com",
    phone: "+233000",
    whatsapp: "+233000",
    address: "Accra",
    ownerName: "Hidden",
    userId: "user_1",
    city: "Accra",
    isVerified: true,
    isFeatured: false,
    rating: 4.8,
  });
  assert.equal(card.businessName, "Aura Films");
  assert.equal(card.city, "Accra");
  assert.equal(assertNoPrivateVendorFields(card).length, 0);
});

test("detects leaked private vendor fields", () => {
  assert.deepEqual(
    assertNoPrivateVendorFields({ email: "a@b.c", phone: "1" }),
    ["email", "phone"]
  );
});
