import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { celeYouConnectSearchText } from "@/lib/celeyou-connect/pair";
import {
  connectionHasExportableConsent,
  connectionsToCsv,
  mergeConnectionTags,
  normalizeConnectionLabel,
  ownerLabelsFromTags,
  parseConnectionSource,
  resolveOwnerReminderDueAt,
  type CeleYouConnectionExportRow,
} from "@/lib/celeyou-connect/workspace";
import {
  emptyLeadStatusCounts,
  parseCeleCardLeadStatus,
  type CeleCardLeadStatus,
} from "@/lib/digital-business-card/leads";

async function ownedCard(userId: string, cardId: string) {
  return prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId, deletedAt: null },
    select: { id: true },
  });
}

export function toOwnerConnectionView(row: {
  id: string;
  visitorName: string;
  visitorEmail: string | null;
  visitorPhone: string | null;
  visitorCompany: string | null;
  visitorTitle: string | null;
  source: string;
  status: string;
  note: string | null;
  ownerNote: string | null;
  tags: unknown;
  createdAt: Date;
  followupConsentAt: Date | null;
  lastFollowupAt: Date | null;
  reminders?: Array<{ id: string; dueAt: Date; status: string; note: string | null }>;
}) {
  const labels = ownerLabelsFromTags(row.tags);
  const nextReminder = (row.reminders || []).find((item) => item.status === "SCHEDULED" || item.status === "DUE");
  return {
    id: row.id,
    visitorName: row.visitorName,
    visitorEmail: row.visitorEmail,
    visitorPhone: row.visitorPhone,
    visitorCompany: row.visitorCompany,
    visitorTitle: row.visitorTitle,
    source: row.source,
    status: row.status,
    note: row.note,
    ownerNote: row.ownerNote,
    labels,
    createdAt: row.createdAt.toISOString(),
    followupConsentAt: row.followupConsentAt?.toISOString() ?? null,
    lastFollowupAt: row.lastFollowupAt?.toISOString() ?? null,
    reminder: nextReminder
      ? {
          id: nextReminder.id,
          dueAt: nextReminder.dueAt.toISOString(),
          status: nextReminder.status,
          note: nextReminder.note,
        }
      : null,
  };
}

export async function listOwnerConnections(
  userId: string,
  cardId: string,
  input: { page?: number; status?: string | null; query?: string | null; source?: string | null; label?: string | null }
) {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const take = 20;
  const page = Math.max(1, input.page || 1);
  const skip = (page - 1) * take;
  const source = parseConnectionSource(input.source);
  const label = input.label ? normalizeConnectionLabel(input.label) : null;
  const needle = (input.query || "").trim().toLowerCase().slice(0, 80);
  const status = parseCeleCardLeadStatus(input.status);
  const scoped: Prisma.SmartCardConnectionWhereInput = {
    cardId,
    ...(source ? { source } : {}),
    ...(needle ? { searchText: { contains: needle } } : {}),
  };
  // SQLite Json array_contains is not portable. Filter labels in memory on the page window
  // after indexed search/status/source. Label filter uses a contains on searchText instead.
  if (label) {
    scoped.searchText = needle ? { contains: needle } : { contains: label };
  }
  const where: Prisma.SmartCardConnectionWhereInput = {
    ...scoped,
    ...(status ? { status } : { NOT: { status: "ARCHIVED" } }),
  };
  const [items, total, statusRows] = await Promise.all([
    prisma.smartCardConnection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        reminders: {
          where: { status: { in: ["SCHEDULED", "DUE"] } },
          orderBy: { dueAt: "asc" },
          take: 1,
        },
      },
    }),
    prisma.smartCardConnection.count({ where }),
    prisma.smartCardConnection.findMany({
      where: scoped,
      select: { status: true },
    }),
  ]);
  const counts = emptyLeadStatusCounts();
  for (const row of statusRows) {
    const key = parseCeleCardLeadStatus(row.status);
    if (key) counts[key] += 1;
  }
  const views = items
    .map(toOwnerConnectionView)
    .filter((item) => (label ? item.labels.includes(label) : true));
  return {
    items: views,
    total,
    page,
    pageSize: take,
    status: status ?? "ALL",
    source,
    label,
    counts,
  };
}

export async function syncLeadStatusEffects(
  userId: string,
  cardId: string,
  connectionId: string,
  status: CeleCardLeadStatus
) {
  if (status === "FOLLOW_UP") {
    const open = await prisma.celeYouConnectReminder.findFirst({
      where: { connectionId, cardId, status: { in: ["SCHEDULED", "DUE"] } },
      select: { id: true },
    });
    if (!open) {
      await scheduleOwnerReminder(userId, cardId, connectionId, 24, "Follow up");
    }
    return;
  }
  if (status === "WON" || status === "ARCHIVED") {
    await prisma.celeYouConnectReminder.updateMany({
      where: { connectionId, cardId, status: { in: ["SCHEDULED", "DUE"] } },
      data: {
        status: status === "WON" ? "COMPLETED" : "CANCELLED",
        completedAt: status === "WON" ? new Date() : null,
      },
    });
  }
}

