import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_CELEYOU_CONNECT_FLAGS,
  mergeCeleYouConnectFlags,
} from "@/lib/celeyou-connect/flags";
import {
  celeYouConnectSearchText,
  celeYouDeliveryKey,
  celeYouExchangePairKey,
} from "@/lib/celeyou-connect/pair";
import { celeYouPublicShareSnapshot } from "@/lib/celeyou-connect/snapshots";
import {
  celeYouFollowupDelayMinutes,
  defaultCeleYouFollowupBody,
  renderCeleYouFollowupTemplate,
} from "@/lib/celeyou-connect/followup-copy";
import { CELEYOU_CONNECT_QUEUE } from "@/lib/celeyou-connect/queues";
import type { DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import type { DigitalCardReachItem } from "@/lib/digital-business-card/socials";

function source(relative: string) {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

function reach(partial: Partial<DigitalCardReachItem> & Pick<DigitalCardReachItem, "brand" | "href">): DigitalCardReachItem {
  return {
    id: partial.id || partial.brand,
    title: partial.title || partial.brand,
    subtitle: partial.subtitle ?? null,
    surface: partial.surface || "stack",
    ...partial,
  };
}

describe("CeleYou Connect pair keys", () => {
  it("keeps host card and visitor user in a stable exchange key", () => {
    assert.equal(celeYouExchangePairKey("card-a", "user-b"), "ex:card-a:user-b");
    assert.notEqual(
      celeYouExchangePairKey("card-a", "user-b"),
      celeYouExchangePairKey("card-b", "user-a")
    );
  });

  it("keeps delivery jobs unique per kind and connection", () => {
    assert.equal(celeYouDeliveryKey("GUEST_FOLLOWUP", "c1"), "del:GUEST_FOLLOWUP:c1");
  });

  it("builds searchable text without fabricating fields", () => {
    assert.equal(
      celeYouConnectSearchText({
        visitorName: "Ama Serwaa",
        visitorEmail: "ama@example.com",
        visitorCompany: "Celeventic",
      }),
      "ama serwaa ama@example.com celeventic"
    );
  });
});

describe("CeleYou Connect snapshots", () => {
  it("shares unlocked reach only", () => {
    const card = {
      id: "card-1",
      slug: "ama-serwaa",
      displayName: "Ama Serwaa",
      title: "Designer",
      company: "Celeventic",
      avatarUrl: null,
      guestReach: [
        reach({
          brand: "email",
          href: "mailto:private@hidden.test",
          copyValue: "private@hidden.test",
          locked: true,
        }),
        reach({
          brand: "phone",
          href: "tel:+233200000000",
          copyValue: "+233200000000",
        }),
      ],
    } as DigitalCardPublicPayload;
    const snap = celeYouPublicShareSnapshot(card, "https://www.celeventic.com");
    assert.equal(snap.email, null);
    assert.equal(snap.phone, "+233200000000");
    assert.equal(snap.displayName, "Ama Serwaa");
    assert.match(snap.profileUrl, /\/u\/ama-serwaa/);
  });
});

describe("CeleYou Connect follow-up copy", () => {
  it("uses the cardholder name and never a fabricated title", () => {
    const body = defaultCeleYouFollowupBody(
      { displayName: "Kojo Mensah", profileUrl: "https://www.celeventic.com/u/kojo-mensah" },
      "Ama"
    );
    assert.match(body, /Hello Ama,/);
    assert.match(body, /Best regards,\nKojo Mensah/);
    assert.match(body, /View my CeleYou: https:\/\/www\.celeventic\.com\/u\/kojo-mensah/);
    assert.doesNotMatch(body, /Mr\.|Mrs\.|Ms\./);
  });

  it("clamps custom delay and renders template tokens", () => {
    assert.equal(celeYouFollowupDelayMinutes("IMMEDIATE"), 0);
    assert.equal(celeYouFollowupDelayMinutes("HOUR"), 60);
    assert.equal(celeYouFollowupDelayMinutes("DAY"), 1440);
    assert.equal(celeYouFollowupDelayMinutes("CUSTOM", 1), 5);
    assert.equal(celeYouFollowupDelayMinutes("CUSTOM", 20000), 10080);
    assert.equal(
      renderCeleYouFollowupTemplate("Hi {{guestName}} from {{ownerName}} {{profileUrl}}", {
        guestName: "Ama",
        ownerName: "Kojo Mensah",
        profileUrl: "https://www.celeventic.com/u/kojo-mensah",
      }),
      "Hi Ama from Kojo Mensah https://www.celeventic.com/u/kojo-mensah"
    );
  });
});

describe("CeleYou Connect flags", () => {
  it("defaults release 1 on and later releases off", () => {
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_two_way_exchange, true);
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_auto_followup, true);
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_notifications, true);
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_relationship_timeline, false);
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_enrichment, false);
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_crm_integrations, false);
    assert.equal(DEFAULT_CELEYOU_CONNECT_FLAGS.connect_enterprise, false);
    assert.equal(mergeCeleYouConnectFlags({ connect_enterprise: true }).connect_enterprise, true);
  });
});

