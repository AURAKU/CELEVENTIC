import type { AIPlannerRequest, AIPlannerResponse } from "@/types";

/**
 * Mock AI Event Planner Service
 * Replace implementations with real AI provider (OpenAI, etc.) in Phase 3
 */
export class AIPlannerService {
  async generatePlan(request: AIPlannerRequest): Promise<AIPlannerResponse> {
    const budget = request.budget ?? request.expectedGuests * 150;

    return {
      budget: [
        { category: "Venue", amount: budget * 0.25, percentage: 25 },
        { category: "Catering", amount: budget * 0.30, percentage: 30 },
        { category: "Decor & Styling", amount: budget * 0.15, percentage: 15 },
        { category: "Entertainment", amount: budget * 0.10, percentage: 10 },
        { category: "Photography/Videography", amount: budget * 0.08, percentage: 8 },
        { category: "Marketing", amount: budget * 0.05, percentage: 5 },
        { category: "Contingency", amount: budget * 0.07, percentage: 7 },
      ],
      timeline: [
        { task: "Finalize venue booking", dueDate: "8 weeks before", priority: "high" },
        { task: "Send save-the-date invitations", dueDate: "6 weeks before", priority: "high" },
        { task: "Confirm vendors and contracts", dueDate: "4 weeks before", priority: "high" },
        { task: "Launch ticket sales", dueDate: "3 weeks before", priority: "medium" },
        { task: "Send formal invitations", dueDate: "2 weeks before", priority: "high" },
        { task: "Final headcount & seating", dueDate: "1 week before", priority: "high" },
        { task: "Event day coordination", dueDate: "Event day", priority: "critical" },
      ],
      attendanceForecast: {
        expected: Math.round(request.expectedGuests * 0.75),
        confidence: 0.82,
      },
      risks: [
        { risk: "Weather disruption for outdoor events", severity: "medium", mitigation: "Secure indoor backup venue" },
        { risk: "Low RSVP response rate", severity: "medium", mitigation: "Send reminders via WhatsApp/SMS" },
        { risk: "Vendor no-show", severity: "high", mitigation: "Confirm 48hrs before with backup vendors" },
      ],
      vendors: [
        { category: "Caterers", recommendation: "Book caterer with experience in " + request.eventType.toLowerCase() + " events" },
        { category: "Decorators", recommendation: "Choose decorators familiar with your theme palette" },
        { category: "Photographers", recommendation: "Hire photographer with event portfolio" },
      ],
      invitationWording: `You are cordially invited to our ${request.eventType.replace(/_/g, " ").toLowerCase()}. Join us for an unforgettable celebration. Please RSVP to confirm your attendance.`,
      flyerCaption: `✨ ${request.eventType.replace(/_/g, " ")} | An experience worth celebrating | RSVP now on Celeventic`,
      checklist: [
        "Define event objectives and budget",
        "Select and book venue",
        "Create guest list",
        "Design and send invitations",
        "Set up ticketing (if applicable)",
        "Arrange catering and refreshments",
        "Plan entertainment program",
        "Set up QR admission system",
        "Prepare event day run-sheet",
        "Post-event thank you messages",
      ],
      marketingPlan: [
        "Create event page on Celeventic",
        "Share on social media platforms",
        "Send bulk WhatsApp invitations",
        "Partner with relevant influencers",
        "Enable early-bird ticket pricing",
        "Run reminder campaigns 1 week before",
      ],
      seatingSuggestions: this.generateSeating(request.expectedGuests, request.eventType),
      communicationPlan: [
        { phase: "6 weeks before", channel: "EMAIL", action: "Save-the-date" },
        { phase: "3 weeks before", channel: "WHATSAPP", action: "Formal invitation with RSVP link" },
        { phase: "1 week before", channel: "SMS", action: "Reminder with venue directions" },
        { phase: "Event day", channel: "SMS", action: "Gate QR code reminder" },
      ],
    };
  }

  private generateSeating(guests: number, eventType: string) {
    const tables = Math.ceil(guests / 8);
    return {
      recommendedTables: tables,
      seatsPerTable: 8,
      layout: eventType === "WEDDING" ? "head-table-with-rounds" : "theater-style",
      vipSection: guests > 100,
      notes: `Arrange ${tables} tables of 8 for ${guests} expected guests`,
    };
  }
}

export const aiPlannerService = new AIPlannerService();
