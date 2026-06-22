import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import type { QrScanResult } from "@prisma/client";

export class OfflineQrService {
  async verifyDeviceAccess(deviceId: string, userId: string) {
    const device = await prisma.offlineDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new Error("Device not found");
    if (device.userId !== userId) throw new Error("You do not have access to this device");
    return device;
  }

  async registerDevice(eventId: string, userId: string, deviceName: string) {
    const deviceToken = generateToken(32);
    return prisma.offlineDevice.create({
      data: { eventId, userId, deviceName, deviceToken, isAuthorized: true },
    });
  }

  async syncEventData(eventId: string) {
    const qrCodes = await prisma.qrCode.findMany({
      where: { eventId },
      include: {
        guest: { select: { id: true, name: true, status: true } },
        ticket: { select: { id: true, name: true, status: true } },
      },
    });

    const guests = qrCodes
      .filter((q) => q.guest)
      .map((q) => ({
        id: q.guest!.id,
        name: q.guest!.name,
        qrToken: q.token,
        status: q.guest!.status,
      }));

    const tickets = qrCodes
      .filter((q) => q.ticket)
      .map((q) => ({
        id: q.ticket!.id,
        name: q.ticket!.name,
        qrToken: q.token,
        status: q.ticket!.status,
      }));

    return {
      eventId,
      syncedAt: new Date().toISOString(),
      guests,
      tickets,
      checksum: generateToken(16),
    };
  }

  async recordOfflineCheckin(
    deviceId: string,
    qrToken: string,
    result: QrScanResult,
    guestId?: string,
    ticketId?: string
  ) {
    return prisma.offlineCheckin.create({
      data: { deviceId, qrToken, result, guestId, ticketId, synced: false },
    });
  }

  async syncCheckins(deviceId: string) {
    const device = await prisma.offlineDevice.findUnique({ where: { id: deviceId } });
    if (!device) throw new Error("Device not found");

    const pending = await prisma.offlineCheckin.findMany({
      where: { deviceId, synced: false },
    });

    let synced = 0;
    let conflicts = 0;

    for (const checkin of pending) {
      const qrCode = await prisma.qrCode.findUnique({
        where: { token: checkin.qrToken },
        include: { scans: { where: { result: "VALID" }, take: 1 } },
      });

      if (!qrCode) {
        conflicts++;
        continue;
      }

      if (qrCode.scans.length > 0 && checkin.result === "VALID") {
        conflicts++;
        await prisma.offlineCheckin.update({
          where: { id: checkin.id },
          data: { synced: true, syncedAt: new Date() },
        });
        continue;
      }

      if (checkin.result === "VALID") {
        await prisma.qrScan.create({
          data: {
            eventId: qrCode.eventId,
            qrCodeId: qrCode.id,
            guestId: checkin.guestId ?? qrCode.guestId,
            ticketId: checkin.ticketId ?? qrCode.ticketId,
            scannedBy: device.userId,
            result: "VALID",
          },
        });

        if (qrCode.guestId) {
          await prisma.guest.update({
            where: { id: qrCode.guestId },
            data: { status: "CHECKED_IN" },
          });
        }
        if (qrCode.ticketId) {
          await prisma.ticket.update({
            where: { id: qrCode.ticketId },
            data: { status: "USED" },
          });
        }
      }

      await prisma.offlineCheckin.update({
        where: { id: checkin.id },
        data: { synced: true, syncedAt: new Date() },
      });
      synced++;
    }

    await prisma.offlineSyncLog.create({
      data: {
        deviceId,
        action: "SYNC_CHECKINS",
        records: synced,
        conflicts,
      },
    });

    await prisma.offlineDevice.update({
      where: { id: deviceId },
      data: { lastSyncAt: new Date() },
    });

    return { synced, conflicts, pending: pending.length - synced - conflicts };
  }

  async bulkRecordCheckins(
    deviceId: string,
    checkins: { qrToken: string; result: QrScanResult; guestId?: string; ticketId?: string }[]
  ) {
    const created = [];
    for (const c of checkins) {
      const row = await this.recordOfflineCheckin(deviceId, c.qrToken, c.result, c.guestId, c.ticketId);
      created.push(row);
    }
    return created;
  }
}

export const offlineQrService = new OfflineQrService();
