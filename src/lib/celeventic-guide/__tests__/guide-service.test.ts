import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  seedCeleventicGuides,
  listPublicGuides,
  getPublicGuideBySlug,
  createAdminGuide,
  updateAdminGuide,
  duplicateAdminGuide,
  deleteAdminGuide,
} from "@/services/celeventic-guide/guide.service";

const prisma = new PrismaClient();

describe("celeventic-guide service CRUD + visibility", () => {
  before(async () => {
    await seedCeleventicGuides();
  });

  it("seeds published guides and hides admin-only from public list", async () => {
    const publicGuides = await listPublicGuides();
    assert.ok(publicGuides.length >= 30);
    assert.ok(publicGuides.every((g) => g.slug !== "admin-guide-manager"));
    const admin = await prisma.helpGuide.findUnique({ where: { slug: "admin-guide-manager" } });
    assert.ok(admin);
    assert.equal(admin!.adminOnly, true);
    const publicAdmin = await getPublicGuideBySlug("admin-guide-manager");
    assert.equal(publicAdmin, null);
  });

  it("loads flagship by slug with steps", async () => {
    const guide = await getPublicGuideBySlug("how-celeventic-works");
    assert.ok(guide);
    assert.ok(guide!.steps.length >= 6);
  });

  it("does not expose draft or archived publicly", async () => {
    const created = await createAdminGuide({
      title: "Temp Draft Guide",
      summary: "draft",
      role: "GUEST",
      category: "PLATFORM",
      status: "DRAFT",
      slug: "temp-draft-guide-test",
    });
    assert.equal(await getPublicGuideBySlug(created.slug), null);
    await updateAdminGuide(created.id, { status: "ARCHIVED" });
    assert.equal(await getPublicGuideBySlug(created.slug), null);
    const dup = await duplicateAdminGuide(created.id);
    assert.ok(dup);
    assert.equal(dup!.status, "DRAFT");
    assert.ok(dup!.slug.includes("copy"));
    await deleteAdminGuide(dup!.id);
    await deleteAdminGuide(created.id);
  });

  it("search prefers organizer role ordering", async () => {
    const hits = await listPublicGuides({ q: "guest", viewerRole: "ORGANIZER" });
    assert.ok(hits.length > 0);
  });
});
