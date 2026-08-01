-- Premium Thank You Page + unified guest-message fields (SQLite-safe, additive).

-- ThankYouPage content / design / publish metadata
ALTER TABLE "thank_you_pages" ADD COLUMN "eyebrow" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "subtitle" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "closingMessage" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "signatureLine" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "hostNames" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "eventHashtag" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "footerText" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "heroImageUrl" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "backgroundImageUrl" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "backgroundVideoUrl" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "signatureImageUrl" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "themeSource" TEXT NOT NULL DEFAULT 'INVITATION';
ALTER TABLE "thank_you_pages" ADD COLUMN "designConfig" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "sectionConfig" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "guestbookConfig" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "sharingConfig" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "seoConfig" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "featuredMemoryIds" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "thank_you_pages" ADD COLUMN "lastPublishedSnapshot" JSON;
ALTER TABLE "thank_you_pages" ADD COLUMN "updatedById" TEXT;
ALTER TABLE "thank_you_pages" ADD COLUMN "scheduledPublishAt" DATETIME;
ALTER TABLE "thank_you_pages" ADD COLUMN "archivedAt" DATETIME;

-- InvitationGuestWish: thank-you / companion / moderation / ownership
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "title" TEXT;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'INVITATION';
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "editedAt" DATETIME;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "moderatedAt" DATETIME;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "moderatedById" TEXT;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "moderationReason" TEXT;
ALTER TABLE "invitation_guest_wishes" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_eventId_status_createdAt_idx"
  ON "invitation_guest_wishes"("eventId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "invitation_guest_wishes_eventId_source_idx"
  ON "invitation_guest_wishes"("eventId", "source");
