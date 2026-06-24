import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      success: true,
      data: { events: [], guests: [], messages: [], tickets: [], vendors: [], templates: [], contributions: [], memories: [] },
    });
  }

  const userId = session.user.id;

  const [events, guests, messages, tickets, vendors, templates, contributions, memories] = await Promise.all([
    prisma.event.findMany({
      where: {
        organizerId: userId,
        OR: [
          { title: { contains: q } },
          { slug: { contains: q } },
          { hostName: { contains: q } },
        ],
      },
      select: { id: true, title: true, slug: true, startDate: true },
      take: 6,
      orderBy: { startDate: "desc" },
    }),
    prisma.guest.findMany({
      where: {
        event: { organizerId: userId },
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, email: true, eventId: true, event: { select: { title: true } } },
      take: 6,
    }),
    prisma.userMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
        body: { contains: q },
      },
      select: { id: true, body: true, createdAt: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.ticket.findMany({
      where: {
        event: { organizerId: userId },
        OR: [
          { name: { contains: q } },
          { qrToken: { contains: q } },
        ],
      },
      select: { id: true, name: true, qrToken: true, eventId: true, event: { select: { title: true } } },
      take: 5,
    }),
    prisma.vendor.findMany({
      where: {
        isActive: true,
        OR: [
          { businessName: { contains: q } },
          { slug: { contains: q } },
          { category: { contains: q } },
        ],
      },
      select: { id: true, businessName: true, slug: true, category: true },
      take: 5,
    }),
    prisma.invitationCatalogTemplate.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
          { category: { contains: q } },
        ],
      },
      select: { id: true, name: true, slug: true },
      take: 5,
    }),
    prisma.contribution.findMany({
      where: {
        event: { organizerId: userId },
        OR: [
          { contributor: { contains: q } },
          { message: { contains: q } },
        ],
      },
      select: { id: true, contributor: true, amount: true, eventId: true, event: { select: { title: true } } },
      take: 5,
    }),
    prisma.eventMemory.findMany({
      where: {
        event: { organizerId: userId },
        OR: [
          { content: { contains: q } },
          { author: { contains: q } },
        ],
      },
      select: { id: true, content: true, type: true, eventId: true, event: { select: { title: true } } },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      events: events.map((e) => ({ id: e.id, name: e.title, href: `/dashboard/events/${e.id}`, type: "event" as const })),
      guests: guests.map((g) => ({
        id: g.id,
        name: g.name,
        subtitle: g.event.title,
        href: `/dashboard/guests?eventId=${g.eventId}`,
        type: "guest" as const,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        name: m.body.slice(0, 60),
        href: "/dashboard/messages",
        type: "message" as const,
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        name: t.name,
        subtitle: t.event.title,
        href: `/dashboard/tickets?eventId=${t.eventId}`,
        type: "ticket" as const,
      })),
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.businessName,
        subtitle: v.category,
        href: v.slug ? `/marketplace/${v.slug}` : "/marketplace",
        type: "vendor" as const,
      })),
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        href: `/invitations/catalogue/${t.slug}`,
        type: "template" as const,
      })),
      contributions: contributions.map((c) => ({
        id: c.id,
        name: c.contributor,
        subtitle: c.event.title,
        href: `/dashboard/contributions?eventId=${c.eventId}`,
        type: "contribution" as const,
      })),
      memories: memories.map((m) => ({
        id: m.id,
        name: m.content?.slice(0, 60) ?? m.type,
        subtitle: m.event.title,
        href: `/dashboard/memory?eventId=${m.eventId}`,
        type: "memory" as const,
      })),
    },
  });
}
