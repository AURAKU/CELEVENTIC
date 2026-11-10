import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CELEYOU_ADMIN_SERVICES } from "@/lib/digital-business-card/admin-services-catalog";
import { getFilteredNavSections } from "@/lib/navigation/nav-filter";

describe("CeleYou admin services catalog", () => {
  it("lists every service with requirements and an admin action", () => {
    assert.equal(CELEYOU_ADMIN_SERVICES.length >= 12, true);
    const ids = CELEYOU_ADMIN_SERVICES.map((service) => service.id);
    assert.equal(ids.length, new Set(ids).size);
    for (const service of CELEYOU_ADMIN_SERVICES) {
      assert.equal(service.title.length > 3, true, service.id);
      assert.equal(service.requires.length > 0, true, service.id);
      assert.equal(service.adminNeeds.length > 0, true, service.id);
      assert.equal(service.href.length > 1, true, service.id);
    }
  });

  it("shows CeleYou services in the dashboard sidebar for admins only", () => {
    const admin = getFilteredNavSections("organizer", "EVENT_OWNER", { isAdmin: true });
    const holder = getFilteredNavSections("organizer", "EVENT_OWNER", { isAdmin: false });
    const adminItems = admin.flatMap((section) => section.items);
    const holderItems = holder.flatMap((section) => section.items);
    assert.equal(
      adminItems.some((item) => item.href === "/dashboard/business-card/services" && item.adminOnly),
      true
    );
    assert.equal(
      holderItems.some((item) => item.href === "/dashboard/business-card/services"),
      false
    );
  });

  it("gates the services API and desk behind CeleYou view permission", () => {
    const api = readFileSync(join(process.cwd(), "src/app/api/admin/celecard/services/route.ts"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/app/dashboard/business-card/services/page.tsx"), "utf8");
    const desk = readFileSync(
      join(process.cwd(), "src/components/digital-business-card/celeyou-admin-services-desk.tsx"),
      "utf8"
    );
    assert.match(api, /requireCeleCardPermission\(Permission\.CELECARD_VIEW\)/);
    assert.match(page, /isPlatformAdmin/);
    assert.match(desk, /Create CeleYou/);
    assert.match(desk, /Paystack/);
    assert.match(desk, /Needs attention/);
  });
});
