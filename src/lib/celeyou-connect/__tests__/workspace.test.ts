import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  connectionHasExportableConsent,
  connectionsToCsv,
  isInternalConnectionTag,
  mergeConnectionTags,
  normalizeConnectionLabel,
  ownerLabelsFromTags,
} from "@/lib/celeyou-connect/workspace";
import { celeYouEmailSignatureHtml, celeYouEmailSignaturePlain } from "@/lib/celeyou-growth/signature";
import { CELEYOU_REFERRAL_COPY, celeYouInvitePath, parseCeleYouReferral } from "@/lib/celeyou-growth/referral";
import { CELEYOU_PRODUCT_EVENTS, celeYouIsoWeekCohort, isLaterCohort } from "@/lib/celeyou-growth/product-metrics";
import { persistBusinessProfile } from "@/lib/digital-business-card/business-profile";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

describe("CeleYou connection workspace", () => {
  it("keeps fingerprint tags private and stores owner labels separately", () => {
    assert.equal(isInternalConnectionTag("email:ama@test.com"), true);
    assert.equal(normalizeConnectionLabel("Client A"), "client_a");
    assert.equal(normalizeConnectionLabel("email:secret"), null);
    const tags = mergeConnectionTags(["email:ama@test.com"], ["client", "follow-up"]);
    assert.ok(tags.includes("email:ama@test.com"));
    assert.deepEqual(ownerLabelsFromTags(tags), ["client", "follow-up"]);
    assert.equal(ownerLabelsFromTags(tags).some((item) => item.includes("@")), false);
  });

  it("exports only consented contacts and never invents emails", () => {
    assert.equal(
      connectionHasExportableConsent({
        consentAt: new Date(0),
        visitorEmail: "ama@test.com",
      }),
      false
    );
    assert.equal(
      connectionHasExportableConsent({
        consentAt: new Date(),
        visitorEmail: "ama@test.com",
      }),
      true
    );
    const csv = connectionsToCsv([
      {
        visitorName: "Ama Serwaa",
        visitorEmail: "ama@test.com",
        visitorPhone: null,
        visitorCompany: "Folio",
        visitorTitle: "Director",
        source: "connect_back",
        status: "NEW",
        labels: ["client"],
        createdAt: "2026-11-14T00:00:00.000Z",
      },
    ]);
    assert.match(csv, /^name,email,phone/);
    assert.match(csv, /Ama Serwaa/);
    assert.doesNotMatch(csv, /email:ama/);
  });

  it("authorizes export, delete, reminders, and pagination on the owner API", () => {
    const route = source("src/app/api/digital-business-cards/[id]/connections/route.ts");
    const exportRoute = source("src/app/api/digital-business-cards/[id]/connections/export/route.ts");
    const inbox = source("src/components/digital-business-card/digital-card-connection-inbox.tsx");
    assert.match(route, /listOwnerConnections/);
    assert.match(route, /deleteOwnerConnection/);
    assert.match(route, /scheduleOwnerReminder/);
    assert.match(exportRoute, /getServerSession/);
    assert.match(exportRoute, /rateLimit/);
    assert.match(inbox, /Export consented contacts/);
    assert.match(inbox, /Remind in 1 day/);
    assert.match(inbox, /Moved to|movedLeadStatusCopy/);
    assert.match(route, /syncLeadStatusEffects/);
    assert.match(source("src/services/celeyou-connect/workspace.service.ts"), /NOT: \{ status: "ARCHIVED" \}/);
  });
});

describe("CeleYou growth and business extras", () => {
  it("builds a tracking-free signature and an honest invite", () => {
    const plain = celeYouEmailSignaturePlain({
      displayName: "Kojo Mensah",
      title: "Principal",
      company: "Frost House",
      profileUrl: "https://www.celeventic.com/u/kojo-mensah",
    });
    assert.match(plain, /Kojo Mensah/);
    assert.doesNotMatch(plain, /utm_|pixel|track/i);
    const html = celeYouEmailSignatureHtml({
      displayName: "Kojo Mensah",
      profileUrl: "https://www.celeventic.com/u/kojo-mensah",
    });
    assert.doesNotMatch(html, /<img/);
    assert.equal(celeYouInvitePath("kojo.mensah"), "/auth/register?intent=celecard&from=kojo.mensah");
    assert.equal(parseCeleYouReferral("from=admin!"), null);
    assert.match(CELEYOU_REFERRAL_COPY, /no reward program/i);
    const share = source("src/components/digital-business-card/digital-card-share-desk.tsx");
    assert.match(share, /Copy email signature/);
    assert.match(share, /Invite a colleague/);
  });

  it("keeps business extras off until the owner enables them", () => {
    assert.equal(persistBusinessProfile({ enabled: false, hours: "9-5", services: ["Law"] }), undefined);
    const on = persistBusinessProfile({ enabled: true, hours: "Mon–Fri 9–17", services: ["Design", "Photo"] });
    assert.equal(on?.enabled, true);
    assert.equal(on?.services.length, 2);
    const studio = source("src/components/digital-business-card/digital-card-studio-client.tsx");
    assert.match(studio, /Show business extras/);
    assert.match(studio, /does not read Google Calendar/);
  });

  it("defines product metrics once and measures retention by cohort", () => {
    assert.equal(CELEYOU_PRODUCT_EVENTS.connect_back_submitted.once, "connection");
    assert.equal(CELEYOU_PRODUCT_EVENTS.first_successful_share.once, "card");
    assert.match(CELEYOU_PRODUCT_EVENTS.referral_converted.not, /Link clicks/);
    const week = celeYouIsoWeekCohort(new Date(Date.UTC(2026, 0, 5)));
    assert.match(week, /^2026-W/);
    assert.equal(isLaterCohort(new Date("2026-01-05T00:00:00Z"), new Date("2026-01-05T12:00:00Z")), false);
    assert.equal(isLaterCohort(new Date("2026-01-05T00:00:00Z"), new Date("2026-01-20T00:00:00Z")), true);
  });
});
