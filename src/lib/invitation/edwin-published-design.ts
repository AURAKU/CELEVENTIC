import { readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import {
  EDWIN_PUBLIC_INVITE_PATH,
  EDWIN_PUBLISHED_INVITE_LINK,
  inviteLinkIdentityKeys,
} from "@/lib/invitation/public-invite-alias";

const HERO = "/templates/edwin-lordina/hero-navy.jpg";
const LAYOUT = "forever-afaris-wedding";
/** Same file the local Edwin event plays through its default music track. */
export const EDWIN_EVENT_SONG_URL = "/music/edwin-lordina-biblical.mp3";
const EDWIN_EVENT_SONG_SEC = 229.72;
const MOMENTS = [
  "/templates/edwin-lordina/moments/02-gold.jpg",
  "/templates/edwin-lordina/moments/03-sofa.jpg",
  "/templates/edwin-lordina/moments/04-navy.jpg",
  "/templates/edwin-lordina/moments/05-close.jpg",
  "/templates/edwin-lordina/cover-sofa.jpg",
  "/templates/edwin-lordina/moments/07-stool.jpg",
] as const;

export function edwinDesignIsCurrent(design: unknown): boolean {
  const json = JSON.stringify(design ?? {});
  return json.includes("##EdWinsDina26") && json.includes(HERO);
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, sortJson((value as Record<string, unknown>)[key])])
    );
  }
  return value;
}

let publishedDesignJson: string | null = null;

/** True when the stored board is the fixture guests see on localhost. */
export function edwinPublishedContentIsCurrent(design: unknown): boolean {
  if (!edwinDesignIsCurrent(design)) return false;
  publishedDesignJson ??= canonicalJson(loadEdwinPublishedDesign());
  return canonicalJson(design) === publishedDesignJson;
}

export function loadEdwinPublishedDesign(): InvitationDesignConfig {
  const designPath = path.join(process.cwd(), "scripts/fixtures/edwin-lordina-design.json");
  const design = JSON.parse(readFileSync(designPath, "utf8")) as InvitationDesignConfig;
  const leaked = [/jeffery/i, /chelsy/i, /francisca/i, /forever afaris/i].find((pattern) =>
    pattern.test(JSON.stringify(design))
  );
  if (leaked) {
    throw new Error("Edwin fixture still contains another couple's copy");
  }
  if (design.layout !== LAYOUT) {
    throw new Error(`Expected layout ${LAYOUT}`);
  }
  if (!edwinDesignIsCurrent(design)) {
    throw new Error("Edwin fixture is missing the current portrait or gate word");
  }
  return design;
}

function isEdwinLordina(title: string | null | undefined): boolean {
  const value = title?.toLowerCase() ?? "";
  return value.includes("edwin") && value.includes("lordina");
}

let applyQueue: Promise<unknown> = Promise.resolve();

