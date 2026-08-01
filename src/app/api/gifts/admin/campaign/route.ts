import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { requireGiftFinanceAccess } from "@/lib/gifts/gift-guard";
import { createAuditLog } from "@/lib/audit";
import { containsFundraisingLanguage, GIFT_TYPE_LABELS } from "@/lib/gifts/gift-copy";
import { parseSuggestedAmounts } from "@/lib/gifts/money";
import type { EventGiftType } from "@prisma/client";

export const dynamic = "force-dynamic";

const GIFT_TYPES = Object.keys(GIFT_TYPE_LABELS) as [EventGiftType, ...EventGiftType[]];

const updateSchema = z.object({
  eventId: z.string().min(1),
  giftType: z.enum(GIFT_TYPES).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED"]).optional(),
  qrMode: z.enum(["EVENT_GIFT_QR", "PERSONALISED_GIFT_QR"]).optional(),
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(240).optional(),
  description: z.string().trim().max(1000).optional(),
  ctaLabel: z.string().trim().max(60).optional(),
  thankYouTitle: z.string().trim().max(120).optional(),
  thankYouMessage: z.string().trim().max(1000).optional(),
  coverImageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  suggestedAmountsMinor: z.array(z.number().int().positive()).max(8).optional(),
  minAmountMinor: z.number().int().positive().optional(),
  maxAmountMinor: z.number().int().positive().nullable().optional(),
  allowCustomAmount: z.boolean().optional(),
  allowGuestMessage: z.boolean().optional(),
  requireGuestName: z.boolean().optional(),
  requireGuestContact: z.boolean().optional(),
  allowAnonymous: z.boolean().optional(),
  showOnInvitation: z.boolean().optional(),
  showOnCompanion: z.boolean().optional(),
  themeSource: z.enum(["INVITATION", "PRESET"]).optional(),
  themePresetId: z.string().trim().max(80).nullable().optional(),
  opensAt: z.string().datetime().nullable().optional(),
  closesAt: z.string().datetime().nullable().optional(),
  settlementDelayHours: z.number().int().min(0).max(8760).optional(),
  withdrawAfterEventOnly: z.boolean().optional(),
  minWithdrawalMinor: z.number().int().positive().optional(),
  maxWithdrawalMinor: z.number().int().positive().nullable().optional(),
  rotateToken: z.boolean().optional(),
});

/** Current gift campaign for an event, created on first open. */
export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  const guard = await requireGiftFinanceAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const campaign = await giftCampaignService.ensureCampaign(guard.eventId, {
    createdById: guard.userId,
  });
  const links = await giftCampaignService.links(campaign);
  const event = await prisma.event.findUnique({
    where: { id: guard.eventId },
    select: { title: true, hostName: true, eventType: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      campaign: {
        ...campaign,
        suggestedAmountsMinor: parseSuggestedAmounts(campaign.suggestedAmounts),
      },
      links,
      event,
      permissions: { canRefund: guard.canRefund },
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const guard = await requireGiftFinanceAccess(data.eventId);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const campaign = await giftCampaignService.ensureCampaign(guard.eventId, {
      createdById: guard.userId,
    });

    if (data.minAmountMinor && data.maxAmountMinor && data.maxAmountMinor < data.minAmountMinor) {
      return NextResponse.json(
        { error: "The maximum gift cannot be lower than the minimum" },
        { status: 400 }
      );
    }

    // Guard the wedding-copy promise: a celebratory template should never ship
    // fundraiser wording by accident. The organiser can still override it
    // knowingly by sending `allowFundraisingLanguage`.
    const copyFields = [data.title, data.subtitle, data.description, data.ctaLabel].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    const giftType = data.giftType ?? campaign.giftType;
    const celebratory = giftType !== "FUNERAL_SUPPORT";
    if (celebratory && copyFields.some(containsFundraisingLanguage) && !body.allowFundraisingLanguage) {
      return NextResponse.json(
        {
          error:
            "This looks like fundraiser wording. Celebration templates read better as a gift, resend with allowFundraisingLanguage if you meant it.",
        },
        { status: 422 }
      );
    }

    const updated = await giftCampaignService.update(campaign.id, {
      ...(data.giftType ? { giftType: data.giftType } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.qrMode ? { qrMode: data.qrMode } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel } : {}),
      ...(data.thankYouTitle !== undefined ? { thankYouTitle: data.thankYouTitle } : {}),
      ...(data.thankYouMessage !== undefined ? { thankYouMessage: data.thankYouMessage } : {}),
      ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl || null } : {}),
      ...(data.suggestedAmountsMinor
        ? { suggestedAmounts: parseSuggestedAmounts(data.suggestedAmountsMinor) }
        : {}),
      ...(data.minAmountMinor ? { minAmountMinor: data.minAmountMinor } : {}),
      ...(data.maxAmountMinor !== undefined ? { maxAmountMinor: data.maxAmountMinor } : {}),
      ...(data.allowCustomAmount !== undefined
        ? { allowCustomAmount: data.allowCustomAmount }
        : {}),
      ...(data.allowGuestMessage !== undefined
        ? { allowGuestMessage: data.allowGuestMessage }
        : {}),
      ...(data.requireGuestName !== undefined ? { requireGuestName: data.requireGuestName } : {}),
      ...(data.requireGuestContact !== undefined
        ? { requireGuestContact: data.requireGuestContact }
        : {}),
      ...(data.allowAnonymous !== undefined ? { allowAnonymous: data.allowAnonymous } : {}),
      ...(data.showOnInvitation !== undefined
        ? { showOnInvitation: data.showOnInvitation }
        : {}),
      ...(data.showOnCompanion !== undefined
        ? { showOnCompanion: data.showOnCompanion }
        : {}),
      ...(data.themeSource ? { themeSource: data.themeSource } : {}),
      ...(data.themePresetId !== undefined ? { themePresetId: data.themePresetId } : {}),
      ...(data.opensAt !== undefined
        ? { opensAt: data.opensAt ? new Date(data.opensAt) : null }
        : {}),
      ...(data.closesAt !== undefined
        ? { closesAt: data.closesAt ? new Date(data.closesAt) : null }
        : {}),
      ...(data.settlementDelayHours !== undefined
        ? { settlementDelayHours: data.settlementDelayHours }
        : {}),
      ...(data.withdrawAfterEventOnly !== undefined
        ? { withdrawAfterEventOnly: data.withdrawAfterEventOnly }
        : {}),
      ...(data.minWithdrawalMinor !== undefined
        ? { minWithdrawalMinor: data.minWithdrawalMinor }
        : {}),
      ...(data.maxWithdrawalMinor !== undefined
        ? { maxWithdrawalMinor: data.maxWithdrawalMinor }
        : {}),
    });

    const final = data.rotateToken
      ? await giftCampaignService.rotatePublicToken(updated.id)
      : updated;

    await createAuditLog({
      userId: guard.userId,
      action: "UPDATE",
      entity: "event_gift_campaign",
      entityId: final.id,
      details: {
        eventId: guard.eventId,
        status: final.status,
        rotatedToken: Boolean(data.rotateToken),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          ...final,
          suggestedAmountsMinor: parseSuggestedAmounts(final.suggestedAmounts),
        },
        links: await giftCampaignService.links(final),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("[gifts.admin.campaign]", error);
    return NextResponse.json({ error: "Could not update the gift settings" }, { status: 500 });
  }
}
