import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { aiProviderRegistry } from "@/services/ai/ai-provider.registry";
import type { AIPlannerRequest, AIPlannerResponse } from "@/types";

export interface SavePlanInput extends AIPlannerRequest {
  userId: string;
  eventId?: string;
  eventTitle?: string;
  location?: string;
  venue?: string;
  currency?: string;
  eventGoal?: string;
  style?: string;
  culturalPref?: string;
  isTicketed?: boolean;
  isIndoor?: boolean;
  hostDetails?: string;
  regenerate?: boolean;
}

export class EventPlanService {
  async generateAndSave(input: SavePlanInput) {
    const provider = await aiProviderRegistry.getActiveProvider();
    const plan = await provider.generateEventPlan({
      eventType: input.eventType,
      expectedGuests: input.expectedGuests,
      budget: input.budget,
      date: input.date,
    });

    await prisma.aiRequest.create({
      data: {
        userId: input.userId,
        module: "ai_event_planner",
        provider: provider.name,
        status: "completed",
      },
    });

    if (input.eventId && input.regenerate) {
      const existing = await prisma.eventPlan.findFirst({
        where: { eventId: input.eventId, userId: input.userId, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
      });
      if (existing) {
        await prisma.eventPlanVersion.create({
          data: {
            eventPlanId: existing.id,
            version: existing.version,
            planSnapshot: existing.rawPlan as Prisma.InputJsonValue,
          },
        });
        return this.updatePlanFromAi(existing.id, input, plan, provider.name);
      }
    }

    return this.createPlanFromAi(input, plan, provider.name);
  }

  private async createPlanFromAi(input: SavePlanInput, plan: AIPlannerResponse, aiProvider: string) {
    return prisma.eventPlan.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        eventType: input.eventType,
        eventTitle: input.eventTitle,
        budget: input.budget,
        currency: input.currency ?? "GHS",
        guestCount: input.expectedGuests,
        location: input.location,
        venue: input.venue,
        eventDate: input.date ? new Date(input.date) : undefined,
        eventGoal: input.eventGoal,
        style: input.style,
        culturalPref: input.culturalPref,
        isTicketed: input.isTicketed ?? false,
        isIndoor: input.isIndoor,
        hostDetails: input.hostDetails,
        planSummary: plan.invitationWording,
        aiProvider,
        rawPlan: plan as unknown as Prisma.InputJsonValue,
        budgetItems: {
          create: plan.budget.map((b) => ({
            category: b.category,
            estimatedAmount: b.amount,
            priority: "medium",
            notes: `${b.percentage}% of budget`,
          })),
        },
        timelineItems: {
          create: plan.timeline.map((t) => ({
            title: t.task,
            dueDate: t.dueDate,
            priority: t.priority,
            phase: "planning",
          })),
        },
        checklistItems: {
          create: plan.checklist.map((task) => ({
            task,
            priority: "medium",
          })),
        },
        riskScores: {
          create: plan.risks.map((r) => ({
            riskType: r.risk,
            severity: r.severity,
            recommendation: r.mitigation,
            score: r.severity === "high" ? 80 : r.severity === "medium" ? 55 : 30,
          })),
        },
      },
      include: this.planInclude(),
    });
  }

  private async updatePlanFromAi(planId: string, input: SavePlanInput, plan: AIPlannerResponse, aiProvider: string) {
    await prisma.$transaction([
      prisma.eventBudgetItem.deleteMany({ where: { eventPlanId: planId } }),
      prisma.eventTimelineItem.deleteMany({ where: { eventPlanId: planId } }),
      prisma.eventChecklistItem.deleteMany({ where: { eventPlanId: planId } }),
      prisma.eventRiskScore.deleteMany({ where: { eventPlanId: planId } }),
    ]);

    return prisma.eventPlan.update({
      where: { id: planId },
      data: {
        eventType: input.eventType,
        budget: input.budget,
        guestCount: input.expectedGuests,
        eventDate: input.date ? new Date(input.date) : undefined,
        planSummary: plan.invitationWording,
        aiProvider,
        rawPlan: plan as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
        budgetItems: {
          create: plan.budget.map((b) => ({
            category: b.category,
            estimatedAmount: b.amount,
            priority: "medium",
            notes: `${b.percentage}% of budget`,
          })),
        },
        timelineItems: {
          create: plan.timeline.map((t) => ({
            title: t.task,
            dueDate: t.dueDate,
            priority: t.priority,
            phase: "planning",
          })),
        },
        checklistItems: {
          create: plan.checklist.map((task) => ({ task, priority: "medium" })),
        },
        riskScores: {
          create: plan.risks.map((r) => ({
            riskType: r.risk,
            severity: r.severity,
            recommendation: r.mitigation,
            score: r.severity === "high" ? 80 : r.severity === "medium" ? 55 : 30,
          })),
        },
      },
      include: this.planInclude(),
    });
  }

  async getPlanByEvent(eventId: string, userId: string) {
    return prisma.eventPlan.findFirst({
      where: { eventId, userId, status: "ACTIVE" },
      include: this.planInclude(),
      orderBy: { updatedAt: "desc" },
    });
  }

  async getPlanById(planId: string) {
    return prisma.eventPlan.findUnique({
      where: { id: planId },
      include: this.planInclude(),
    });
  }

  private async assertPlanItemAccess(
    itemId: string,
    entity: "checklist" | "budget" | "timeline",
    userId: string,
    role: import("@prisma/client").UserRole
  ) {
    const { isAdminRole } = await import("@/lib/roles");
    let planId: string | undefined;

    if (entity === "checklist") {
      const item = await prisma.eventChecklistItem.findUnique({
        where: { id: itemId },
        select: { eventPlanId: true },
      });
      planId = item?.eventPlanId;
    } else if (entity === "budget") {
      const item = await prisma.eventBudgetItem.findUnique({
        where: { id: itemId },
        select: { eventPlanId: true },
      });
      planId = item?.eventPlanId;
    } else {
      const item = await prisma.eventTimelineItem.findUnique({
        where: { id: itemId },
        select: { eventPlanId: true },
      });
      planId = item?.eventPlanId;
    }

    if (!planId) throw new Error("Plan item not found");

    const plan = await prisma.eventPlan.findFirst({
      where: isAdminRole(role) ? { id: planId } : { id: planId, userId },
    });
    if (!plan) throw new Error("Plan item not found or access denied");
    return plan;
  }

  async updateChecklistItem(
    itemId: string,
    data: { task?: string; status?: string; priority?: string },
    userId: string,
    role: import("@prisma/client").UserRole
  ) {
    await this.assertPlanItemAccess(itemId, "checklist", userId, role);
    return prisma.eventChecklistItem.update({ where: { id: itemId }, data });
  }

  async updateBudgetItem(
    itemId: string,
    data: { category?: string; estimatedAmount?: number; notes?: string; priority?: string },
    userId: string,
    role: import("@prisma/client").UserRole
  ) {
    await this.assertPlanItemAccess(itemId, "budget", userId, role);
    return prisma.eventBudgetItem.update({
      where: { id: itemId },
      data: {
        category: data.category,
        estimatedAmount: data.estimatedAmount,
        notes: data.notes,
        priority: data.priority,
      },
    });
  }

  async updateTimelineItem(
    itemId: string,
    data: { title?: string; dueDate?: string; status?: string; priority?: string },
    userId: string,
    role: import("@prisma/client").UserRole
  ) {
    await this.assertPlanItemAccess(itemId, "timeline", userId, role);
    return prisma.eventTimelineItem.update({ where: { id: itemId }, data });
  }

  private planInclude() {
    return {
      budgetItems: true,
      timelineItems: true,
      checklistItems: true,
      riskScores: true,
    } as const;
  }
}

export const eventPlanService = new EventPlanService();