describe("CeleYou Connect wiring", () => {
  it("requires explicit consent on Connect Back and keeps the honeypot silent path", () => {
    const route = source("src/app/api/digital-business-cards/connect/route.ts");
    assert.match(route, /consent: z\.boolean\(\)/);
    assert.match(route, /consent !== true/);
    assert.match(route, /website: z\.string\(\)\.max\(200\)/);
    assert.match(route, /if \(parsed\.data\.website\)/);
    assert.match(route, /finalizeGuestConnectBack/);
  });

  it("requires confirm true before exchanging cards", () => {
    const route = source("src/app/api/digital-business-cards/connect/exchange/route.ts");
    const service = source("src/services/celeyou-connect/connect.service.ts");
    assert.match(route, /confirm: z\.literal\(true\)/);
    assert.match(service, /You cannot connect with your own CeleYou/);
    assert.match(service, /upsert/);
    assert.match(service, /pairKey/);
    assert.match(service, /P2002/);
  });

  it("shows Exchange Cards and guest consent on the public card", () => {
    const view = source("src/components/digital-business-card/digital-card-public-view.tsx");
    assert.match(view, /DigitalCardConnectExchange/);
    assert.match(view, /I agree to share these details/);
    assert.match(view, /followupConsent/);
    assert.match(view, /visitorCompany/);
    assert.match(view, /connectBackEnabled && !card\.isDemo && !connectDone && !exchangeAvailable/);
  });

  it("keeps Connect studio search, notes, and follow-up automations", () => {
    const inbox = source("src/components/digital-business-card/digital-card-connection-inbox.tsx");
    const studio = source("src/components/digital-business-card/digital-card-studio-client.tsx");
    const automations = source("src/components/digital-business-card/digital-card-connect-automations.tsx");
    assert.match(inbox, /studio-inbox-search/);
    assert.match(inbox, /Share your CeleYou card to start building your network/);
    assert.match(inbox, /Card exchange/);
    assert.match(studio, /#studio-connect/);
    assert.match(studio, /DigitalCardConnectAutomations/);
    assert.match(automations, /Enable automatic follow-up/);
    assert.match(automations, /Send test email/);
    assert.match(automations, /provider accepted/);
  });

  it("registers a durable connect queue and delayed jobs", () => {
    assert.equal(CELEYOU_CONNECT_QUEUE, "celeyou-connect");
    const queue = source("src/lib/queue.ts");
    const worker = source("scripts/video-jobs-worker.ts");
    const handlers = source("src/lib/job-handlers.ts");
    assert.match(queue, /runAfter/);
    assert.match(worker, /CELEYOU_CONNECT_QUEUE/);
    assert.match(handlers, /processCeleYouConnectDelivery/);
  });
});
