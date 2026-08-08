import { NextResponse } from "next/server";
// `Prisma` is used as a value here for `Prisma.DbNull`, which is how a JSON
// column is cleared back to SQL NULL rather than to the JSON literal `null`.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireQrHubAccess } from "@/lib/qr-hub/qr-hub-guard";
import { eventGuideService, GuideError } from "@/services/event-guide/event-guide.service";
import { guideSeatingService } from "@/services/event-guide/guide-seating.service";
import { eventGuideOfflinePackService } from "@/services/event-guide/offline-pack.service";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { parseProgrammeScript } from "@/lib/event-guide/programme-script";
import {
  MAX_PROGRAMME_SCRIPT_CHARS,
  normalizeAttachments,
  normalizeMenu,
  normalizeProgrammeItems,
  resolveGuideContent,
} from "@/lib/event-guide/content";
import { assessGuideContrast, parseThemeOverrides } from "@/lib/event-guide/theme";
import {
  SEATING_MAX_MATCHES,
  effectiveMaxMatches,
  effectiveMinQuery,
  type SeatingMode,
} from "@/lib/event-guide/seating-finder";
import { OFFLINE_SEATING_MODE_LABELS, type OfflineSeatingMode } from "@/lib/event-guide/offline-pack";
import { SIGN_SIZES, SIGN_TEMPLATES } from "@/lib/event-guide/signage";

export const dynamic = "force-dynamic";

const OFFLINE_SEATING_MODES = Object.keys(OFFLINE_SEATING_MODE_LABELS) as OfflineSeatingMode[];

function str(value: unknown, max = 400): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * What the content tab sends for the programme.
 *
 * A script means the organizer used the editor, and the entries are derived
 * from it here. An older client (or an import that only carried items) still
 * saves its array, which is stored with an empty script the editor rebuilds.
 */
function readProgrammeSubmission(body: Record<string, unknown> | null): {
  script: string;
  items: ReturnType<typeof normalizeProgrammeItems>;
} {
  if (typeof body?.programmeScript === "string") {
    const script = body.programmeScript.slice(0, MAX_PROGRAMME_SCRIPT_CHARS);
    return { script, items: parseProgrammeScript(script).items };
  }
  return { script: "", items: normalizeProgrammeItems(body?.programme) };
}

function fail(error: unknown) {
  if (error instanceof GuideError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Event Guide action failed" },
    { status: 400 }
  );
}

