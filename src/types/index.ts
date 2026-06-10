import type {
  Event,
  EventPackage,
  Guest,
  Invitation,
  Ticket,
  User,
  Campaign,
  Payment,
} from "@prisma/client";

export type EventWithRelations = Event & {
  package?: EventPackage | null;
  _count?: {
    guests: number;
    tickets: number;
    invitations: number;
  };
};

export type GuestWithRsvp = Guest & {
  rsvps: { response: string; message: string | null }[];
};

export type InvitationWithEvent = Invitation & {
  event: Event;
  _count?: { guests: number };
};

export type DashboardStats = {
  eventsCreated: number;
  invitationsGenerated: number;
  ticketsSold: number;
  revenue: number;
  rsvpAccepted: number;
  rsvpDeclined: number;
  rsvpMaybe: number;
  qrScans: number;
};

export type AdminStats = {
  totalUsers: number;
  totalEvents: number;
  totalInvitations: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalMessagesSent: number;
  totalQrScans: number;
};

export interface AIPlannerRequest {
  eventType: string;
  expectedGuests: number;
  budget?: number;
  date: string;
}

export interface AIPlannerResponse {
  budget: { category: string; amount: number; percentage: number }[];
  timeline: { task: string; dueDate: string; priority: string }[];
  attendanceForecast: { expected: number; confidence: number };
  risks: { risk: string; severity: string; mitigation: string }[];
  vendors: { category: string; recommendation: string }[];
  invitationWording: string;
  flyerCaption: string;
  checklist: string[];
  marketingPlan: string[];
  seatingSuggestions?: { recommendedTables: number; seatsPerTable: number; layout: string; vipSection: boolean; notes: string };
  communicationPlan?: { phase: string; channel: string; action: string }[];
}

export interface PaymentInitRequest {
  amount: number;
  currency?: string;
  email: string;
  purpose: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitResponse {
  reference: string;
  authorizationUrl?: string;
  provider: string;
}

export interface CommunicationPreview {
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  message: string;
  recipientCount: number;
  estimatedCost: number;
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
