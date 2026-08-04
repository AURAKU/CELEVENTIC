import type { GuestStatus, InvitationStatus, GuestPassStatus } from "@prisma/client";
import type { ClassifiedIdentity } from "@/lib/admission-identity/classify";

export interface AdmissionIdentityAuditRow {
  invitationId: string;
  partyId: string;
  displayName: string;
  primaryGuestName: string | null;
  primaryGuestId: string | null;
  eventId: string;
  eventTitle: string;
  partySize: number;
  namedMemberCount: number;
  additionalGuestSlots: number;
  uniqueLink: string;
  invitePath: string;
  invitationStatus: InvitationStatus;
  guestStatus: GuestStatus | null;
  admissionState: string;
  admittedCount: number;
  remainingCount: number;
  admissionCode: string | null;
  passStatus: GuestPassStatus | null;
  passId: string | null;
  identity: ClassifiedIdentity;
  createdAt: string;
  updatedAt: string;
  duplicateHint: string | null;
}

export interface AuditSummary {
  totalInvitations: number;
  incomplete: number;
  missingQr: number;
  missingCode: number;
  missingLink: number;
  complete: number;
  revoked: number;
  duplicateCode: number;
}
