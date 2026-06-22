import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(queue: string, handler: JobHandler) {
  handlers.set(queue, handler);
}

export async function dispatchJob(
  queue: string,
  payload: Record<string, unknown>,
  maxAttempts = 3
) {
  return prisma.backgroundJob.create({
    data: {
      queue,
      payload: payload as Prisma.InputJsonValue,
      maxAttempts,
      status: "PENDING",
    },
  });
}

export async function processJobs(queue: string, batchSize = 10) {
  const jobs = await prisma.backgroundJob.findMany({
    where: { queue, status: "PENDING" },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  const handler = handlers.get(queue);
  if (!handler) return { processed: 0 };

  let processed = 0;
  for (const job of jobs) {
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    try {
      await handler(job.payload as Record<string, unknown>);
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED", processedAt: new Date() },
      });
      processed++;
    } catch (error) {
      const attempts = job.attempts + 1;
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: attempts >= job.maxAttempts ? "FAILED" : "PENDING",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return { processed };
}
