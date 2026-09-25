import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderTotal,
  formatInvitationPriceGhs,
  getCatalogInvitationPackages,
  getInvitationPackage,
  ghsToPesewas,
  isPopularInvitationPackage,
  isQuoteOnlyInvitationPackage,
  resolveInvitationPackageSlug,
} from "../packages";

test("flyer prices and names are the invitation catalogue source of truth", () => {
  const catalog = getCatalogInvitationPackages();
  assert.deepEqual(
    catalog.map((pkg) => pkg.slug),
    ["starter", "celebration", "signature", "bespoke"]
  );
  assert.equal(getInvitationPackage("starter")?.name, "Starter");
  assert.equal(getInvitationPackage("starter")?.priceGhs, 450);
  assert.equal(getInvitationPackage("classic")?.name, "Classic");
  assert.equal(getInvitationPackage("celebration")?.priceGhs, 800);
  assert.equal(getInvitationPackage("signature")?.priceGhs, 1500);
  assert.equal(getInvitationPackage("ultimate")?.name, "Ultimate Experience");
  assert.equal(getInvitationPackage("bespoke")?.priceGhs, 2950);
});

test("formats GHS amounts with From for Ultimate", () => {
  assert.equal(formatInvitationPriceGhs(getInvitationPackage("starter")!), "GHS 450");
  assert.equal(formatInvitationPriceGhs(getInvitationPackage("celebration")!), "GHS 800");
  assert.equal(formatInvitationPriceGhs(getInvitationPackage("signature")!), "GHS 1,500");
  assert.equal(formatInvitationPriceGhs(getInvitationPackage("bespoke")!), "From GHS 2,950");
});

test("Signature is most popular and Ultimate is quotation-only", () => {
  assert.equal(isPopularInvitationPackage("signature"), true);
  assert.equal(isPopularInvitationPackage("starter"), false);
  assert.equal(isQuoteOnlyInvitationPackage("bespoke"), true);
  assert.equal(isQuoteOnlyInvitationPackage("ultimate"), true);
  assert.equal(isQuoteOnlyInvitationPackage("starter"), false);
});

test("guest entitlements do not downgrade Ultimate below Signature", () => {
  const signature = getInvitationPackage("signature")!;
  const ultimate = getInvitationPackage("bespoke")!;
  assert.equal(signature.guestCapacity, 300);
  assert.equal(ultimate.guestCapacity, 300);
  assert.equal(ultimate.admissionSupportGuests, 200);
  assert.ok((ultimate.guestCapacity ?? 0) >= (signature.guestCapacity ?? 0));
});

test("revision allowances match the flyer", () => {
  assert.equal(getInvitationPackage("starter")?.revisions, 1);
  assert.equal(getInvitationPackage("celebration")?.revisions, 2);
  assert.equal(getInvitationPackage("signature")?.revisions, 3);
  assert.equal(getInvitationPackage("bespoke")?.revisions, 3);
});

test("feature inheritance is represented on Classic, Signature, and Ultimate", () => {
  assert.ok(getInvitationPackage("celebration")?.features[0]?.includes("Starter"));
  assert.ok(getInvitationPackage("signature")?.features[0]?.includes("Classic"));
  assert.ok(getInvitationPackage("bespoke")?.features[0]?.includes("Signature"));
  assert.ok(
    getInvitationPackage("bespoke")?.features.some((line) =>
      line.includes("On-ground admission support for up to 200 guests")
    )
  );
});

test("Paystack pesewas conversion for self-serve packages", () => {
  assert.equal(ghsToPesewas(450), 45_000);
  assert.equal(ghsToPesewas(800), 80_000);
  assert.equal(ghsToPesewas(1500), 150_000);
});

test("quote-only Ultimate does not produce a fixed checkout total", () => {
  assert.equal(calculateOrderTotal("bespoke", []), 0);
  assert.equal(calculateOrderTotal("starter", []), 450);
  assert.equal(calculateOrderTotal("celebration", []), 800);
  assert.equal(calculateOrderTotal("signature", []), 1500);
});

test("aliases resolve to stable order slugs", () => {
  assert.equal(resolveInvitationPackageSlug("Classic"), "celebration");
  assert.equal(resolveInvitationPackageSlug("ultimate-experience"), "bespoke");
});