export async function updateOwnerConnectionLabels(userId: string, cardId: string, connectionId: string, labels: string[]) {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const existing = await prisma.smartCardConnection.findFirst({ where: { id: connectionId, cardId } });
  if (!existing) return { error: "Request not found" as const };
  const tags = mergeConnectionTags(existing.tags, labels);
  const searchText = celeYouConnectSearchText({
    visitorName: existing.visitorName,
    visitorEmail: existing.visitorEmail,
    visitorPhone: existing.visitorPhone,
    visitorCompany: existing.visitorCompany,
    visitorTitle: existing.visitorTitle,
    note: [existing.ownerNote, ownerLabelsFromTags(tags).join(" ")].filter(Boolean).join(" "),
  });
  const updated = await prisma.smartCardConnection.update({
    where: { id: existing.id },
    data: { tags, searchText },
  });
  await prisma.celeYouConnectEvent
    .create({
      data: {
        connectionId: existing.id,
        cardId,
        kind: "STATUS_CHANGED",
        actorUserId: userId,
        meta: { labels: ownerLabelsFromTags(tags) },
      },
    })
    .catch(() => undefined);
  return { connection: updated };
}

export async function deleteOwnerConnection(userId: string, cardId: string, connectionId: string) {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const existing = await prisma.smartCardConnection.findFirst({ where: { id: connectionId, cardId } });
  if (!existing) return { error: "Request not found" as const };
  await prisma.smartCardConnection.delete({ where: { id: existing.id } });
  return { deleted: true as const, id: existing.id };
}

export async function scheduleOwnerReminder(
  userId: string,
  cardId: string,
  connectionId: string,
  hoursOrDue:
    | number
    | {
        hours?: number | null;
        preset?: string | null;
        dueAt?: string | Date | null;
        note?: string | null;
        /** When false, do not move NEW → FOLLOW_UP. Default true for Follow up defaults. */
        promoteFollowUp?: boolean;
      },
  note?: string | null
) {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const existing = await prisma.smartCardConnection.findFirst({ where: { id: connectionId, cardId } });
  if (!existing) return { error: "Request not found" as const };
  const options =
    typeof hoursOrDue === "number"
      ? { hours: hoursOrDue, note, promoteFollowUp: true as const }
      : hoursOrDue;
  const dueAt =
    options.dueAt instanceof Date
      ? options.dueAt
      : resolveOwnerReminderDueAt({
          reminderHours: options.hours,
          reminderPreset: options.preset,
          reminderDueAt: typeof options.dueAt === "string" ? options.dueAt : null,
        });
  await prisma.celeYouConnectReminder.updateMany({
    where: { connectionId, cardId, status: { in: ["SCHEDULED", "DUE"] } },
    data: { status: "CANCELLED" },
  });
  const reminder = await prisma.celeYouConnectReminder.create({
    data: {
      connectionId,
      cardId,
      dueAt,
      status: "SCHEDULED",
      note: (options.note ?? note)?.trim().slice(0, 200) || null,
    },
  });
  if (options.promoteFollowUp !== false && existing.status === "NEW") {
    await prisma.smartCardConnection.update({
      where: { id: connectionId },
      data: { status: "FOLLOW_UP" },
    });
  }
  await prisma.celeYouConnectEvent
    .create({
      data: {
        connectionId,
        cardId,
        kind: "REMINDER_CREATED",
        actorUserId: userId,
        meta: { reminderId: reminder.id, dueAt: reminder.dueAt.toISOString() },
      },
    })
    .catch(() => undefined);
  return { reminder };
}

export async function completeOwnerReminder(userId: string, cardId: string, reminderId: string) {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const reminder = await prisma.celeYouConnectReminder.findFirst({ where: { id: reminderId, cardId } });
  if (!reminder) return { error: "Reminder not found" as const };
  const updated = await prisma.celeYouConnectReminder.update({
    where: { id: reminder.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  return { reminder: updated };
}

/** Cancel without changing the connection stage. */
export async function cancelOwnerReminder(userId: string, cardId: string, reminderId: string) {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const reminder = await prisma.celeYouConnectReminder.findFirst({ where: { id: reminderId, cardId } });
  if (!reminder) return { error: "Reminder not found" as const };
  if (reminder.status !== "SCHEDULED" && reminder.status !== "DUE") {
    return { reminder };
  }
  const updated = await prisma.celeYouConnectReminder.update({
    where: { id: reminder.id },
    data: { status: "CANCELLED" },
  });
  await prisma.celeYouConnectEvent
    .create({
      data: {
        connectionId: reminder.connectionId,
        cardId,
        kind: "REMINDER_CANCELLED",
        actorUserId: userId,
        meta: { reminderId: reminder.id },
      },
    })
    .catch(() => undefined);
  return { reminder: updated };
}

export async function exportOwnerConnections(userId: string, cardId: string): Promise<
  | { csv: string; count: number }
  | null
> {
  const card = await ownedCard(userId, cardId);
  if (!card) return null;
  const rows = await prisma.smartCardConnection.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const exportable: CeleYouConnectionExportRow[] = rows
    .filter((row) =>
      connectionHasExportableConsent({
        consentAt: row.consentAt,
        followupConsentAt: row.followupConsentAt,
        visitorEmail: row.visitorEmail,
        visitorPhone: row.visitorPhone,
      })
    )
    .map((row) => ({
      visitorName: row.visitorName,
      visitorEmail: row.visitorEmail,
      visitorPhone: row.visitorPhone,
      visitorCompany: row.visitorCompany,
      visitorTitle: row.visitorTitle,
      source: row.source,
      status: row.status,
      labels: ownerLabelsFromTags(row.tags),
      createdAt: row.createdAt.toISOString(),
    }));
  return { csv: connectionsToCsv(exportable), count: exportable.length };
}
