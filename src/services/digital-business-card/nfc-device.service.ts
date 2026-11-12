import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sha256Hex } from "@/lib/crypto/sha256-hex";
import { resolveCeleYouPublicShare } from "@/lib/digital-business-card/access";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import {
  nfcDeviceMayPause,
  nfcDeviceMayReplace,
  nfcDeviceMayReportLost,
  nfcDeviceMayResume,
  normalizeNfcDeviceStatus,
  pickCurrentNfcDevice,
  type NfcDeviceAction,
  type NfcTapOutcome,
} from "@/lib/digital-business-card/nfc-device";
import { celeYouNfcScanUrl, isReservedCeleYouShareToken } from "@/lib/digital-business-card/share-identity";
import { shouldCountCeleYouGuestStat } from "@/lib/celeyou-share/events";
import {
  ensureDefaultNfcDevice,
  getDigitalCardForUser,
} from "@/services/digital-business-card/digital-business-card.service";

function newNfcClaimSecretHash(): string {
  return sha256Hex(randomBytes(32).toString("base64url"));
}

export type NfcTapResolution =
  | { outcome: "open"; slug: string }
  | { outcome: "profile"; slug: string }
  | { outcome: Exclude<NfcTapOutcome, "open" | "profile"> };

function toOwnerDevice(
  device: {
    id: string;
    name: string;
    deviceType: string;
    status: string;
    publicToken: string;
    tapCount: number;
    lastTapAt: Date | null;
    createdAt: Date;
  },
  origin?: string
) {
  return {
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    status: normalizeNfcDeviceStatus(device.status) ?? "DISABLED",
    publicToken: device.publicToken,
    nfcUrl: celeYouNfcScanUrl(device.publicToken, origin),
    tapCount: device.tapCount,
    lastTapAt: device.lastTapAt?.toISOString() ?? null,
    createdAt: device.createdAt.toISOString(),
  };
}

/** Read-only NFC lookup. Never records a tap. Used for OG unfurl. */
export async function peekNfcDeviceCard(publicToken: string) {
  const device = await prisma.smartCardNfcDevice.findUnique({
    where: { publicToken },
    include: { card: true },
  });
  return device?.card ?? null;
}

export async function resolveNfcDeviceTap(
  publicToken: string,
  input?: { viewerUserId?: string | null; userAgent?: string | null }
): Promise<NfcTapResolution> {
  const device = await prisma.smartCardNfcDevice.findUnique({
    where: { publicToken },
    include: { card: true },
  });
  if (!device?.card) return { outcome: "unknown" };

  const policy = await getCeleCardLifecyclePolicy();
  const share = resolveCeleYouPublicShare({
    card: device.card,
    channel: "nfc",
    nfc: { deviceStatus: device.status },
    policy,
  });
  const outcome = share.nfcOutcome ?? "unknown";

  if (outcome === "open") {
    const record = shouldCountCeleYouGuestStat({
      ownerUserId: device.card.userId,
      viewerUserId: input?.viewerUserId,
      userAgent: input?.userAgent,
    });
    if (record) {
      await prisma.smartCardNfcDevice.update({
        where: { id: device.id },
        data: { tapCount: { increment: 1 }, lastTapAt: new Date() },
      });
      await prisma.smartCardInteraction
        .create({
          data: {
            cardId: device.cardId,
            campaignId: device.campaignId,
            kind: "nfc_tap",
            meta: { deviceId: device.id, deviceType: device.deviceType },
          },
        })
        .catch(() => undefined);
    }
    return { outcome: "open", slug: device.card.slug };
  }

  if (outcome === "profile") {
    return { outcome: "profile", slug: device.card.slug };
  }

  return { outcome };
}

export async function listNfcDevicesForUser(userId: string, cardId: string, origin?: string) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  await ensureDefaultNfcDevice(card);
  const devices = await prisma.smartCardNfcDevice.findMany({
    where: { cardId: card.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const mapped = devices.map((device) => toOwnerDevice(device, origin));
  const current = pickCurrentNfcDevice(mapped);
  return {
    card: {
      id: card.id,
      displayName: card.displayName,
      nfcEnabled: card.nfcEnabled,
      slug: card.slug,
    },
    devices: mapped,
    activeDevice: current,
  };
}

export async function mutateNfcDeviceForUser(
  userId: string,
  cardId: string,
  input: { action: NfcDeviceAction; deviceId?: string },
  origin?: string
) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;

  const target =
    (input.deviceId
      ? await prisma.smartCardNfcDevice.findFirst({ where: { id: input.deviceId, cardId: card.id } })
      : await prisma.smartCardNfcDevice.findFirst({
          where: { cardId: card.id, status: { in: ["ACTIVE", "DISABLED", "LOST"] } },
          orderBy: { createdAt: "desc" },
        })) ?? null;
  if (!target) return { error: "NFC card not found" as const };

  const status = normalizeNfcDeviceStatus(target.status);
  if (!status) return { error: "NFC card not found" as const };

  if (input.action === "pause") {
    if (!nfcDeviceMayPause(status)) return { error: "This NFC card cannot be paused" as const };
    await prisma.smartCardNfcDevice.update({ where: { id: target.id }, data: { status: "DISABLED" } });
  } else if (input.action === "resume") {
    if (!nfcDeviceMayResume(status)) return { error: "This NFC card cannot be turned back on" as const };
    await prisma.smartCardNfcDevice.update({ where: { id: target.id }, data: { status: "ACTIVE" } });
  } else if (input.action === "lost") {
    if (!nfcDeviceMayReportLost(status)) return { error: "This NFC card cannot be marked lost" as const };
    await prisma.smartCardNfcDevice.update({ where: { id: target.id }, data: { status: "LOST" } });
  } else if (input.action === "replace") {
    if (!nfcDeviceMayReplace(status)) return { error: "This NFC card cannot be replaced" as const };
    await prisma.$transaction(async (tx) => {
      await tx.smartCardNfcDevice.update({ where: { id: target.id }, data: { status: "REPLACED" } });
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const created = await tx.smartCardNfcDevice.create({
          data: {
            cardId: card.id,
            name: target.name || "CeleYou card",
            deviceType: target.deviceType || "card",
            claimSecretHash: newNfcClaimSecretHash(),
          },
        });
        if (created.publicToken !== card.publicToken && !isReservedCeleYouShareToken(created.publicToken)) {
          return;
        }
        await tx.smartCardNfcDevice.delete({ where: { id: created.id } });
      }
      throw new Error("Could not allocate a unique NFC tap token");
    });
  }

  return listNfcDevicesForUser(userId, cardId, origin);
}
