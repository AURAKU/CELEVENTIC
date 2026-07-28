import { prisma } from "@/lib/prisma";
import { maybeKickQueueJob } from "@/lib/jobs/inline-queue-kick";
import {
  GENERAL_PASS_QUEUE,
  GUEST_IMPORT_DELIVERY_QUEUE,
  GUEST_IMPORT_QUEUE,
} from "@/services/guest-import/queues";

const generateInFlight = new Set<string>();
const deliveryInFlight = new Set<string>();
const generalPassInFlight = new Set<string>();

/**
 * Kick generation for a guest-import batch if the dedicated worker isn't alive.
 * Safe to call on every progress poll — no-ops when busy, finished, or worker-up.
 */
export async function maybeKickGuestImportBatch(batchId: string): Promise<void> {
  await maybeKickQueueJob({
    queue: GUEST_IMPORT_QUEUE,
    batchId,
    envKey: "GUEST_IMPORT_INLINE_KICK_ENABLED",
    inFlight: generateInFlight,
    logLabel: "guest-import",
    shouldRun: async () => {
      const batch = await prisma.guestImportBatch.findUnique({
        where: { id: batchId },
        select: { status: true },
      });
      return Boolean(batch && ["READY", "GENERATING"].includes(batch.status));
    },
    run: async (id) => {
      const { runGuestImportJob } = await import("@/services/guest-import/generation.service");
      await runGuestImportJob(id);
    },
  });
}

/**
 * Kick queued invitation deliveries when the worker is offline.
 * Safe on send + delivery list polls.
 */
export async function maybeKickGuestImportDelivery(batchId: string): Promise<void> {
  await maybeKickQueueJob({
    queue: GUEST_IMPORT_DELIVERY_QUEUE,
    batchId,
    envKey: "GUEST_IMPORT_INLINE_KICK_ENABLED",
    inFlight: deliveryInFlight,
    logLabel: "guest-import-delivery",
    shouldRun: async () => {
      const remaining = await prisma.guestImportDelivery.count({
        where: { batchId, status: { in: ["QUEUED", "SENDING"] } },
      });
      return remaining > 0;
    },
    run: async (id) => {
      const { runDeliveryJob } = await import("@/services/guest-import/delivery.service");
      await runDeliveryJob(id);
    },
  });
}

/**
 * Kick fixed-quantity general-pass minting when the worker is offline.
 */
export async function maybeKickGeneralPassBatch(batchId: string): Promise<void> {
  await maybeKickQueueJob({
    queue: GENERAL_PASS_QUEUE,
    batchId,
    envKey: "GUEST_IMPORT_INLINE_KICK_ENABLED",
    inFlight: generalPassInFlight,
    logLabel: "general-pass",
    shouldRun: async () => {
      const batch = await prisma.generalPassBatch.findUnique({
        where: { id: batchId },
        select: { status: true, method: true },
      });
      return Boolean(
        batch && batch.method === "FIXED_QUANTITY" && batch.status === "GENERATING"
      );
    },
    run: async (id) => {
      const { runGeneralPassJob } = await import("@/services/guest-import/general-pass.service");
      await runGeneralPassJob(id);
    },
  });
}