function enqueueApply<T>(work: () => Promise<T>): Promise<T> {
  const run = applyQueue.then(work, work);
  applyQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Replace the stored board for the published Edwin invitation.
 * The guest token is left unchanged. Parallel page and metadata loads share one write.
 */
export function edwinMusicSelection(trackId: string): Prisma.InputJsonValue {
  return {
    source: "library",
    libraryTrackId: trackId,
    url: EDWIN_EVENT_SONG_URL,
    title: "Biblical. Calum Scott",
    startSec: 0,
    endSec: EDWIN_EVENT_SONG_SEC,
    originalDurationSec: EDWIN_EVENT_SONG_SEC,
    autoPlay: true,
    loop: true,
    volume: 0.45,
    fadeInSec: 1.5,
    fadeOutSec: 1,
  };
}

function selectionPlaysSong(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  return (raw as { url?: unknown }).url === EDWIN_EVENT_SONG_URL;
}

export function applyEdwinPublishedDesign(
  uniqueLink = EDWIN_PUBLISHED_INVITE_LINK,
  client: PrismaClient = prisma
): Promise<{ uniqueLink: string; orders: number; changed: boolean }> {
  return enqueueApply(() => writeEdwinPublishedDesign(uniqueLink, client));
}

async function ensureEdwinSong(client: PrismaClient) {
  const existing = await client.invitationMusicTrack.findFirst({
    where: { url: EDWIN_EVENT_SONG_URL },
    select: { id: true },
  });
  if (existing) {
    return client.invitationMusicTrack.update({
      where: { id: existing.id },
      data: {
        title: "Biblical",
        artist: "Calum Scott",
        category: "wedding",
        durationSec: EDWIN_EVENT_SONG_SEC,
        isActive: true,
      },
      select: { id: true },
    });
  }
  return client.invitationMusicTrack.create({
    data: {
      title: "Biblical",
      artist: "Calum Scott",
      category: "wedding",
      url: EDWIN_EVENT_SONG_URL,
      durationSec: EDWIN_EVENT_SONG_SEC,
      isActive: true,
    },
    select: { id: true },
  });
}

const EDWIN_INVITE_SELECT = {
  id: true,
  uniqueLink: true,
  name: true,
  designConfig: true,
  featureConfig: true,
  postAdmissionEnabled: true,
  eventId: true,
  event: {
    select: {
      title: true,
      defaultMusicTrack: { select: { id: true, url: true } },
    },
  },
} as const;

async function findEdwinInvitation(uniqueLink: string, client: PrismaClient) {
  const keys = inviteLinkIdentityKeys(uniqueLink);
  for (const extra of [EDWIN_PUBLISHED_INVITE_LINK, EDWIN_PUBLIC_INVITE_PATH]) {
    if (!keys.includes(extra)) keys.push(extra);
  }
  for (const key of keys) {
    const row = await client.invitation.findUnique({
      where: { uniqueLink: key },
      select: EDWIN_INVITE_SELECT,
    });
    if (!row) continue;
    if (isEdwinLordina(row.event.title) || isEdwinLordina(row.name)) return row;
  }
  return null;
}

function withEdwinCompanionFeatures(raw: unknown): Prisma.InputJsonValue {
  const next =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  for (const key of [
    "POST_ADMISSION_PORTAL",
    "LIVE_PROGRAMME",
    "EVENT_MENU",
    "GIFT_WALLET",
    "MEMORY_VAULT",
  ]) {
    const prev =
      next[key] && typeof next[key] === "object" && !Array.isArray(next[key])
        ? (next[key] as Record<string, unknown>)
        : {};
    next[key] = { ...prev, enabled: true };
  }
  return next as Prisma.InputJsonValue;
}

function edwinCompanionReady(invitation: {
  postAdmissionEnabled: boolean;
  featureConfig: unknown;
}): boolean {
  if (!invitation.postAdmissionEnabled) return false;
  const cfg =
    invitation.featureConfig && typeof invitation.featureConfig === "object"
      ? (invitation.featureConfig as Record<string, { enabled?: boolean }>)
      : {};
  return (
    cfg.POST_ADMISSION_PORTAL?.enabled === true &&
    cfg.LIVE_PROGRAMME?.enabled === true &&
    cfg.EVENT_MENU?.enabled === true
  );
}

async function writeEdwinPublishedDesign(
  uniqueLink: string,
  client: PrismaClient
): Promise<{ uniqueLink: string; orders: number; changed: boolean }> {
  const invitation = await findEdwinInvitation(uniqueLink, client);
  if (!invitation) {
    throw new Error(`No invitation with unique link ${uniqueLink}`);
  }
  if (!isEdwinLordina(invitation.event.title) && !isEdwinLordina(invitation.name)) {
    throw new Error(`Refusing to update ${uniqueLink}: not Edwin & Lordina`);
  }

  const orders = await client.invitationOrder.findMany({
    where: {
      archivedAt: null,
      OR: [{ invitationId: invitation.id }, { eventId: invitation.eventId }],
    },
    select: { id: true, musicSelection: true, musicPreference: true },
  });
  const designShapeOk = edwinDesignIsCurrent(invitation.designConfig);
  const designCurrent = edwinPublishedContentIsCurrent(invitation.designConfig);
  const eventSongReady = invitation.event.defaultMusicTrack?.url === EDWIN_EVENT_SONG_URL;
  const companionReady = edwinCompanionReady(invitation);
  const ordersReady = orders.every(
    (order) =>
      selectionPlaysSong(order.musicSelection) &&
      (order.musicPreference == null || order.musicPreference === EDWIN_EVENT_SONG_URL)
  );
  if (designCurrent && eventSongReady && ordersReady && companionReady) {
    return { uniqueLink: invitation.uniqueLink, orders: orders.length, changed: false };
  }

  const song = await ensureEdwinSong(client);
  const design = loadEdwinPublishedDesign();
  const catalog = designShapeOk
    ? null
    : await client.invitationCatalogTemplate.findUnique({
        where: { slug: LAYOUT },
        select: { slug: true },
      });
  const designJson = design as unknown as Prisma.InputJsonValue;
  const musicJson = edwinMusicSelection(song.id);

  await client.invitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACTIVE",
      postAdmissionEnabled: true,
      featureConfig: withEdwinCompanionFeatures(invitation.featureConfig),
      ...(!designCurrent ? { designConfig: designJson } : {}),
    },
  });
  if (!designShapeOk) {
    await client.eventMedia.deleteMany({ where: { eventId: invitation.eventId } });
    await client.eventMedia.createMany({
      data: MOMENTS.map((url, index) => ({
        eventId: invitation.eventId,
        url,
        type: "image",
        caption: null,
        sortOrder: index,
      })),
    });
  }
  await client.event.update({
    where: { id: invitation.eventId },
    data: {
      ...(designShapeOk ? {} : { coverImageUrl: HERO, qrCenterImageUrl: HERO, qrLogoSize: "bold" }),
      defaultMusicTrackId: song.id,
    },
  });
  for (const order of orders) {
    await client.invitationOrder.update({
      where: { id: order.id },
      data: {
        musicSelection: musicJson,
        musicPreference: null,
        ...(!designCurrent ? { designConfig: designJson } : {}),
        ...(designShapeOk
          ? {}
          : {
              galleryUrls: [...MOMENTS],
              ...(catalog ? { templateSlug: LAYOUT } : {}),
            }),
      },
    });
  }

  return { uniqueLink: invitation.uniqueLink, orders: orders.length, changed: true };
}
