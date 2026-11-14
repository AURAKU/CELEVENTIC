/**
 * Idempotent seed for Madam Gladys Ama Dzikpo funeral.
 * Uses the Obaapanin Vida Serwaa memorial-candle-tribute envelope.
 *
 * Run: DATABASE_URL=file:./prisma/dev.db npx tsx scripts/seed-ama-dzikpo-funeral.ts
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { getAppUrlFromEnv } from "../src/lib/app-url";
import { getDefaultDesignConfig } from "../src/lib/invitation-templates";
import { applyThemeToDesign } from "../src/lib/invitation-theme/theme-compat";
import { getInvitationTheme } from "../src/lib/invitation-theme/theme-registry";
import { resolveFuneralEnvelopeSeal } from "../src/lib/invitation/funeral-envelope-seal";
import { invitationBlockService } from "../src/services/invitations/invitation-block.service";
import type { InvitationDesignConfig } from "../src/types/invitation-design";
import type { EventScheduleItem } from "../src/lib/experience/experience-types";
import type { MusicSelection } from "../src/lib/music/music-types";

const EVENT_SLUG = "madam-gladys-ama-dzikpo";
const INVITE_LINK = "madam-gladys-ama-dzikpo";
const TEMPLATE_SLUG = "memorial-candle-tribute";
const PACKAGE_SLUG = "signature";
const HERO = "/templates/ama-dzikpo/hero.jpg";
const HOME_CALL = "/templates/ama-dzikpo/home-call.jpg";
const BANNER = "/templates/ama-dzikpo/invitation-banner.jpg";
const SONG_URL = "/music/ama-dzikpo-gyatabruwaa.mp3";
const SONG_TITLE = "Gyatabruwaa";
const SONG_ARTIST = "Adom Kiki Ft Joe Mettle";
const SONG_DURATION_SEC = 629.002417;
const IDEMPOTENCY_KEY = "seed-ama-dzikpo-funeral";
const CHURCH = "North Kaneshie Assemblies of God Church";
const CAR_PARK = "North Kaneshie Assemblies of God Car Park";
const MAPS =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("North Kaneshie Assemblies of God Church, Accra, Ghana");
const DECEASED_NAME = "MADAM GLADYS AMA DZIKPO A.K.A BABY · 1966 - 2026";
const EVENT_TITLE = "In Loving Memory of Madam Gladys Ama Dzikpo";
const HOST_NAME = "The Dzikpo Family";
const INVITE_MESSAGE =
  "You are humbly invited to mourn with us on the death of our beloved mother";
const DRESS_CODE = "Saturday All Black. Sunday Black And White.";
const START_DATE = new Date("2026-11-14T06:00:00.000Z");
const END_DATE = new Date("2026-11-15T10:00:00.000Z");

const SCHEDULE: EventScheduleItem[] = [
  {
    id: "no-wake-keeping",
    title: "No wake keeping",
    description: "Friday 13th November 2026",
  },
  {
    id: "laying-in-state",
    title: "Laying in state",
    description: "Saturday 14th November 2026",
    location: CHURCH,
    time: "6:00am",
  },
  {
    id: "burial-service",
    title: "Burial service",
    description: "Saturday 14th November 2026",
    location: CHURCH,
    time: "8:00am",
  },
  {
    id: "private-burial",
    title: "Private burial",
    description: "Saturday 14th November 2026",
  },
  {
    id: "final-rites",
    title: "Funeral rite",
    description: "Saturday 14th November 2026",
    location: CAR_PARK,
    time: "11:00am to 6:00pm",
  },
  {
    id: "thanksgiving",
    title: "Thanksgiving service",
    description: "Sunday 15th November 2026",
    location: CHURCH,
    time: "8:00am",
  },
];

const FAMILY_INFORMATION = [
  "CHIEF MOURNERS: Togbe Doe Kojo (Dufia of Sokode Lokoe), Togbe Ahialoho, Togbe David Adzawla, the head of Akloyo/Dzikpou family (Dufia of Dopkiala), Elder Komla Akloyo, Elder Kofi Alowordor, Elder Dominic Kojovia, Mama Agnes Wuasi, Nene Tu-Abri IV, Fiator D.D Dzorkpe, Zikpuitor Ben. Atli, Seth Dzokpe, Amewuga Gbotsyo, Rev Rtd Tei-Mati Joys, Mawuse Gbotsyo, Agnes Gbotsyo, Seline Gbotsyo, Charlotte Gbotsyo, Patience Devries Gbotsyo, Vida Gbotsyo, Emma Sayso Gbotsyo, Rev. Emmanuel Gbotsyo, Seth Gbotsyo, Christian Gbotsyo, Paul Gbotsyo, Rev Dr Terry Emmanuel Adjah, End-Time Assemblies of God Church, and the entire family.",
  "FATHER: Mr Gustav Kwaku Nelson Dzikpo (late)",
  "MOTHER: Madam Ruth Mawusi Afi Gbotsyo (late)",
  "CHILDREN: Prosper Senyo Adzowu Wilson, Johnson Sena Adzowu Wilson, Diana Seyram Adzowu Wilson, Wisdom Makafui Adzowu Wilson",
  "SIBLINGS: Mrs. Patience Nugba, Mr Mawuli Matrevi, Mr. Peter Akloyo Comfort Dzikpo, Mr Jerome Agbesi, Mr. Emmanuel Agbakli, Mrs. Oliver Kpogo, Mrs. Mercy Aboula Mable Agbakli, Rev. Mawuena Agbakli, Florence Agbakli, Ephraim Agbakli, Prosper Agbakli, Josephine Agbakli, Faustina Agbakli, Vida Agbakli, Mercy Nana Yaa Gbotsyo, Gladys Agbakli",
  "IN-LAW: Mrs. Vera Adzowu Wilson",
  "GRANDCHILD: Jason Eyram Adzowu Wilson",
].join("\n");

const STORY = [
  INVITE_MESSAGE,
  "",
  "MADAM GLADYS AMA DZIKPO",
  "A.K.A BABY",
  "1966 to 2026 · Aged 60",
  "",
  FAMILY_INFORMATION,
  "",
  "ALL FRIENDS AND SYMPATHIZERS ARE CORDIALLY INVITED",
].join("\n");

function gyatabruwaaSelection(trackId: string): MusicSelection {
  return {
    source: "library",
    libraryTrackId: trackId,
    url: SONG_URL,
    title: `${SONG_TITLE}. ${SONG_ARTIST}`,
    startSec: 0,
    endSec: SONG_DURATION_SEC,
    originalDurationSec: SONG_DURATION_SEC,
    autoPlay: true,
    loop: true,
    volume: 0.4,
    fadeInSec: 2,
    fadeOutSec: 2,
  };
}

function amaDzikpoDesign(trackId: string): InvitationDesignConfig {
  const theme = getInvitationTheme("candlelight-elegy");
  if (!theme) throw new Error("Missing candlelight-elegy theme");
  const seal = resolveFuneralEnvelopeSeal(TEMPLATE_SLUG);
  const base = getDefaultDesignConfig(TEMPLATE_SLUG);
  const withTheme = applyThemeToDesign(
    {
      ...base,
      blueprintId: "funeral-core-v1",
      introText: "In Loving Memory",
      experience: {
        ...base.experience,
        experienceCustomized: true,
        introVariant: "candlelight",
        openingExperience: "wax-seal-black",
        sceneTransition: "fade",
        outroExperience: "candle-legacy",
        typographyPackId: "funeral",
        slideshowStyle: "timeline-gallery",
        countdownStyle: "minimal",
        hubMode: "paged",
        collectionId: "funeral",
        defaultAudioCategory: "funeral",
        defaultAudioTrackId: trackId,
        scheduleItems: SCHEDULE,
        thankYouMessage: "ALL FRIENDS AND SYMPATHIZERS ARE CORDIALLY INVITED",
        viralFooterEnabled: false,
      },
      studio: {
        ...base.studio,
        fullScreen: true,
        revealMode: "envelope",
        buttonStyle: "solemn",
        visionBoard: {
          eyebrow: "IN LOVING MEMORY",
          scriptTitle: "Funeral Invitation",
          familyInvite: INVITE_MESSAGE.toUpperCase(),
          coupleName1: "MADAM GLADYS AMA DZIKPO",
          coupleName2: "",
          sealInitials: "",
          sealEmblem: seal.emblem,
          sealDesign: seal.design,
          sealFontFamily: "cinzel",
          sealSize: "md",
          weekday: "SATURDAY",
          monthLabel: "NOVEMBER",
          dayNumber: "14",
          timeLabel: "6:00AM",
          dressCodeLine: `DRESS CODE: ${DRESS_CODE.toUpperCase()}`,
          sentiment: INVITE_MESSAGE,
          locationCta: "VIEW VENUE LOCATION",
          rsvpHeading: "ATTENDANCE",
          hashtag: "#RememberDzikpo",
          showArtBackdrop: false,
          liveTypography: true,
          features: {
            guestWelcome: true,
            seating: false,
            qr: true,
            rsvp: true,
            location: true,
            music: true,
            gallery: true,
            memory: true,
            admissionCode: false,
            contributions: true,
            timeline: true,
          },
        },
      },
      media: [
        // Envelope + cover use the deceased portrait exclusively (catalogue art is template only).
        { url: HERO, type: "image", role: "envelope", name: "Madam Gladys Ama Dzikpo" },
        { url: HERO, type: "image", role: "hero", name: "Madam Gladys Ama Dzikpo" },
        { url: HERO, type: "image", role: "intro", name: "In loving memory portrait" },
        { url: BANNER, type: "image", role: "share", name: "Funeral invitation" },
        { url: HOME_CALL, type: "image", role: "reference", name: "Home Call poster" },
        { url: BANNER, type: "image", role: "reference", name: "Invitation banner" },
      ],
    },
    theme
  );
  return withTheme;
}

async function ensureSong() {
  const existing = await prisma.invitationMusicTrack.findFirst({
    where: { url: SONG_URL },
    select: { id: true },
  });
  const data = {
    title: SONG_TITLE,
    artist: SONG_ARTIST,
    category: "funeral",
    url: SONG_URL,
    durationSec: SONG_DURATION_SEC,
    isActive: true,
  };
  return existing
    ? prisma.invitationMusicTrack.update({ where: { id: existing.id }, data })
    : prisma.invitationMusicTrack.create({ data });
}

async function main() {
  const organizer =
    (await prisma.user.findFirst({
      where: { email: "admin@celeventic.com" },
      select: { id: true, name: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, name: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "ORGANIZER"] } },
      select: { id: true, name: true, email: true },
    }));
  if (!organizer) {
    throw new Error("No organiser account found. Run npm run seed:admin first.");
  }

  const catalog = await prisma.invitationCatalogTemplate.findUnique({
    where: { slug: TEMPLATE_SLUG },
    select: { slug: true },
  });
  if (!catalog) {
    throw new Error(`Catalog template ${TEMPLATE_SLUG} is missing from invitation_catalog_templates.`);
  }

  const song = await ensureSong();
  const design = amaDzikpoDesign(song.id);
  const designJson = design as unknown as Prisma.InputJsonValue;
  const musicJson = gyatabruwaaSelection(song.id) as unknown as Prisma.InputJsonValue;
  const gallery = [HERO, HOME_CALL, BANNER];
  const appUrl = getAppUrlFromEnv();
  const shareUrl = `${appUrl.replace(/\/$/, "")}/invite/${INVITE_LINK}`;

  const existingBySlug = await prisma.event.findUnique({
    where: { slug: EVENT_SLUG },
    select: { id: true },
  });
  const existingByInvite = await prisma.invitation.findFirst({
    where: { uniqueLink: INVITE_LINK },
    select: { eventId: true },
  });
  const eventId = existingBySlug?.id ?? existingByInvite?.eventId;

  const eventData = {
    title: EVENT_TITLE,
    eventType: "FUNERAL" as const,
    hostName: HOST_NAME,
    description: STORY,
    startDate: START_DATE,
    endDate: END_DATE,
    venueName: CHURCH,
    landmark: "North Kaneshie, Accra",
    mapsLink: MAPS,
    dressCode: DRESS_CODE,
    coverImageUrl: HERO,
    qrCenterImageUrl: HERO,
    qrLogoSize: "bold" as const,
    defaultMusicTrackId: song.id,
    city: "Accra",
    region: "Greater Accra",
    country: "GH",
    isPublic: true,
    isFeatured: true,
    status: "PUBLISHED" as const,
    organizerId: organizer.id,
    pricingType: "FREE" as const,
  };

  const event = eventId
    ? await prisma.event.update({ where: { id: eventId }, data: eventData })
    : await prisma.event.create({ data: { slug: EVENT_SLUG, ...eventData } });

  await prisma.eventMedia.deleteMany({ where: { eventId: event.id } });
  await prisma.eventMedia.createMany({
    data: gallery.map((url, sortOrder) => ({
      eventId: event.id,
      url,
      type: "image",
      caption:
        url === HERO
          ? "Madam Gladys Ama Dzikpo"
          : url === HOME_CALL
            ? "Home Call"
            : "Funeral Invitation",
      sortOrder,
    })),
  });

  const existingInvitation = await prisma.invitation.findFirst({
    where: { OR: [{ eventId: event.id }, { uniqueLink: INVITE_LINK }] },
    orderBy: { createdAt: "asc" },
  });
  const invitation = existingInvitation
    ? await prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          eventId: event.id,
          name: EVENT_TITLE,
          slug: EVENT_SLUG,
          message: INVITE_MESSAGE,
          designConfig: designJson,
          uniqueLink: INVITE_LINK,
          status: "ACTIVE",
        },
      })
    : await prisma.invitation.create({
        data: {
          eventId: event.id,
          name: EVENT_TITLE,
          slug: EVENT_SLUG,
          message: INVITE_MESSAGE,
          designConfig: designJson,
          uniqueLink: INVITE_LINK,
          status: "ACTIVE",
        },
      });

  const existingOrder =
    (await prisma.invitationOrder.findFirst({
      where: { idempotencyKey: IDEMPOTENCY_KEY },
    })) ??
    (await prisma.invitationOrder.findFirst({
      where: { OR: [{ invitationId: invitation.id }, { eventId: event.id }] },
      orderBy: { createdAt: "asc" },
    }));

  const orderPayload = {
    userId: organizer.id,
    templateSlug: TEMPLATE_SLUG,
    packageSlug: PACKAGE_SLUG,
    status: "PUBLISHED" as const,
    productionStatus: "DELIVERED" as const,
    workflowType: "SELF_SERVICE" as const,
    workflowStage: "PUBLISHED" as const,
    eventType: "FUNERAL",
    hostName: HOST_NAME,
    deceasedName: DECEASED_NAME,
    eventTitle: EVENT_TITLE,
    eventDate: START_DATE,
    eventTime: "6:00am",
    venueName: CHURCH,
    landmark: "North Kaneshie, Accra",
    mapsLink: MAPS,
    dressCode: DRESS_CODE,
    story: STORY,
    galleryUrls: gallery as unknown as Prisma.InputJsonValue,
    musicPreference: `${SONG_TITLE}. ${SONG_ARTIST}`,
    musicSelection: musicJson,
    rsvpRequired: true,
    designConfig: designJson,
    invitationId: invitation.id,
    eventId: event.id,
    shareUrl,
    languageMode: "EN_FR" as const,
    idempotencyKey: IDEMPOTENCY_KEY,
    totalAmountGhs: 0,
  };

  const order = existingOrder
    ? await prisma.invitationOrder.update({
        where: { id: existingOrder.id },
        data: orderPayload,
      })
    : await prisma.invitationOrder.create({ data: orderPayload });

  await invitationBlockService.ensureBlocksForOrder(order.id);
  const programBlock = await prisma.invitationBlock.findFirst({
    where: { invitationOrderId: order.id, blockType: "FUNERAL_PROGRAM" },
    select: { id: true },
  });
  if (programBlock) {
    const items = SCHEDULE.map((item) => ({
      time: item.time ?? item.description ?? "",
      label: item.title,
      description: [item.description, item.location].filter(Boolean).join(" · "),
    }));
    await prisma.invitationBlock.update({
      where: { id: programBlock.id },
      data: {
        isVisible: true,
        contentJson: { items } as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.funeralProfile.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      deceasedName: DECEASED_NAME,
      age: 60,
      biography: STORY,
      familyName: HOST_NAME,
      familyInformation: FAMILY_INFORMATION,
      legacyMessage: "ALL FRIENDS AND SYMPATHIZERS ARE CORDIALLY INVITED",
      photoUrl: HERO,
      theme: "candlelight-elegy",
      templateSlug: TEMPLATE_SLUG,
      revealStyle: "wax-seal-black",
      invitationAudioCategory: "funeral",
      privacyStatus: "PUBLIC",
      burialVenue: CHURCH,
      burialDirections: "North Kaneshie, Accra",
      legacyVisibility: "PUBLIC",
    },
    update: {
      deceasedName: DECEASED_NAME,
      age: 60,
      biography: STORY,
      familyName: HOST_NAME,
      familyInformation: FAMILY_INFORMATION,
      legacyMessage: "ALL FRIENDS AND SYMPATHIZERS ARE CORDIALLY INVITED",
      photoUrl: HERO,
      theme: "candlelight-elegy",
      templateSlug: TEMPLATE_SLUG,
      revealStyle: "wax-seal-black",
      invitationAudioCategory: "funeral",
      privacyStatus: "PUBLIC",
      burialVenue: CHURCH,
      burialDirections: "North Kaneshie, Accra",
      legacyVisibility: "PUBLIC",
    },
  });

  await prisma.funeralProgram.deleteMany({ where: { eventId: event.id } });
  await prisma.funeralProgram.createMany({
    data: SCHEDULE.map((item, sortOrder) => ({
      eventId: event.id,
      title: item.title,
      description: [item.description, item.location].filter(Boolean).join(" · "),
      startTime: item.time ?? null,
      sortOrder,
    })),
  });

  console.log(
    JSON.stringify(
      {
        eventId: event.id,
        eventSlug: event.slug,
        invitationId: invitation.id,
        uniqueLink: invitation.uniqueLink,
        inviteUrl: `/invite/${invitation.uniqueLink}`,
        shareUrl,
        template: TEMPLATE_SLUG,
        music: { id: song.id, url: SONG_URL, title: SONG_TITLE, artist: SONG_ARTIST },
        photos: gallery.length,
        programme: SCHEDULE.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