/** Everything the builder needs in one round trip. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const guard = await requireQrHubAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const [guide, event] = await Promise.all([
    eventGuideService.ensure(guard.eventId, guard.userId),
    eventGuideService.getEvent(guard.eventId),
  ]);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const [link, offlineLink, invitation, packs, coverage] = await Promise.all([
    eventGuideService.ensureLink(guard.eventId, guard.userId),
    prisma.eventQrLink.findFirst({
      where: { eventId: guard.eventId, type: "EVENT_GUIDE_OFFLINE" },
    }),
    eventGuideService.getSourceInvitation(guard.eventId),
    eventGuideOfflinePackService.list(guide.id),
    guideSeatingService.seatingCoverage(guard.eventId),
  ]);

  const payload = eventGuideService.buildPayload({
    guide,
    event,
    invitation,
    version: guide.version,
    publishedAt: guide.publishedAt,
  });

  const content = resolveGuideContent({
    programmeDraft: guide.programmeDraft,
    menuDraft: guide.menuDraft,
    attachments: guide.attachments,
    invitationProgrammeItems: eventGuideService.invitationProgramme(invitation),
    invitationFeatureConfig: invitation?.featureConfig,
  });

  const guideUrl = await eventGuideService.guideUrl(link.publicToken);
  const analytics = await eventGuideService.analytics(guide.id);
  const seatingMode = guide.seatingMode as SeatingMode;

  return NextResponse.json({
    success: true,
    data: {
      event: { id: event.id, title: event.title },
      guide: {
        id: guide.id,
        enabled: guide.enabled,
        status: guide.status,
        defaultTab: guide.defaultTab,
        version: guide.version,
        publishedVersion: guide.publishedVersion,
        publishedAt: guide.publishedAt,
        showCelebrants: guide.showCelebrants,
        showDate: guide.showDate,
        showVenue: guide.showVenue,
        showWelcome: guide.showWelcome,
        celebrantsText: guide.celebrantsText,
        welcomeMessage: guide.welcomeMessage,
        useInvitationTheme: guide.useInvitationTheme,
        themeOverrides: parseThemeOverrides(guide.themeOverrides),
        seatingEnabled: guide.seatingEnabled,
        seatingMode,
        seatingMinQuery: effectiveMinQuery(seatingMode, guide.seatingMinQuery),
        seatingMaxMatch: effectiveMaxMatches(guide.seatingMaxMatch),
        seatingNote: guide.seatingNote,
        offlineEnabled: guide.offlineEnabled,
        venueOfflineEnabled: guide.venueOfflineEnabled,
        offlineSeatingMode: guide.offlineSeatingMode,
        venueLocalUrl: guide.venueLocalUrl,
        venueWifiName: guide.venueWifiName,
        /** True when the invitation moved on since the last publish. */
        snapshotStale:
          guide.status === "PUBLISHED" && guide.publishedVersion !== null
            ? guide.publishedVersion !== guide.version
            : false,
      },
      content: {
        programme: content.programme,
        programmeScript: content.programmeScript,
        programmeSource: content.programmeSource,
        menu: content.menu,
        menuSource: content.menuSource,
        attachments: content.attachments,
      },
      preview: payload,
      contrast: assessGuideContrast(payload.theme),
      links: {
        online: {
          publicToken: link.publicToken,
          status: link.status,
          url: guideUrl,
          qrPreviewUrl: eventQrLinkService.qrPreview(guideUrl, guard.eventId, 512),
        },
        venueOffline: offlineLink
          ? {
              publicToken: offlineLink.publicToken,
              status: offlineLink.status,
              url: offlineLink.destinationUrl,
              qrPreviewUrl: offlineLink.destinationUrl
                ? eventQrLinkService.qrPreview(offlineLink.destinationUrl, guard.eventId, 512)
                : null,
            }
          : null,
      },
      offline: {
        packs,
        seatingModes: OFFLINE_SEATING_MODES.map((mode) => ({
          value: mode,
          ...OFFLINE_SEATING_MODE_LABELS[mode],
        })),
        coverage,
      },
      signage: {
        sizes: Object.values(SIGN_SIZES),
        templates: Object.values(SIGN_TEMPLATES),
      },
      analytics,
      permissions: { canManage: guard.canManage, canDownload: guard.canDownload },
    },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const action = typeof body?.action === "string" ? body.action : null;
  const expectedVersion = Number(body?.expectedVersion);

  const guard = await requireQrHubAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!guard.canManage) {
    return NextResponse.json({ error: "You do not have permission to edit the Event Guide" }, { status: 403 });
  }

  await eventGuideService.ensure(guard.eventId, guard.userId);

  try {
    switch (action) {
      case "save_settings": {
        const defaultTab = body?.defaultTab;
        const guide = await eventGuideService.applyUpdate(
          guard.eventId,
          guard.userId,
          expectedVersion,
          {
            enabled: bool(body?.enabled, true),
            defaultTab:
              defaultTab === "SEATING" || defaultTab === "MENU" || defaultTab === "PROGRAMME"
                ? defaultTab
                : "PROGRAMME",
            showCelebrants: bool(body?.showCelebrants, true),
            showDate: bool(body?.showDate, true),
            showVenue: bool(body?.showVenue, true),
            showWelcome: bool(body?.showWelcome, true),
            celebrantsText: str(body?.celebrantsText, 160),
            welcomeMessage: str(body?.welcomeMessage, 600),
          },
          "settings_saved"
        );
        return NextResponse.json({ success: true, data: { version: guide.version } });
      }

      case "save_content": {
        // The script is the organizer's copy; the items are what we derive
        // from it. Deriving here rather than trusting the browser keeps the
        // stored running order and the previewed one the same thing.
        const draft = readProgrammeSubmission(body);
        const menu = normalizeMenu(body?.menu);
        const attachments = normalizeAttachments(body?.attachments);
        const guide = await eventGuideService.applyUpdate(
          guard.eventId,
          guard.userId,
          expectedVersion,
          {
            // An empty programme means "go back to inheriting from the
            // invitation", which is different from "the programme is empty".
            programmeDraft:
              draft.items.length > 0 ? (draft as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
            menuDraft: menu as unknown as Prisma.InputJsonValue,
            attachments: attachments as unknown as Prisma.InputJsonValue,
          },
          "content_saved"
        );
        return NextResponse.json({
          success: true,
          data: { version: guide.version, programme: draft.items },
        });
      }

      case "import_programme": {
        // Parses into the draft only. Publishing stays a separate, deliberate act.
        // Same pipeline the builder previews with, so what the organizer saw
        // before pressing the button is what lands in the draft.
        const script =
          typeof body?.text === "string" ? body.text.slice(0, MAX_PROGRAMME_SCRIPT_CHARS) : "";
        const parsed = parseProgrammeScript(script);
        if (parsed.items.length === 0) {
          return NextResponse.json(
            { error: "We could not read a programme from that text. Try one item per line." },
            { status: 422 }
          );
        }
        const guide = await eventGuideService.applyUpdate(
          guard.eventId,
          guard.userId,
          expectedVersion,
          {
            programmeDraft: {
              script,
              items: parsed.items,
            } as unknown as Prisma.InputJsonValue,
          },
          "programme_imported"
        );
        return NextResponse.json({
          success: true,
          data: { version: guide.version, programme: parsed.items, requiresReview: true },
        });
      }

      case "save_appearance": {
        const guide = await eventGuideService.applyUpdate(
          guard.eventId,
          guard.userId,
          expectedVersion,
          {
            useInvitationTheme: bool(body?.useInvitationTheme, true),
            themeOverrides: parseThemeOverrides(body?.themeOverrides) as unknown as Prisma.InputJsonValue,
          },
          "appearance_saved"
        );
        const preview = await eventGuideService.previewPayload(guard.eventId);
        return NextResponse.json({
          success: true,
          data: {
            version: guide.version,
            contrast: preview ? assessGuideContrast(preview.theme) : null,
          },
        });
      }

      case "save_seating": {
        const mode: SeatingMode = body?.seatingMode === "GUEST_NAME" ? "GUEST_NAME" : "ADMISSION_CODE";
        const guide = await eventGuideService.applyUpdate(
          guard.eventId,
          guard.userId,
          expectedVersion,
          {
            seatingEnabled: bool(body?.seatingEnabled, true),
            seatingMode: mode,
            seatingMinQuery: effectiveMinQuery(mode, Number(body?.seatingMinQuery)),
            seatingMaxMatch: Math.min(
              SEATING_MAX_MATCHES,
              effectiveMaxMatches(Number(body?.seatingMaxMatch))
            ),
            seatingNote: str(body?.seatingNote, 300),
          },
          "seating_saved"
        );
        return NextResponse.json({ success: true, data: { version: guide.version } });
      }

      case "publish": {
        const result = await eventGuideService.publish(guard.eventId, guard.userId, expectedVersion);
        return NextResponse.json({
          success: true,
          data: {
            version: result.guide.version,
            publishedAt: result.guide.publishedAt,
            contrast: result.contrast,
          },
        });
      }

      case "unpublish": {
        const guide = await eventGuideService.unpublish(guard.eventId, guard.userId, expectedVersion);
        return NextResponse.json({ success: true, data: { version: guide.version } });
      }

      case "rotate_token": {
        const link = await eventGuideService.ensureLink(guard.eventId, guard.userId);
        const rotated = await eventQrLinkService.rotateToken(link.id, guard.eventId, guard.userId);
        if (!rotated) throw new GuideError("Event Guide link not found", 404);
        const url = await eventGuideService.guideUrl(rotated.publicToken);
        return NextResponse.json({ success: true, data: { publicToken: rotated.publicToken, url } });
      }

      case "set_link_status": {
        const link = await eventGuideService.ensureLink(guard.eventId, guard.userId);
        const status = body?.status;
        if (status !== "ACTIVE" && status !== "DISABLED" && status !== "REVOKED") {
          return NextResponse.json({ error: "Unknown link status" }, { status: 400 });
        }
        await eventQrLinkService.setStatus(link.id, guard.eventId, status, guard.userId);
        return NextResponse.json({ success: true });
      }

      case "configure_offline": {
        const mode = body?.offlineSeatingMode;
        const offlineSeatingMode: OfflineSeatingMode = OFFLINE_SEATING_MODES.includes(
          mode as OfflineSeatingMode
        )
          ? (mode as OfflineSeatingMode)
          : "DISABLED";
        const venueOfflineEnabled = bool(body?.venueOfflineEnabled, false);
        const venueLocalUrl = str(body?.venueLocalUrl, 300);

        const guide = await eventGuideService.applyUpdate(
          guard.eventId,
          guard.userId,
          expectedVersion,
          {
            offlineEnabled: bool(body?.offlineEnabled, true),
            venueOfflineEnabled,
            offlineSeatingMode: venueOfflineEnabled ? offlineSeatingMode : "DISABLED",
            venueLocalUrl,
            venueWifiName: str(body?.venueWifiName, 120),
          },
          "offline_configured"
        );

        // The venue-offline QR is a separate link and never replaces the online
        // one; it only exists once a local address has been configured.
        await eventGuideService.setOfflineLink(
          guard.eventId,
          venueOfflineEnabled ? venueLocalUrl : null,
          guard.userId
        );

        return NextResponse.json({ success: true, data: { version: guide.version } });
      }

      case "revoke_offline_packs": {
        const count = await eventGuideOfflinePackService.revoke(
          guard.eventId,
          guard.userId,
          str(body?.reason, 200) ?? undefined
        );
        return NextResponse.json({ success: true, data: { revoked: count } });
      }

      case "sync_offline_pack": {
        const report = await eventGuideOfflinePackService.sync({
          eventId: guard.eventId,
          actorId: guard.userId,
          token: typeof body?.token === "string" ? body.token : "",
          packVersion: Number(body?.packVersion),
          guideVersion: Number(body?.guideVersion),
          records: body?.records,
        });
        return NextResponse.json({ success: true, data: report });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return fail(error);
  }
}
