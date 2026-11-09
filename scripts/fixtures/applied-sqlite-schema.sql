CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ORGANIZER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accountType" TEXT,
    "username" TEXT,
    "companyName" TEXT,
    "onboardingCompletedAt" DATETIME,
    "organizationId" TEXT,
    "emailVerified" DATETIME,
    "phoneVerified" DATETIME,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "sessionInvalidatedAt" DATETIME,
    "acceptedTermsVersion" TEXT,
    "acceptedPrivacyVersion" TEXT,
    "cookieConsent" TEXT,
    "consentTimestamp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "featureConfigVersion" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "venueName" TEXT,
    "landmark" TEXT,
    "mapsLink" TEXT,
    "contactPhone" TEXT,
    "dressCode" TEXT,
    "expectedGuests" INTEGER,
    "pricingType" TEXT NOT NULL DEFAULT 'FREE',
    "coverImageUrl" TEXT,
    "logoUrl" TEXT,
    "qrCenterImageUrl" TEXT,
    "qrLogoSize" TEXT,
    "defaultMusicTrackId" TEXT,
    "themeId" TEXT,
    "packageId" TEXT,
    "organizationId" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT DEFAULT 'GH',
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "organizerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, "rsvpDeadline" DATETIME,
    CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "event_packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "event_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "events_defaultMusicTrackId_fkey" FOREIGN KEY ("defaultMusicTrackId") REFERENCES "invitation_music_tracks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "guestLimit" INTEGER NOT NULL DEFAULT 100,
    "invitationLimit" INTEGER NOT NULL DEFAULT 50,
    "ticketLimit" INTEGER NOT NULL DEFAULT 500,
    "smsCredits" INTEGER NOT NULL DEFAULT 0,
    "emailCredits" INTEGER NOT NULL DEFAULT 0,
    "whatsappCredits" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "event_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eventType" TEXT,
    "supportedEventTypes" TEXT,
    "previewUrl" TEXT,
    "config" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "event_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_media_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "templateId" TEXT,
    "message" TEXT,
    "designConfig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "uniqueLink" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "admissionState" TEXT NOT NULL DEFAULT 'NOT_ADMITTED',
    "admittedCount" INTEGER NOT NULL DEFAULT 0,
    "admissionAllowance" INTEGER,
    "postAdmissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "portalTokenVersion" INTEGER NOT NULL DEFAULT 0,
    "portalConfig" TEXT,
    "featureConfig" TEXT,
    "featureVersion" INTEGER NOT NULL DEFAULT 1,
    "lastMigratedAt" DATETIME,
    "importBatchId" TEXT,
    "generalPassBatchId" TEXT,
    "isGeneralPass" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    CONSTRAINT "invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "event_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitations_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "guest_import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitations_generalPassBatchId_fkey" FOREIGN KEY ("generalPassBatchId") REFERENCES "general_pass_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guest_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "guests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT,
    "groupId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "qrToken" TEXT NOT NULL,
    "manualCode" TEXT,
    "plusOnes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "inviteOpenedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "importBatchId" TEXT,
    "partyType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "archivedAt" DATETIME,
    CONSTRAINT "guests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guests_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "guest_groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guests_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "guest_import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_guest_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guest_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guest_tag_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_tag_assignments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "event_guest_tags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "rsvps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "rsvps_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "admission_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "partyMemberId" TEXT,
    "action" TEXT NOT NULL,
    "admittedQuantity" INTEGER NOT NULL DEFAULT 0,
    "previousAdmittedCount" INTEGER NOT NULL DEFAULT 0,
    "resultingAdmittedCount" INTEGER NOT NULL DEFAULT 0,
    "scannerDeviceId" TEXT,
    "scannerUserId" TEXT,
    "organiserId" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "offlineCreatedAt" DATETIME,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admission_events_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FREE',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "promoCode" TEXT,
    "qrToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ticket_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "promoCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ticket_orders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_orders_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ticket_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "reference" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "baseCurrency" TEXT NOT NULL DEFAULT 'GHS',
    "baseAmount" DECIMAL,
    "displayCurrency" TEXT,
    "displayAmount" DECIMAL,
    "exchangeRate" DECIMAL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" TEXT,
    "ticketOrderId" TEXT,
    "campaignId" TEXT,
    "invitationOrderId" TEXT,
    "vendorBookingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_ticketOrderId_fkey" FOREIGN KEY ("ticketOrderId") REFERENCES "ticket_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_invitationOrderId_fkey" FOREIGN KEY ("invitationOrderId") REFERENCES "invitation_orders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "payments_vendorBookingId_fkey" FOREIGN KEY ("vendorBookingId") REFERENCES "vendor_bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "payment_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "qr_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "ticketId" TEXT,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_codes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qr_codes_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "qr_codes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "qr_scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "guestId" TEXT,
    "ticketId" TEXT,
    "guestPassId" TEXT,
    "scannedBy" TEXT,
    "gate" TEXT,
    "result" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qr_scans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "qr_scans_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "qr_codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "qr_scans_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "qr_scans_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "qr_scans_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "qr_scans_guestPassId_fkey" FOREIGN KEY ("guestPassId") REFERENCES "guest_passes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "offline_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "isAuthorized" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offline_devices_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "offline_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "offline_checkins" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "guestId" TEXT,
    "ticketId" TEXT,
    "guestPassId" TEXT,
    "qrToken" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" DATETIME,
    "clientRecordId" TEXT,
    "admittedQuantity" INTEGER NOT NULL DEFAULT 1,
    "conflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictReason" TEXT,
    "usedManualCode" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "offline_checkins_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "offline_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "offline_checkins_guestPassId_fkey" FOREIGN KEY ("guestPassId") REFERENCES "guest_passes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "offline_sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "records" INTEGER NOT NULL DEFAULT 0,
    "conflicts" INTEGER NOT NULL DEFAULT 0,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offline_sync_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "offline_devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "guestTier" INTEGER NOT NULL DEFAULT 50,
    "totalCost" DECIMAL NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaigns_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "campaign_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "guestName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_messages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "message_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_logs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "campaign_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "vendor_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceGhs" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "durationDays" INTEGER NOT NULL DEFAULT 365,
    "imageLimit" INTEGER NOT NULL DEFAULT 10,
    "videoLimit" INTEGER NOT NULL DEFAULT 2,
    "storageLimitMb" INTEGER NOT NULL DEFAULT 500,
    "categoryLimit" INTEGER NOT NULL DEFAULT 2,
    "portfolioEventLimit" INTEGER NOT NULL DEFAULT 5,
    "verifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "featuredSearch" BOOLEAN NOT NULL DEFAULT false,
    "advancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "priorityLeads" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "vendors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT,
    "businessName" TEXT NOT NULL,
    "vendorType" TEXT NOT NULL DEFAULT 'individual',
    "ownerName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Ghana',
    "serviceAreas" TEXT,
    "yearsExperience" INTEGER,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "rating" DECIMAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_VERIFIED',
    "planId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trustScore" DECIMAL NOT NULL DEFAULT 0,
    "responseRate" DECIMAL NOT NULL DEFAULT 0,
    "averageResponseTime" INTEGER,
    "completedEventsCount" INTEGER NOT NULL DEFAULT 0,
    "isClaimable" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendors_planId_fkey" FOREIGN KEY ("planId") REFERENCES "vendor_plans" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_category_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "vendor_category_assignments_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_category_assignments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "vendor_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_social_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_social_links_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "eventReferenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_media_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_media_eventReferenceId_fkey" FOREIGN KEY ("eventReferenceId") REFERENCES "vendor_event_references" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_rate_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "priceMin" DECIMAL NOT NULL,
    "priceMax" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "description" TEXT,
    "packageType" TEXT,
    "duration" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_rate_cards_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_event_references" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "eventType" TEXT,
    "location" TEXT,
    "eventYear" INTEGER,
    "roleProvided" TEXT,
    "testimonial" TEXT,
    "celeventicEventId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_event_references_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "eventId" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_availability_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT,
    "eventType" TEXT,
    "eventDate" DATETIME,
    "guestCount" INTEGER,
    "budgetMin" DECIMAL,
    "budgetMax" DECIMAL,
    "location" TEXT,
    "message" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendor_leads_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_leads_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "expiresAt" DATETIME,
    "acceptedAt" DATETIME,
    "declinedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "vendor_quotes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "vendor_leads" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_quotes_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_quotes_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_quote_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "depositAmount" DECIMAL,
    "depositPercent" DECIMAL,
    "description" TEXT,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "deliverables" TEXT,
    "paymentSchedule" TEXT,
    "cancellationTerms" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_quote_versions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "vendor_quotes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_verification_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "idDocumentUrl" TEXT,
    "businessDocumentUrl" TEXT,
    "socialProofUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_verification_requests_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_favorites_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_claim_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proofEmail" TEXT,
    "proofPhone" TEXT,
    "proofDocUrl" TEXT,
    "socialProof" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_claim_requests_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_claim_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_subscriptions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "vendor_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_analytics_events_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceFrom" DECIMAL NOT NULL,
    "priceTo" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_services_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "leadId" TEXT,
    "quoteId" TEXT,
    "eventId" TEXT,
    "serviceName" TEXT,
    "eventType" TEXT,
    "eventDate" DATETIME,
    "location" TEXT,
    "guestCount" INTEGER,
    "agreedAmount" DECIMAL NOT NULL,
    "depositAmount" DECIMAL,
    "remainingAmount" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "platformCommission" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'INQUIRY',
    "deliverables" TEXT,
    "cancellationTerms" TEXT,
    "refundTerms" TEXT,
    "contractVersion" INTEGER NOT NULL DEFAULT 1,
    "organizerAcceptedAt" DATETIME,
    "vendorAcceptedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "notes" TEXT,
    "threadId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "vendor_bookings_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_bookings_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_bookings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "vendor_leads" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vendor_bookings_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "vendor_quotes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "booking_milestones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "evidenceUrl" TEXT,
    "vendorNotes" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "booking_milestones_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "vendor_bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "escrow_holds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "commissionAmount" DECIMAL NOT NULL DEFAULT 0,
    "netVendorAmount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "fundedAt" DATETIME,
    "releasedAt" DATETIME,
    "frozenAt" DATETIME,
    "frozenReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "escrow_holds_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "vendor_bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "escrow_releases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holdId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "reason" TEXT,
    "releasedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "escrow_releases_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "escrow_holds" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_payouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "eligibleAt" DATETIME,
    "paidAt" DATETIME,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendor_payouts_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "vendor_bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_payouts_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "marketplace_disputes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPENED',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "marketplace_disputes_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "vendor_bookings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "marketplace_disputes_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "marketplace_commission_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "commissionPercent" DECIMAL NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "categorySlug" TEXT,
    "vendorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "venues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "region" TEXT,
    "priceFrom" DECIMAL NOT NULL,
    "priceTo" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "mapsLink" TEXT,
    "photos" TEXT,
    "coverImage" TEXT,
    "amenities" TEXT,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "hasGenerator" BOOLEAN NOT NULL DEFAULT false,
    "hasAc" BOOLEAN NOT NULL DEFAULT false,
    "hasSecurity" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "venues_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "venue_availability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "venue_availability_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "venue_bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "venue_bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "venue_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_portfolio_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "eventType" TEXT,
    "location" TEXT,
    "eventDate" DATETIME,
    "description" TEXT,
    "coverImage" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_portfolio_cases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "advertisements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "type" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "ad_placements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ad_placements_adId_fkey" FOREIGN KEY ("adId") REFERENCES "advertisements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0,
    "expenses" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "wallets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "reference" TEXT,
    "paymentId" TEXT,
    "description" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "wallet_transactions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "contributions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "contributor" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "message" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'FAMILY_SUPPORT',
    "paymentMethod" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contributions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "author" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_memories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_guest_wishes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "title" TEXT,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "source" TEXT NOT NULL DEFAULT 'INVITATION',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorTokenHash" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "editedAt" DATETIME,
    "moderatedAt" DATETIME,
    "moderatedById" TEXT,
    "moderationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitation_guest_wishes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitation_guest_wishes_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "invitation_guest_wishes_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "user_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "leadId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "user_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "vendor_leads" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "country" TEXT NOT NULL DEFAULT 'GH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "two_factor_auth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "two_factor_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "flyer_designs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FLYER',
    "config" TEXT,
    "previewUrl" TEXT,
    "exportUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "flyer_designs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "flyer_designs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "digital_business_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "bio" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "socials" TEXT NOT NULL DEFAULT '{}',
    "themeId" TEXT NOT NULL DEFAULT 'elegant-frost',
    "avatarUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "nfcEnabled" BOOLEAN NOT NULL DEFAULT true,
    "connectBackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultMode" TEXT NOT NULL DEFAULT 'professional',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "subscriptionExpiresAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "offlineSnapshotVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "digital_business_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "smartcard_variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "overrides" TEXT NOT NULL DEFAULT '{}',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "smartcard_variants_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "digital_business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "smartcard_nfc_devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "claimSecretHash" TEXT,
    "name" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'card',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedMode" TEXT,
    "campaignId" TEXT,
    "tapCount" INTEGER NOT NULL DEFAULT 0,
    "lastTapAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "smartcard_nfc_devices_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "digital_business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "smartcard_nfc_devices_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "smartcard_campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "smartcard_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "visitorName" TEXT NOT NULL,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "visitorCompany" TEXT,
    "visitorTitle" TEXT,
    "note" TEXT,
    "formMode" TEXT NOT NULL DEFAULT 'Instant',
    "source" TEXT NOT NULL DEFAULT 'connect_back',
    "campaignId" TEXT,
    "eventId" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "consentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "smartcard_connections_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "digital_business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "smartcard_connections_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "smartcard_campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "smartcard_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "mode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "smartcard_campaigns_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "digital_business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "smartcard_interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "campaignId" TEXT,
    "kind" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "smartcard_interactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "digital_business_cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "smartcard_interactions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "smartcard_campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "inspiration_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "analysis" TEXT,
    "upgradeStyle" TEXT,
    "generatedUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inspiration_uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inspiration_uploads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_gates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_gates_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gateId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'scanner',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_staff_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "event_staff_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "event_gates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "seating_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planType" TEXT NOT NULL DEFAULT 'RECEPTION',
    "layout" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seating_plans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "seating_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatingPlanId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "seatLabel" TEXT,
    "zone" TEXT,
    "notes" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "seating_assignments_seatingPlanId_fkey" FOREIGN KEY ("seatingPlanId") REFERENCES "seating_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_assignments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "seating_companion_holds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "seatingPlanId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "ownerGuestId" TEXT,
    "companionIndex" INTEGER NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "seatLabel" TEXT,
    "zone" TEXT,
    "notes" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "convertedGuestId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "releasedAt" DATETIME,
    CONSTRAINT "seating_companion_holds_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_seatingPlanId_fkey" FOREIGN KEY ("seatingPlanId") REFERENCES "seating_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_ownerGuestId_fkey" FOREIGN KEY ("ownerGuestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "seating_companion_holds_convertedGuestId_fkey" FOREIGN KEY ("convertedGuestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "seating_party_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seatingPlanId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "requiredPlaces" INTEGER NOT NULL,
    "assignmentStrategy" TEXT NOT NULL DEFAULT 'KEEP_TOGETHER',
    "splitConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "splitReason" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lastCalculatedAt" DATETIME,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "eventId" TEXT NOT NULL,
    CONSTRAINT "seating_party_plans_seatingPlanId_fkey" FOREIGN KEY ("seatingPlanId") REFERENCES "seating_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_party_plans_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "seating_party_plans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "fraud_detection_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "details" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fraud_detection_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "reminder_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "campaignId" TEXT,
    "channel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_schedules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT,
    "bookingId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "eventType" TEXT,
    "serviceQuality" INTEGER,
    "communication" INTEGER,
    "valueRating" INTEGER,
    "timeliness" INTEGER,
    "wouldRecommend" BOOLEAN,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendor_reviews_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "vendor_reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "vendor_bookings" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "walletId" TEXT,
    "category" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_expenses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_expenses_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "template_favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "template_favorites_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "design_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "template_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "template_purchases_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "design_templates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "designer_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "portfolioUrl" TEXT,
    "commissionRate" REAL NOT NULL DEFAULT 15,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "designer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "template_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "url" TEXT NOT NULL,
    "metadata" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "font_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "category" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "pattern_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PATTERN',
    "url" TEXT,
    "svgData" TEXT,
    "category" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "design_exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "eventId" TEXT,
    "format" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "design_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "design_exports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "design_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "generated_designs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "templateId" TEXT,
    "aiRequestId" TEXT,
    "productType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "previewUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "generated_designs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "generated_designs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "design_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "generated_designs_aiRequestId_fkey" FOREIGN KEY ("aiRequestId") REFERENCES "ai_design_requests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTitle" TEXT,
    "budget" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "guestCount" INTEGER,
    "location" TEXT,
    "venue" TEXT,
    "eventDate" DATETIME,
    "eventGoal" TEXT,
    "style" TEXT,
    "culturalPref" TEXT,
    "isTicketed" BOOLEAN NOT NULL DEFAULT false,
    "isIndoor" BOOLEAN,
    "hostDetails" TEXT,
    "planSummary" TEXT,
    "aiProvider" TEXT NOT NULL DEFAULT 'mock',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "rawPlan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_plans_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_plan_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "planSnapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_plan_versions_eventPlanId_fkey" FOREIGN KEY ("eventPlanId") REFERENCES "event_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_budget_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventPlanId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "estimatedAmount" DECIMAL NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "notes" TEXT,
    CONSTRAINT "event_budget_items_eventPlanId_fkey" FOREIGN KEY ("eventPlanId") REFERENCES "event_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_timeline_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TEXT,
    "phase" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    CONSTRAINT "event_timeline_items_eventPlanId_fkey" FOREIGN KEY ("eventPlanId") REFERENCES "event_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_checklists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventPlanId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "assignedTo" TEXT,
    "dueDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    CONSTRAINT "event_checklists_eventPlanId_fkey" FOREIGN KEY ("eventPlanId") REFERENCES "event_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_risk_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventPlanId" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "severity" TEXT NOT NULL,
    "recommendation" TEXT,
    CONSTRAINT "event_risk_scores_eventPlanId_fkey" FOREIGN KEY ("eventPlanId") REFERENCES "event_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "ai_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "tokens" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "funeral_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "deceasedName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "dateOfPassing" DATETIME,
    "age" INTEGER,
    "biography" TEXT,
    "familyName" TEXT,
    "familyInformation" TEXT,
    "lifeJourney" TEXT,
    "achievements" TEXT,
    "education" TEXT,
    "career" TEXT,
    "faithJourney" TEXT,
    "legacyMessage" TEXT,
    "photoUrl" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'midnight-ivory',
    "templateSlug" TEXT,
    "revealStyle" TEXT,
    "invitationAudioCategory" TEXT,
    "privacyStatus" TEXT NOT NULL DEFAULT 'PUBLIC',
    "burialVenue" TEXT,
    "burialDirections" TEXT,
    "livestreamUrl" TEXT,
    "familyContacts" TEXT,
    "preferredLanguages" TEXT,
    "legacyVisibility" TEXT NOT NULL DEFAULT 'FAMILY_ONLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "funeral_profiles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "tribute_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "tributeType" TEXT NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "country" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tribute_messages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "virtual_candles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT,
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "virtual_candles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "memorial_timeline_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memorial_timeline_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "memorial_guestbook_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'CONDOLENCE',
    "scriptureRef" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memorial_guestbook_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "memorial_livestreams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'YOUTUBE',
    "streamUrl" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memorial_livestreams_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "funeral_family_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "funeral_family_members_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "funeral_family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "memorial_media_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "author" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memorial_media_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "funeral_programs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "funeral_programs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "legacy_archives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'FAMILY_ONLY',
    "snapshotJson" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "legacy_archives_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "memory_vaults" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "privacyStatus" TEXT NOT NULL DEFAULT 'PRIVATE',
    "storageLimitMb" INTEGER NOT NULL DEFAULT 500,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'free',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "memory_vaults_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "memory_vaults_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "thank_you_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL DEFAULT 'luxury-wedding',
    "title" TEXT,
    "message" TEXT,
    "eyebrow" TEXT,
    "subtitle" TEXT,
    "closingMessage" TEXT,
    "signatureLine" TEXT,
    "hostNames" TEXT,
    "eventHashtag" TEXT,
    "footerText" TEXT,
    "flyerUrl" TEXT,
    "hostPhotoUrl" TEXT,
    "heroImageUrl" TEXT,
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "signatureImageUrl" TEXT,
    "audioUrl" TEXT,
    "themeSource" TEXT NOT NULL DEFAULT 'INVITATION',
    "designConfig" TEXT,
    "sectionConfig" TEXT,
    "guestbookConfig" TEXT,
    "sharingConfig" TEXT,
    "seoConfig" TEXT,
    "featuredMemoryIds" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastPublishedSnapshot" TEXT,
    "updatedById" TEXT,
    "scheduledPublishAt" DATETIME,
    "archivedAt" DATETIME,
    "shareToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "thank_you_pages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memory_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "maxPhotosPerGuest" INTEGER NOT NULL DEFAULT 10,
    "maxVideosPerGuest" INTEGER NOT NULL DEFAULT 2,
    "maxImageSizeMb" INTEGER NOT NULL DEFAULT 50,
    "maxVideoSizeMb" INTEGER NOT NULL DEFAULT 200,
    "uploadWindowStart" DATETIME,
    "uploadWindowEnd" DATETIME,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "guestOnlyMode" BOOLEAN NOT NULL DEFAULT false,
    "allowAnonymousUploads" BOOLEAN NOT NULL DEFAULT true,
    "allowDownloads" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_memory_settings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memory_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "uploaderName" TEXT,
    "uploaderPhone" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "uploaderGuestKey" TEXT,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoAssetId" TEXT,
    CONSTRAINT "event_memory_uploads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_memory_uploads_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_memory_uploads_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_memory_uploads_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "video_assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memory_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_memory_tokens_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memory_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "guestKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_memory_likes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_memory_likes_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "event_memory_uploads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memory_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "guestId" TEXT,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorTokenHash" TEXT,
    "guestKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_memory_comments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_memory_comments_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "event_memory_uploads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_memory_consents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "guestKey" TEXT NOT NULL,
    "guestId" TEXT,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_memory_consents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_catalog_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "layoutSlug" TEXT NOT NULL,
    "eventTypes" TEXT,
    "packageSlugs" TEXT,
    "previewGradient" TEXT,
    "previewImageUrl" TEXT,
    "previewVideoUrl" TEXT,
    "backgroundImageUrl" TEXT,
    "backgroundVideoUrl" TEXT,
    "motionReferenceUrl" TEXT,
    "inspirationMediaUrl" TEXT,
    "defaultGalleryUrls" TEXT,
    "priceGhs" DECIMAL,
    "languages" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT,
    "tags" TEXT,
    "colorFamily" TEXT,
    "hasParallax" BOOLEAN NOT NULL DEFAULT false,
    "blueprintId" TEXT,
    "themeId" TEXT,
    "motifPackId" TEXT,
    "motionProfileId" TEXT,
    "performanceClass" TEXT,
    "defaultMusicTrackId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_catalog_templates_defaultMusicTrackId_fkey" FOREIGN KEY ("defaultMusicTrackId") REFERENCES "invitation_music_tracks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_product_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "bestFor" TEXT,
    "priceGhs" DECIMAL NOT NULL,
    "revisions" INTEGER NOT NULL DEFAULT 1,
    "deliveryDays" INTEGER NOT NULL DEFAULT 3,
    "features" TEXT,
    "eventTypes" TEXT,
    "designerAssist" BOOLEAN NOT NULL DEFAULT false,
    "paymentRequiredToPublish" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isBestValue" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "invitation_addons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priceGhs" DECIMAL NOT NULL,
    "packageEligibility" TEXT,
    "deliveryImpactDays" INTEGER NOT NULL DEFAULT 0,
    "adminNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "invitation_music_tracks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "url" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "durationSec" REAL,
    "clipStartSec" REAL,
    "clipEndSec" REAL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_music_tracks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "packageSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "productionStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "workflowType" TEXT NOT NULL DEFAULT 'SELF_SERVICE',
    "workflowStage" TEXT NOT NULL DEFAULT 'PACKAGE_SELECTED',
    "previewUrl" TEXT,
    "previewVideoUrl" TEXT,
    "extraRevisionPriceGhs" DECIMAL NOT NULL DEFAULT 79,
    "eventType" TEXT NOT NULL,
    "hostName" TEXT,
    "coupleName1" TEXT,
    "coupleName2" TEXT,
    "deceasedName" TEXT,
    "eventTitle" TEXT,
    "eventDate" DATETIME,
    "eventTime" TEXT,
    "venueName" TEXT,
    "landmark" TEXT,
    "mapsLink" TEXT,
    "dressCode" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "story" TEXT,
    "galleryUrls" TEXT,
    "musicPreference" TEXT,
    "musicSelection" TEXT,
    "rsvpRequired" BOOLEAN NOT NULL DEFAULT true,
    "guestCount" INTEGER,
    "addonSlugs" TEXT,
    "designConfig" TEXT,
    "sections" TEXT,
    "invitationId" TEXT,
    "eventId" TEXT,
    "totalAmountGhs" DECIMAL NOT NULL DEFAULT 0,
    "displayCurrency" TEXT NOT NULL DEFAULT 'GHS',
    "displayAmount" DECIMAL,
    "exchangeRate" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "shareUrl" TEXT,
    "languageMode" TEXT NOT NULL DEFAULT 'EN_FR',
    "assignedDesignerId" TEXT,
    "adminNotes" TEXT,
    "revisionsUsed" INTEGER NOT NULL DEFAULT 0,
    "missingInfoRequest" TEXT,
    "archivedAt" DATETIME,
    "portfolioConsent" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedVersion" TEXT,
    "privacyAcceptedVersion" TEXT,
    "aiGeneratedContent" TEXT,
    "inspirationAssets" TEXT,
    "fulfilledAddons" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invitation_orders_templateSlug_fkey" FOREIGN KEY ("templateSlug") REFERENCES "invitation_catalog_templates" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invitation_orders_packageSlug_fkey" FOREIGN KEY ("packageSlug") REFERENCES "invitation_product_packages" ("slug") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invitation_orders_assignedDesignerId_fkey" FOREIGN KEY ("assignedDesignerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "author" TEXT NOT NULL,
    "role" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "invitation_revisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationOrderId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "revisionType" TEXT NOT NULL DEFAULT 'MINOR',
    "changeCategory" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "adminNotes" TEXT,
    "adminResponse" TEXT,
    "isExtraPaid" BOOLEAN NOT NULL DEFAULT false,
    "amountGhs" DECIMAL,
    "customerApproved" BOOLEAN NOT NULL DEFAULT false,
    "customerApprovedAt" DATETIME,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_revisions_invitationOrderId_fkey" FOREIGN KEY ("invitationOrderId") REFERENCES "invitation_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "revision_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revision_comments_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "invitation_revisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "revision_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "revision_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revisionId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amountGhs" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "revision_payments_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "invitation_revisions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "revision_payments_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "production_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "production_assignments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "invitation_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_assignments_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "revisionId" TEXT,
    "approvedBy" TEXT NOT NULL,
    "notes" TEXT,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitation_approvals_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "invitation_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitation_approvals_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "invitation_revisions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "currencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "exchange_rates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseCurrency" TEXT NOT NULL DEFAULT 'GHS',
    "targetCurrency" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "package_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "amountGhs" DECIMAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "package_prices_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "invitation_product_packages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "payment_currency_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "invitationOrderId" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'GHS',
    "baseAmount" DECIMAL NOT NULL,
    "displayCurrency" TEXT NOT NULL,
    "displayAmount" DECIMAL NOT NULL,
    "exchangeRate" DECIMAL NOT NULL,
    "rateSource" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_currency_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "translations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'common',
    "enValue" TEXT NOT NULL,
    "frValue" TEXT,
    "editableByAdmin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "user_language_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_language_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_language_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationOrderId" TEXT,
    "invitationId" TEXT,
    "languageCode" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'EN_FR',
    "eventTitle" TEXT,
    "story" TEXT,
    "dressCode" TEXT,
    "venueName" TEXT,
    "landmark" TEXT,
    "hostName" TEXT,
    "customLabels" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_language_versions_invitationOrderId_fkey" FOREIGN KEY ("invitationOrderId") REFERENCES "invitation_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_block_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockType" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'default',
    "eventTypes" TEXT,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT,
    "subtitleEn" TEXT,
    "subtitleFr" TEXT,
    "defaultContentJson" TEXT,
    "defaultStyleVariant" TEXT NOT NULL DEFAULT 'elegant',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "invitation_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT,
    "invitationOrderId" TEXT,
    "blockType" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "contentJson" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "styleVariant" TEXT NOT NULL DEFAULT 'elegant',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_blocks_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invitation_blocks_invitationOrderId_fkey" FOREIGN KEY ("invitationOrderId") REFERENCES "invitation_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_block_content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT,
    "subtitle" TEXT,
    "content" TEXT,
    "contentJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "invitation_block_content_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "invitation_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT,
    "invitationId" TEXT,
    "invitationOrderId" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitation_media_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "invitation_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_gallery_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitation_gallery_items_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "invitation_blocks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "legal_document_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionFr" TEXT NOT NULL DEFAULT '',
    "contentEn" TEXT NOT NULL,
    "contentFr" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresReacceptance" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "user_consent_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT,
    "value" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "invitation_analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "invitationId" TEXT,
    "guestId" TEXT,
    "userId" TEXT,
    "templateSlug" TEXT,
    "packageSlug" TEXT,
    "addonSlug" TEXT,
    "revenueGhs" DECIMAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "inspiration_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "title" TEXT,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "blockedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inspiration_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "inspiration_sources_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "inspiration_analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "colorPalette" TEXT NOT NULL,
    "typographyMood" TEXT,
    "layoutStructure" TEXT,
    "sectionFlow" TEXT,
    "animationStyle" TEXT,
    "revealType" TEXT,
    "invitationCategory" TEXT,
    "audioMood" TEXT,
    "ctaStructure" TEXT,
    "rsvpFlow" TEXT,
    "qrPlacement" TEXT,
    "seatingConcept" TEXT,
    "features" TEXT,
    "conceptSummary" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspiration_analysis_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "inspiration_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "generated_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outputType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "designTemplateId" TEXT,
    "studioProjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "generated_templates_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "inspiration_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "generated_templates_studioProjectId_fkey" FOREIGN KEY ("studioProjectId") REFERENCES "studio_projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "studio_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "name" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "audioConfig" TEXT,
    "designTemplateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_projects_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "inspiration_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "inspiration_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "durationSec" REAL,
    "sizeBytes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspiration_media_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "inspiration_sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "inspiration_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspiration_audit_logs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "inspiration_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "inspiration_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "inspiration_domain_policies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "workspace_permission_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "scope" TEXT NOT NULL DEFAULT 'EVENT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "workspace_role_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleKey" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "workspace_permission_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "organizer_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "specialties" TEXT,
    "location" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT DEFAULT 'GH',
    "coverImageUrl" TEXT,
    "portfolio" TEXT,
    "packages" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "completedEventsCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DECIMAL NOT NULL DEFAULT 0,
    "averageResponseTime" INTEGER,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organizer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_collaborators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT,
    "title" TEXT,
    "invitedById" TEXT,
    "acceptedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_collaborators_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "eventId" TEXT,
    "organizationId" TEXT,
    "inviterId" TEXT NOT NULL,
    "inviteeUserId" TEXT,
    "inviteeEmail" TEXT,
    "inviteePhone" TEXT,
    "inviteeName" TEXT,
    "role" TEXT,
    "orgRole" TEXT,
    "permissions" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "workspace_invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workspace_invitations_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "organization_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "department" TEXT,
    "permissions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "client_relationships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" DATETIME,
    "rating" DECIMAL,
    "review" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "client_relationships_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_relationships_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_activity_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "checklist" TEXT,
    "attachments" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_tasks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_task_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "event_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_task_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_chat_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_chat_channels_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT,
    "voiceUrl" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "mentions" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_chat_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "event_chat_channels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_blueprint_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "blueprint" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "event_workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'DRAFT',
    "navigation" TEXT,
    "configuration" TEXT,
    "provisionedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_workspaces_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_enabled_features" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "requiredPlan" TEXT,
    "source" TEXT NOT NULL DEFAULT 'blueprint',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_enabled_features_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_enabled_features_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event_workspaces" ("eventId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_package_features" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "eventTypes" TEXT,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "event_package_features_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "event_packages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_addons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "addonKey" TEXT NOT NULL,
    "featureKeys" TEXT NOT NULL,
    "purchasedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_addons_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "video_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "ownerType" TEXT NOT NULL DEFAULT 'USER',
    "ownerId" TEXT,
    "eventId" TEXT,
    "vendorId" TEXT,
    "orderId" TEXT,
    "context" TEXT,
    "originalKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "originalMimeType" TEXT NOT NULL,
    "originalExtension" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "detectedContainer" TEXT,
    "detectedVideoCodec" TEXT,
    "detectedAudioCodec" TEXT,
    "durationSeconds" REAL,
    "width" INTEGER,
    "height" INTEGER,
    "multipartUploadId" TEXT,
    "partSizeBytes" BIGINT,
    "totalParts" INTEGER,
    "uploadedParts" TEXT,
    "mediaConvertJobId" TEXT,
    "mediaConvertQueue" TEXT,
    "processedMp4Url" TEXT,
    "processedMp4Renditions" TEXT,
    "hlsUrl" TEXT,
    "posterUrl" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailUrls" TEXT,
    "failureReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" DATETIME,
    "queuedAt" DATETIME,
    "processingStartedAt" DATETIME,
    "readyAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "video_assets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_gift_campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT,
    "invitationOrderId" TEXT,
    "createdById" TEXT,
    "publicToken" TEXT NOT NULL,
    "giftType" TEXT NOT NULL DEFAULT 'WEDDING_GIFT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "qrMode" TEXT NOT NULL DEFAULT 'EVENT_GIFT_QR',
    "title" TEXT NOT NULL DEFAULT 'Send a Gift',
    "subtitle" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Send a Gift',
    "thankYouTitle" TEXT,
    "thankYouMessage" TEXT,
    "coverImageUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "suggestedAmounts" TEXT,
    "minAmountMinor" INTEGER NOT NULL DEFAULT 500,
    "maxAmountMinor" INTEGER,
    "allowCustomAmount" BOOLEAN NOT NULL DEFAULT true,
    "allowGuestMessage" BOOLEAN NOT NULL DEFAULT true,
    "requireGuestName" BOOLEAN NOT NULL DEFAULT true,
    "requireGuestContact" BOOLEAN NOT NULL DEFAULT true,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "hideTotalsFromGuests" BOOLEAN NOT NULL DEFAULT true,
    "showContributorsToGuests" BOOLEAN NOT NULL DEFAULT false,
    "showOnInvitation" BOOLEAN NOT NULL DEFAULT true,
    "showOnCompanion" BOOLEAN NOT NULL DEFAULT true,
    "themeSource" TEXT NOT NULL DEFAULT 'INVITATION',
    "themePresetId" TEXT,
    "opensAt" DATETIME,
    "closesAt" DATETIME,
    "settlementDelayHours" INTEGER NOT NULL DEFAULT 24,
    "withdrawAfterEventOnly" BOOLEAN NOT NULL DEFAULT true,
    "minWithdrawalMinor" INTEGER NOT NULL DEFAULT 1000,
    "maxWithdrawalMinor" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_gift_campaigns_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_gift_campaigns_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_gift_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_gift_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestId" TEXT,
    "userId" TEXT,
    "reference" TEXT NOT NULL,
    "paymentId" TEXT,
    "idempotencyKey" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "channel" TEXT NOT NULL DEFAULT 'MOBILE_MONEY',
    "providerChannelHint" TEXT,
    "giftType" TEXT NOT NULL DEFAULT 'WEDDING_GIFT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "amountMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "guestMessage" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorizationUrl" TEXT,
    "providerReference" TEXT,
    "providerStatus" TEXT,
    "failureReason" TEXT,
    "paidAt" DATETIME,
    "verifiedAt" DATETIME,
    "failedAt" DATETIME,
    "reconciledAt" DATETIME,
    "reconciledById" TEXT,
    "organiserNote" TEXT,
    "refundedAt" DATETIME,
    "refundAmountMinor" INTEGER,
    "refundReason" TEXT,
    "refundedById" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_gift_payments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "event_gift_campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_gift_payments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_gift_payments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_gift_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_gift_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giftPaymentId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "tokenFingerprint" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" DATETIME,
    "emailedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_gift_receipts_giftPaymentId_fkey" FOREIGN KEY ("giftPaymentId") REFERENCES "event_gift_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_wallet_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "balanceMinor" INTEGER NOT NULL DEFAULT 0,
    "availableMinor" INTEGER NOT NULL DEFAULT 0,
    "reservedMinor" INTEGER NOT NULL DEFAULT 0,
    "lifetimeGiftMinor" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRefundMinor" INTEGER NOT NULL DEFAULT 0,
    "lifetimeWithdrawnMinor" INTEGER NOT NULL DEFAULT 0,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "lastLedgerAt" DATETIME,
    "frozenReason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL, book TEXT NOT NULL DEFAULT 'GIFT', lifetimeTicketGrossMinor INTEGER NOT NULL DEFAULT 0, lifetimeTicketCommissionMinor INTEGER NOT NULL DEFAULT 0, lifetimeTicketRefundMinor INTEGER NOT NULL DEFAULT 0, ticketSaleCount INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "event_wallet_accounts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_wallet_withdrawal_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "payoutMethod" TEXT NOT NULL,
    "payoutKind" TEXT NOT NULL DEFAULT 'MANUAL_PAYOUT',
    "mobileMoneyNetwork" TEXT,
    "payoutPhoneMasked" TEXT,
    "payoutDestinationEnc" TEXT,
    "bankCode" TEXT,
    "bankAccountMasked" TEXT,
    "accountName" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "providerRecipientCode" TEXT,
    "providerTransferCode" TEXT,
    "providerReference" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "reason" TEXT,
    "internalNote" TEXT,
    "failureReason" TEXT,
    "evidenceReference" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "processingAt" DATETIME,
    "paidAt" DATETIME,
    "failedAt" DATETIME,
    "cancelledAt" DATETIME,
    "reversedAt" DATETIME,
    "rejectedAt" DATETIME,
    "reserveLedgerEntryId" TEXT,
    "debitLedgerEntryId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_wallet_withdrawal_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_withdrawal_requests_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "event_wallet_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_withdrawal_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_withdrawal_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_wallet_ledger_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "balanceAfterMinor" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "giftPaymentId" TEXT,
    "relatedEntryId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'system',
    "description" TEXT,
    "createdById" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_wallet_ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "event_wallet_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_ledger_entries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_ledger_entries_giftPaymentId_fkey" FOREIGN KEY ("giftPaymentId") REFERENCES "event_gift_payments" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_wallet_ledger_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_admission_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "qrAdmissionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "qrRequiredForEntry" BOOLEAN NOT NULL DEFAULT true,
    "manualCodeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "manualCodeLength" INTEGER NOT NULL DEFAULT 4,
    "offlineAdmissionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayPassOnInvitation" BOOLEAN NOT NULL DEFAULT true,
    "allowPassDownload" BOOLEAN NOT NULL DEFAULT true,
    "allowPassPrint" BOOLEAN NOT NULL DEFAULT true,
    "showPartySizeOnPass" BOOLEAN NOT NULL DEFAULT true,
    "showTableOnPass" BOOLEAN NOT NULL DEFAULT false,
    "showSeatOnPass" BOOLEAN NOT NULL DEFAULT false,
    "hideSeatingUntilAdmitted" BOOLEAN NOT NULL DEFAULT true,
    "passInstructions" TEXT,
    "allowPartialArrival" BOOLEAN NOT NULL DEFAULT true,
    "allowSeparateArrival" BOOLEAN NOT NULL DEFAULT true,
    "allowReEntry" BOOLEAN NOT NULL DEFAULT false,
    "reEntryWindowMinutes" INTEGER,
    "requireScannerConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "fastAdmissionMode" BOOLEAN NOT NULL DEFAULT false,
    "requireOperatorAuth" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "validityLeadHours" INTEGER NOT NULL DEFAULT 12,
    "validityTrailHours" INTEGER NOT NULL DEFAULT 12,
    "offlinePackageTtlMinutes" INTEGER NOT NULL DEFAULT 720,
    "manualCodeAttemptLimit" INTEGER NOT NULL DEFAULT 10,
    "manualCodeAttemptWindowSeconds" INTEGER NOT NULL DEFAULT 300,
    "duplicatePolicy" TEXT NOT NULL DEFAULT 'BLOCK',
    "portalUnlockPolicy" TEXT NOT NULL DEFAULT 'ON_FIRST_ADMISSION',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_admission_settings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guest_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "groupId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenNonce" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "code" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "admittedCount" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstAdmittedAt" DATETIME,
    "lastAdmittedAt" DATETIME,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "reissuedFromId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_passes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_passes_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guest_import_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT,
    "label" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'PERSONALISED',
    "source" TEXT NOT NULL DEFAULT 'PASTE_LINES',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fileName" TEXT,
    "detectedHeaders" TEXT,
    "columnMapping" TEXT,
    "options" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "readyRows" INTEGER NOT NULL DEFAULT 0,
    "reviewRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "generatedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "generatedHeads" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "rolledBackAt" DATETIME,
    "rollbackReason" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_import_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_import_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guest_import_rows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "raw" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "rawPhone" TEXT,
    "partyType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "memberNames" TEXT,
    "tagLabels" TEXT,
    "groupName" TEXT,
    "tableNumber" TEXT,
    "seatLabel" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "decision" TEXT NOT NULL DEFAULT 'CREATE',
    "issues" TEXT,
    "duplicateOfRowIndex" INTEGER,
    "duplicateOfGuestId" TEXT,
    "duplicateOfInvitationId" TEXT,
    "reviewedAt" DATETIME,
    "invitationId" TEXT,
    "guestId" TEXT,
    "guestPassId" TEXT,
    "generatedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_import_rows_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "guest_import_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_import_rows_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "guest_import_rows_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "general_pass_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "label" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'FIXED_QUANTITY',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "issuedCount" INTEGER NOT NULL DEFAULT 0,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "registrationToken" TEXT,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "maxRegistrations" INTEGER,
    "requireName" BOOLEAN NOT NULL DEFAULT true,
    "requireContact" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" DATETIME,
    "passLabelPrefix" TEXT NOT NULL DEFAULT 'Guest',
    "welcomeMessage" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "general_pass_batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "general_pass_batches_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "guest_import_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "general_pass_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "general_pass_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "general_pass_registrations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "general_pass_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "general_pass_registrations_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guest_import_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowId" TEXT,
    "invitationId" TEXT,
    "guestId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "recipient" TEXT,
    "guestName" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "provider" TEXT,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guest_import_deliveries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "guest_import_batches" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "guest_import_deliveries_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "guest_import_rows" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_qr_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heading" TEXT,
    "footerText" TEXT,
    "destinationUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "designJson" TEXT,
    "metadata" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_qr_links_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_qr_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "shared_event_access_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VENDOR_GENERAL',
    "displayName" TEXT NOT NULL DEFAULT 'Vendor Access',
    "tokenHash" TEXT NOT NULL,
    "tokenNonce" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'cvs1',
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "manualCode" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reusable" BOOLEAN NOT NULL DEFAULT true,
    "allowedGates" TEXT,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shared_event_access_passes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shared_event_access_passes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "shared_access_pass_print_variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "roleHeading" TEXT NOT NULL,
    "companyName" TEXT,
    "accentColor" TEXT,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shared_access_pass_print_variants_passId_fkey" FOREIGN KEY ("passId") REFERENCES "shared_event_access_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "shared_access_pass_scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "scannedById" TEXT,
    "gate" TEXT,
    "deviceInfo" TEXT,
    "operatorRoleNote" TEXT,
    "vendorLabel" TEXT,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "clientRecordId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_access_pass_scans_passId_fkey" FOREIGN KEY ("passId") REFERENCES "shared_event_access_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_team_passes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "createdById" TEXT,
    "passType" TEXT NOT NULL DEFAULT 'VENDOR',
    "passMode" TEXT NOT NULL DEFAULT 'TEAM',
    "entryMode" TEXT NOT NULL DEFAULT 'INDIVIDUAL_ENTRY',
    "title" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "categoryLabel" TEXT,
    "teamCapacity" INTEGER NOT NULL DEFAULT 1,
    "admittedCount" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "reentryPolicy" TEXT NOT NULL DEFAULT 'UNLIMITED',
    "reentryLimit" INTEGER,
    "reentryUsed" INTEGER NOT NULL DEFAULT 0,
    "entryCycle" INTEGER NOT NULL DEFAULT 1,
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "totalAdmitted" INTEGER NOT NULL DEFAULT 0,
    "accessZones" TEXT,
    "setupAccess" BOOLEAN NOT NULL DEFAULT false,
    "breakdownAccess" BOOLEAN NOT NULL DEFAULT false,
    "equipmentAccess" BOOLEAN NOT NULL DEFAULT false,
    "vehicleRegistration" TEXT,
    "notes" TEXT,
    "logoUrl" TEXT,
    "photoUrl" TEXT,
    "tokenHash" TEXT NOT NULL,
    "tokenNonce" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'cvt1',
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "admissionCode" TEXT NOT NULL,
    "codeLength" INTEGER NOT NULL DEFAULT 6,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "firstAdmittedAt" DATETIME,
    "lastAdmittedAt" DATETIME,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vendor_team_passes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vendor_team_passes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_vendor_pass_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CUSTOM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_vendor_pass_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_vendor_pass_types_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_team_pass_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "admitted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_team_pass_members_passId_fkey" FOREIGN KEY ("passId") REFERENCES "vendor_team_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "vendor_team_pass_admissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'ADMITTED',
    "denialReason" TEXT,
    "entryCycle" INTEGER NOT NULL DEFAULT 1,
    "channel" TEXT,
    "scannedById" TEXT,
    "gate" TEXT,
    "deviceInfo" TEXT,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "clientRecordId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendor_team_pass_admissions_passId_fkey" FOREIGN KEY ("passId") REFERENCES "vendor_team_passes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "defaultTab" TEXT NOT NULL DEFAULT 'PROGRAMME',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER,
    "publishedAt" DATETIME,
    "publishedById" TEXT,
    "showCelebrants" BOOLEAN NOT NULL DEFAULT true,
    "showDate" BOOLEAN NOT NULL DEFAULT true,
    "showVenue" BOOLEAN NOT NULL DEFAULT true,
    "showWelcome" BOOLEAN NOT NULL DEFAULT true,
    "celebrantsText" TEXT,
    "welcomeMessage" TEXT,
    "useInvitationTheme" BOOLEAN NOT NULL DEFAULT true,
    "themeOverrides" TEXT,
    "programmeDraft" TEXT,
    "menuDraft" TEXT,
    "attachments" TEXT,
    "publishedPayload" TEXT,
    "seatingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "seatingMode" TEXT NOT NULL DEFAULT 'ADMISSION_CODE',
    "seatingMinQuery" INTEGER NOT NULL DEFAULT 4,
    "seatingMaxMatch" INTEGER NOT NULL DEFAULT 3,
    "seatingNote" TEXT,
    "offlineEnabled" BOOLEAN NOT NULL DEFAULT true,
    "venueOfflineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "offlineSeatingMode" TEXT NOT NULL DEFAULT 'DISABLED',
    "venueLocalUrl" TEXT,
    "venueWifiName" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guides_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_guides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_guide_offline_packs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL DEFAULT 'egp1',
    "packVersion" INTEGER NOT NULL DEFAULT 1,
    "guideVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "seatingMode" TEXT NOT NULL DEFAULT 'DISABLED',
    "signature" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "lastSyncedAt" DATETIME,
    "lastSyncReport" TEXT,
    "syncedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guide_offline_packs_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "event_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "event_guide_offline_packs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "event_guide_view_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "tab" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'ONLINE',
    "views" INTEGER NOT NULL DEFAULT 0,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "event_guide_view_stats_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "event_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "help_guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "posterUrl" TEXT,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "mp4Url" TEXT,
    "webmUrl" TEXT,
    "mobileVideoUrl" TEXT,
    "desktopVideoUrl" TEXT,
    "durationSec" INTEGER,
    "captionsEnUrl" TEXT,
    "captionsFrUrl" TEXT,
    "voiceoverEnUrl" TEXT,
    "voiceoverFrUrl" TEXT,
    "storyboardKey" TEXT,
    "transcript" TEXT NOT NULL DEFAULT '',
    "narrationScript" TEXT NOT NULL DEFAULT '',
    "a11yDescription" TEXT NOT NULL DEFAULT '',
    "videoProductionRequired" BOOLEAN NOT NULL DEFAULT true,
    "featureKey" TEXT,
    "lastVerifiedAt" DATETIME,
    "verifiedAgainstBuild" TEXT,
    "verifiedAgainstFeatureVersion" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'CURRENT',
    "synonyms" TEXT NOT NULL DEFAULT '[]',
    "contextRoutes" TEXT NOT NULL DEFAULT '[]',
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "relatedSlugs" TEXT NOT NULL DEFAULT '[]',
    "analyticsEvents" TEXT NOT NULL DEFAULT '[]',
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "newUntil" DATETIME,
    "scheduledPublishAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulYes" INTEGER NOT NULL DEFAULT 0,
    "helpfulNo" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "help_guide_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "help_guide_feedback_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "help_guide_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "editorId" TEXT,
    "editorLabel" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "help_guide_versions_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "guide_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guideId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "stepType" TEXT NOT NULL DEFAULT 'motion',
    "mediaUrl" TEXT,
    "motionKey" TEXT,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "guide_steps_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "users_accountType_idx" ON "users"("accountType");
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");
CREATE INDEX "events_organizationId_idx" ON "events"("organizationId");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_eventType_idx" ON "events"("eventType");
CREATE INDEX "events_isPublic_isFeatured_idx" ON "events"("isPublic", "isFeatured");
CREATE INDEX "events_city_country_idx" ON "events"("city", "country");
CREATE INDEX "events_defaultMusicTrackId_idx" ON "events"("defaultMusicTrackId");
CREATE UNIQUE INDEX "event_packages_slug_key" ON "event_packages"("slug");
CREATE UNIQUE INDEX "event_templates_slug_key" ON "event_templates"("slug");
CREATE INDEX "event_templates_category_idx" ON "event_templates"("category");
CREATE INDEX "event_templates_eventType_idx" ON "event_templates"("eventType");
CREATE UNIQUE INDEX "invitations_slug_key" ON "invitations"("slug");
CREATE UNIQUE INDEX "invitations_uniqueLink_key" ON "invitations"("uniqueLink");
CREATE INDEX "invitations_eventId_idx" ON "invitations"("eventId");
CREATE INDEX "invitations_importBatchId_idx" ON "invitations"("importBatchId");
CREATE INDEX "invitations_generalPassBatchId_idx" ON "invitations"("generalPassBatchId");
CREATE UNIQUE INDEX "guests_qrToken_key" ON "guests"("qrToken");
CREATE INDEX "guests_eventId_idx" ON "guests"("eventId");
CREATE INDEX "guests_invitationId_idx" ON "guests"("invitationId");
CREATE INDEX "guests_status_idx" ON "guests"("status");
CREATE INDEX "guests_importBatchId_idx" ON "guests"("importBatchId");
CREATE UNIQUE INDEX "guests_eventId_manualCode_key" ON "guests"("eventId", "manualCode");
CREATE INDEX "event_guest_tags_eventId_sortOrder_idx" ON "event_guest_tags"("eventId", "sortOrder");
CREATE UNIQUE INDEX "event_guest_tags_eventId_slug_key" ON "event_guest_tags"("eventId", "slug");
CREATE INDEX "guest_tag_assignments_tagId_idx" ON "guest_tag_assignments"("tagId");
CREATE UNIQUE INDEX "guest_tag_assignments_guestId_tagId_key" ON "guest_tag_assignments"("guestId", "tagId");
CREATE INDEX "admission_events_invitationId_createdAt_idx" ON "admission_events"("invitationId", "createdAt");
CREATE INDEX "admission_events_eventId_createdAt_idx" ON "admission_events"("eventId", "createdAt");
CREATE UNIQUE INDEX "tickets_qrToken_key" ON "tickets"("qrToken");
CREATE INDEX "tickets_eventId_idx" ON "tickets"("eventId");
CREATE INDEX "ticket_orders_eventId_idx" ON "ticket_orders"("eventId");
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
CREATE UNIQUE INDEX "payments_invitationOrderId_key" ON "payments"("invitationOrderId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_reference_idx" ON "payments"("reference");
CREATE INDEX "payments_vendorBookingId_idx" ON "payments"("vendorBookingId");
CREATE UNIQUE INDEX "qr_codes_token_key" ON "qr_codes"("token");
CREATE INDEX "qr_codes_token_idx" ON "qr_codes"("token");
CREATE INDEX "qr_scans_eventId_idx" ON "qr_scans"("eventId");
CREATE INDEX "qr_scans_guestPassId_idx" ON "qr_scans"("guestPassId");
CREATE UNIQUE INDEX "offline_devices_deviceToken_key" ON "offline_devices"("deviceToken");
CREATE INDEX "offline_devices_eventId_idx" ON "offline_devices"("eventId");
CREATE UNIQUE INDEX "offline_checkins_clientRecordId_key" ON "offline_checkins"("clientRecordId");
CREATE INDEX "offline_checkins_deviceId_idx" ON "offline_checkins"("deviceId");
CREATE INDEX "offline_checkins_guestPassId_idx" ON "offline_checkins"("guestPassId");
CREATE INDEX "offline_sync_logs_deviceId_idx" ON "offline_sync_logs"("deviceId");
CREATE UNIQUE INDEX "vendor_categories_slug_key" ON "vendor_categories"("slug");
CREATE UNIQUE INDEX "vendor_plans_slug_key" ON "vendor_plans"("slug");
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");
CREATE INDEX "vendors_category_idx" ON "vendors"("category");
CREATE INDEX "vendors_city_idx" ON "vendors"("city");
CREATE INDEX "vendors_isFeatured_idx" ON "vendors"("isFeatured");
CREATE INDEX "vendors_verificationStatus_idx" ON "vendors"("verificationStatus");
CREATE UNIQUE INDEX "vendor_category_assignments_vendorId_categoryId_key" ON "vendor_category_assignments"("vendorId", "categoryId");
CREATE INDEX "vendor_social_links_vendorId_idx" ON "vendor_social_links"("vendorId");
CREATE INDEX "vendor_media_vendorId_idx" ON "vendor_media"("vendorId");
CREATE INDEX "vendor_availability_vendorId_date_idx" ON "vendor_availability"("vendorId", "date");
CREATE UNIQUE INDEX "vendor_availability_vendorId_date_key" ON "vendor_availability"("vendorId", "date");
CREATE INDEX "vendor_leads_vendorId_status_idx" ON "vendor_leads"("vendorId", "status");
CREATE INDEX "vendor_leads_organizerId_idx" ON "vendor_leads"("organizerId");
CREATE INDEX "vendor_quotes_vendorId_status_idx" ON "vendor_quotes"("vendorId", "status");
CREATE INDEX "vendor_quotes_organizerId_status_idx" ON "vendor_quotes"("organizerId", "status");
CREATE INDEX "vendor_quotes_leadId_idx" ON "vendor_quotes"("leadId");
CREATE UNIQUE INDEX "vendor_quote_versions_quoteId_version_key" ON "vendor_quote_versions"("quoteId", "version");
CREATE UNIQUE INDEX "vendor_favorites_userId_vendorId_key" ON "vendor_favorites"("userId", "vendorId");
CREATE INDEX "vendor_analytics_events_vendorId_eventType_idx" ON "vendor_analytics_events"("vendorId", "eventType");
CREATE UNIQUE INDEX "vendor_bookings_leadId_key" ON "vendor_bookings"("leadId");
CREATE UNIQUE INDEX "vendor_bookings_quoteId_key" ON "vendor_bookings"("quoteId");
CREATE INDEX "vendor_bookings_vendorId_status_idx" ON "vendor_bookings"("vendorId", "status");
CREATE INDEX "vendor_bookings_organizerId_status_idx" ON "vendor_bookings"("organizerId", "status");
CREATE INDEX "vendor_bookings_eventDate_idx" ON "vendor_bookings"("eventDate");
CREATE INDEX "booking_milestones_bookingId_idx" ON "booking_milestones"("bookingId");
CREATE UNIQUE INDEX "escrow_holds_paymentId_key" ON "escrow_holds"("paymentId");
CREATE INDEX "escrow_holds_bookingId_status_idx" ON "escrow_holds"("bookingId", "status");
CREATE INDEX "escrow_releases_holdId_idx" ON "escrow_releases"("holdId");
CREATE INDEX "vendor_payouts_vendorId_status_idx" ON "vendor_payouts"("vendorId", "status");
CREATE INDEX "vendor_payouts_bookingId_idx" ON "vendor_payouts"("bookingId");
CREATE INDEX "marketplace_disputes_bookingId_status_idx" ON "marketplace_disputes"("bookingId", "status");
CREATE UNIQUE INDEX "marketplace_commission_rules_key_key" ON "marketplace_commission_rules"("key");
CREATE UNIQUE INDEX "venues_slug_key" ON "venues"("slug");
CREATE INDEX "venues_city_idx" ON "venues"("city");
CREATE UNIQUE INDEX "venue_availability_venueId_date_key" ON "venue_availability"("venueId", "date");
CREATE UNIQUE INDEX "wallets_eventId_key" ON "wallets"("eventId");
CREATE INDEX "wallet_transactions_eventId_idx" ON "wallet_transactions"("eventId");
CREATE INDEX "wallet_transactions_paymentId_idx" ON "wallet_transactions"("paymentId");
CREATE INDEX "contributions_eventId_idx" ON "contributions"("eventId");
CREATE INDEX "invitation_guest_wishes_eventId_createdAt_idx" ON "invitation_guest_wishes"("eventId", "createdAt");
CREATE INDEX "invitation_guest_wishes_eventId_status_createdAt_idx" ON "invitation_guest_wishes"("eventId", "status", "createdAt");
CREATE INDEX "invitation_guest_wishes_eventId_source_idx" ON "invitation_guest_wishes"("eventId", "source");
CREATE INDEX "invitation_guest_wishes_invitationId_idx" ON "invitation_guest_wishes"("invitationId");
CREATE INDEX "invitation_guest_wishes_authorTokenHash_idx" ON "invitation_guest_wishes"("authorTokenHash");
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "user_messages_recipientId_isRead_idx" ON "user_messages"("recipientId", "isRead");
CREATE INDEX "user_messages_threadId_createdAt_idx" ON "user_messages"("threadId", "createdAt");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "two_factor_auth_userId_key" ON "two_factor_auth"("userId");
CREATE INDEX "flyer_designs_eventId_idx" ON "flyer_designs"("eventId");
CREATE INDEX "flyer_designs_userId_idx" ON "flyer_designs"("userId");
CREATE UNIQUE INDEX "digital_business_cards_slug_key" ON "digital_business_cards"("slug");
CREATE UNIQUE INDEX "digital_business_cards_publicToken_key" ON "digital_business_cards"("publicToken");
CREATE INDEX "digital_business_cards_userId_idx" ON "digital_business_cards"("userId");
CREATE INDEX "digital_business_cards_subscriptionStatus_idx" ON "digital_business_cards"("subscriptionStatus");
CREATE INDEX "digital_business_cards_publicToken_idx" ON "digital_business_cards"("publicToken");
CREATE INDEX "smartcard_variants_cardId_idx" ON "smartcard_variants"("cardId");
CREATE UNIQUE INDEX "smartcard_variants_cardId_mode_key" ON "smartcard_variants"("cardId", "mode");
CREATE UNIQUE INDEX "smartcard_nfc_devices_publicToken_key" ON "smartcard_nfc_devices"("publicToken");
CREATE INDEX "smartcard_nfc_devices_cardId_idx" ON "smartcard_nfc_devices"("cardId");
CREATE INDEX "smartcard_nfc_devices_status_idx" ON "smartcard_nfc_devices"("status");
CREATE INDEX "smartcard_connections_cardId_createdAt_idx" ON "smartcard_connections"("cardId", "createdAt");
CREATE INDEX "smartcard_connections_status_idx" ON "smartcard_connections"("status");
CREATE UNIQUE INDEX "smartcard_campaigns_publicToken_key" ON "smartcard_campaigns"("publicToken");
CREATE INDEX "smartcard_campaigns_cardId_idx" ON "smartcard_campaigns"("cardId");
CREATE INDEX "smartcard_interactions_cardId_createdAt_idx" ON "smartcard_interactions"("cardId", "createdAt");
CREATE INDEX "smartcard_interactions_kind_idx" ON "smartcard_interactions"("kind");
CREATE INDEX "inspiration_uploads_userId_idx" ON "inspiration_uploads"("userId");
CREATE INDEX "event_gates_eventId_idx" ON "event_gates"("eventId");
CREATE INDEX "event_staff_eventId_idx" ON "event_staff"("eventId");
CREATE UNIQUE INDEX "event_staff_eventId_userId_key" ON "event_staff"("eventId", "userId");
CREATE INDEX "seating_plans_eventId_idx" ON "seating_plans"("eventId");
CREATE UNIQUE INDEX "seating_plans_eventId_planType_key" ON "seating_plans"("eventId", "planType");
CREATE INDEX "seating_assignments_seatingPlanId_idx" ON "seating_assignments"("seatingPlanId");
CREATE INDEX "seating_assignments_guestId_idx" ON "seating_assignments"("guestId");
CREATE INDEX "seating_assignments_seatingPlanId_tableNumber_idx" ON "seating_assignments"("seatingPlanId", "tableNumber");
CREATE UNIQUE INDEX "seating_assignments_guestId_seatingPlanId_key" ON "seating_assignments"("guestId", "seatingPlanId");
CREATE INDEX "seating_companion_holds_eventId_seatingPlanId_idx" ON "seating_companion_holds"("eventId", "seatingPlanId");
CREATE INDEX "seating_companion_holds_seatingPlanId_tableNumber_idx" ON "seating_companion_holds"("seatingPlanId", "tableNumber");
CREATE INDEX "seating_companion_holds_invitationId_idx" ON "seating_companion_holds"("invitationId");
CREATE INDEX "seating_companion_holds_seatingPlanId_status_idx" ON "seating_companion_holds"("seatingPlanId", "status");
CREATE INDEX "seating_companion_holds_convertedGuestId_idx" ON "seating_companion_holds"("convertedGuestId");
CREATE UNIQUE INDEX "seating_companion_holds_seatingPlanId_invitationId_companionIndex_key" ON "seating_companion_holds"("seatingPlanId", "invitationId", "companionIndex");
CREATE INDEX "seating_party_plans_seatingPlanId_idx" ON "seating_party_plans"("seatingPlanId");
CREATE INDEX "seating_party_plans_invitationId_idx" ON "seating_party_plans"("invitationId");
CREATE INDEX "seating_party_plans_eventId_idx" ON "seating_party_plans"("eventId");
CREATE UNIQUE INDEX "seating_party_plans_seatingPlanId_invitationId_key" ON "seating_party_plans"("seatingPlanId", "invitationId");
CREATE INDEX "fraud_detection_logs_eventId_idx" ON "fraud_detection_logs"("eventId");
CREATE INDEX "fraud_detection_logs_severity_idx" ON "fraud_detection_logs"("severity");
CREATE INDEX "reminder_schedules_eventId_idx" ON "reminder_schedules"("eventId");
CREATE INDEX "reminder_schedules_scheduledAt_idx" ON "reminder_schedules"("scheduledAt");
CREATE INDEX "vendor_reviews_vendorId_idx" ON "vendor_reviews"("vendorId");
CREATE INDEX "vendor_reviews_bookingId_idx" ON "vendor_reviews"("bookingId");
CREATE UNIQUE INDEX "vendor_reviews_bookingId_userId_key" ON "vendor_reviews"("bookingId", "userId");
CREATE INDEX "event_expenses_eventId_idx" ON "event_expenses"("eventId");
CREATE UNIQUE INDEX "template_favorites_userId_templateId_key" ON "template_favorites"("userId", "templateId");
CREATE INDEX "template_purchases_userId_idx" ON "template_purchases"("userId");
CREATE UNIQUE INDEX "designer_profiles_userId_key" ON "designer_profiles"("userId");
CREATE INDEX "template_assets_type_idx" ON "template_assets"("type");
CREATE INDEX "design_exports_userId_idx" ON "design_exports"("userId");
CREATE INDEX "generated_designs_userId_idx" ON "generated_designs"("userId");
CREATE INDEX "generated_designs_eventId_idx" ON "generated_designs"("eventId");
CREATE INDEX "event_plans_eventId_idx" ON "event_plans"("eventId");
CREATE INDEX "event_plans_userId_idx" ON "event_plans"("userId");
CREATE UNIQUE INDEX "event_plan_versions_eventPlanId_version_key" ON "event_plan_versions"("eventPlanId", "version");
CREATE INDEX "ai_requests_module_idx" ON "ai_requests"("module");
CREATE UNIQUE INDEX "funeral_profiles_eventId_key" ON "funeral_profiles"("eventId");
CREATE INDEX "tribute_messages_eventId_idx" ON "tribute_messages"("eventId");
CREATE INDEX "tribute_messages_eventId_approvalStatus_idx" ON "tribute_messages"("eventId", "approvalStatus");
CREATE INDEX "virtual_candles_eventId_idx" ON "virtual_candles"("eventId");
CREATE INDEX "memorial_timeline_entries_eventId_idx" ON "memorial_timeline_entries"("eventId");
CREATE INDEX "memorial_guestbook_entries_eventId_idx" ON "memorial_guestbook_entries"("eventId");
CREATE INDEX "memorial_guestbook_entries_eventId_approvalStatus_idx" ON "memorial_guestbook_entries"("eventId", "approvalStatus");
CREATE INDEX "memorial_livestreams_eventId_idx" ON "memorial_livestreams"("eventId");
CREATE INDEX "funeral_family_members_eventId_idx" ON "funeral_family_members"("eventId");
CREATE UNIQUE INDEX "funeral_family_members_eventId_userId_key" ON "funeral_family_members"("eventId", "userId");
CREATE INDEX "memorial_media_items_eventId_idx" ON "memorial_media_items"("eventId");
CREATE INDEX "memorial_media_items_eventId_approvalStatus_idx" ON "memorial_media_items"("eventId", "approvalStatus");
CREATE INDEX "funeral_programs_eventId_idx" ON "funeral_programs"("eventId");
CREATE UNIQUE INDEX "legacy_archives_eventId_key" ON "legacy_archives"("eventId");
CREATE UNIQUE INDEX "memory_vaults_eventId_key" ON "memory_vaults"("eventId");
CREATE UNIQUE INDEX "thank_you_pages_eventId_key" ON "thank_you_pages"("eventId");
CREATE UNIQUE INDEX "thank_you_pages_shareToken_key" ON "thank_you_pages"("shareToken");
CREATE UNIQUE INDEX "event_memory_settings_eventId_key" ON "event_memory_settings"("eventId");
CREATE UNIQUE INDEX "event_memory_uploads_videoAssetId_key" ON "event_memory_uploads"("videoAssetId");
CREATE INDEX "event_memory_uploads_eventId_status_idx" ON "event_memory_uploads"("eventId", "status");
CREATE INDEX "event_memory_uploads_eventId_createdAt_idx" ON "event_memory_uploads"("eventId", "createdAt");
CREATE INDEX "event_memory_uploads_eventId_uploaderGuestKey_idx" ON "event_memory_uploads"("eventId", "uploaderGuestKey");
CREATE UNIQUE INDEX "event_memory_tokens_token_key" ON "event_memory_tokens"("token");
CREATE INDEX "event_memory_tokens_eventId_type_idx" ON "event_memory_tokens"("eventId", "type");
CREATE INDEX "event_memory_likes_eventId_memoryId_idx" ON "event_memory_likes"("eventId", "memoryId");
CREATE UNIQUE INDEX "event_memory_likes_memoryId_guestKey_key" ON "event_memory_likes"("memoryId", "guestKey");
CREATE INDEX "event_memory_comments_memoryId_createdAt_idx" ON "event_memory_comments"("memoryId", "createdAt");
CREATE INDEX "event_memory_comments_eventId_createdAt_idx" ON "event_memory_comments"("eventId", "createdAt");
CREATE INDEX "event_memory_comments_authorTokenHash_idx" ON "event_memory_comments"("authorTokenHash");
CREATE INDEX "event_memory_consents_eventId_idx" ON "event_memory_consents"("eventId");
CREATE UNIQUE INDEX "event_memory_consents_eventId_guestKey_key" ON "event_memory_consents"("eventId", "guestKey");
CREATE UNIQUE INDEX "invitation_catalog_templates_slug_key" ON "invitation_catalog_templates"("slug");
CREATE INDEX "invitation_catalog_templates_category_idx" ON "invitation_catalog_templates"("category");
CREATE INDEX "invitation_catalog_templates_style_idx" ON "invitation_catalog_templates"("style");
CREATE INDEX "invitation_catalog_templates_tier_idx" ON "invitation_catalog_templates"("tier");
CREATE INDEX "invitation_catalog_templates_defaultMusicTrackId_idx" ON "invitation_catalog_templates"("defaultMusicTrackId");
CREATE UNIQUE INDEX "invitation_product_packages_slug_key" ON "invitation_product_packages"("slug");
CREATE UNIQUE INDEX "invitation_addons_slug_key" ON "invitation_addons"("slug");
CREATE INDEX "invitation_music_tracks_isActive_category_idx" ON "invitation_music_tracks"("isActive", "category");
CREATE UNIQUE INDEX "invitation_orders_idempotencyKey_key" ON "invitation_orders"("idempotencyKey");
CREATE INDEX "invitation_orders_userId_idx" ON "invitation_orders"("userId");
CREATE INDEX "invitation_orders_status_idx" ON "invitation_orders"("status");
CREATE INDEX "invitation_orders_workflowStage_idx" ON "invitation_orders"("workflowStage");
CREATE INDEX "invitation_orders_assignedDesignerId_idx" ON "invitation_orders"("assignedDesignerId");
CREATE INDEX "invitation_revisions_invitationOrderId_idx" ON "invitation_revisions"("invitationOrderId");
CREATE INDEX "revision_comments_revisionId_idx" ON "revision_comments"("revisionId");
CREATE UNIQUE INDEX "revision_payments_paymentId_key" ON "revision_payments"("paymentId");
CREATE INDEX "revision_payments_revisionId_idx" ON "revision_payments"("revisionId");
CREATE INDEX "production_assignments_orderId_idx" ON "production_assignments"("orderId");
CREATE INDEX "production_assignments_designerId_idx" ON "production_assignments"("designerId");
CREATE INDEX "invitation_approvals_orderId_idx" ON "invitation_approvals"("orderId");
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");
CREATE UNIQUE INDEX "exchange_rates_baseCurrency_targetCurrency_key" ON "exchange_rates"("baseCurrency", "targetCurrency");
CREATE INDEX "package_prices_packageId_isActive_idx" ON "package_prices"("packageId", "isActive");
CREATE INDEX "payment_currency_logs_paymentId_idx" ON "payment_currency_logs"("paymentId");
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");
CREATE INDEX "translations_namespace_idx" ON "translations"("namespace");
CREATE UNIQUE INDEX "translations_namespace_key_key" ON "translations"("namespace", "key");
CREATE UNIQUE INDEX "user_language_preferences_userId_key" ON "user_language_preferences"("userId");
CREATE INDEX "invitation_language_versions_invitationId_idx" ON "invitation_language_versions"("invitationId");
CREATE UNIQUE INDEX "invitation_language_versions_invitationOrderId_languageCode_key" ON "invitation_language_versions"("invitationOrderId", "languageCode");
CREATE INDEX "invitation_block_templates_category_idx" ON "invitation_block_templates"("category");
CREATE UNIQUE INDEX "invitation_block_templates_blockType_category_key" ON "invitation_block_templates"("blockType", "category");
CREATE INDEX "invitation_blocks_invitationId_sortOrder_idx" ON "invitation_blocks"("invitationId", "sortOrder");
CREATE INDEX "invitation_blocks_invitationOrderId_sortOrder_idx" ON "invitation_blocks"("invitationOrderId", "sortOrder");
CREATE UNIQUE INDEX "invitation_block_content_blockId_language_key" ON "invitation_block_content"("blockId", "language");
CREATE INDEX "invitation_media_blockId_idx" ON "invitation_media"("blockId");
CREATE INDEX "invitation_gallery_items_blockId_sortOrder_idx" ON "invitation_gallery_items"("blockId", "sortOrder");
CREATE INDEX "legal_document_versions_slug_isPublished_idx" ON "legal_document_versions"("slug", "isPublished");
CREATE UNIQUE INDEX "legal_document_versions_slug_version_key" ON "legal_document_versions"("slug", "version");
CREATE INDEX "user_consent_records_userId_type_idx" ON "user_consent_records"("userId", "type");
CREATE INDEX "invitation_analytics_events_eventType_createdAt_idx" ON "invitation_analytics_events"("eventType", "createdAt");
CREATE INDEX "invitation_analytics_events_orderId_idx" ON "invitation_analytics_events"("orderId");
CREATE INDEX "invitation_analytics_events_invitationId_idx" ON "invitation_analytics_events"("invitationId");
CREATE INDEX "invitation_analytics_events_userId_idx" ON "invitation_analytics_events"("userId");
CREATE INDEX "inspiration_sources_userId_createdAt_idx" ON "inspiration_sources"("userId", "createdAt");
CREATE INDEX "inspiration_sources_status_idx" ON "inspiration_sources"("status");
CREATE UNIQUE INDEX "inspiration_analysis_sourceId_key" ON "inspiration_analysis"("sourceId");
CREATE UNIQUE INDEX "generated_templates_slug_key" ON "generated_templates"("slug");
CREATE INDEX "generated_templates_userId_idx" ON "generated_templates"("userId");
CREATE INDEX "generated_templates_sourceId_idx" ON "generated_templates"("sourceId");
CREATE INDEX "studio_projects_userId_idx" ON "studio_projects"("userId");
CREATE INDEX "inspiration_media_sourceId_idx" ON "inspiration_media"("sourceId");
CREATE INDEX "inspiration_audit_logs_userId_createdAt_idx" ON "inspiration_audit_logs"("userId", "createdAt");
CREATE INDEX "inspiration_audit_logs_sourceId_idx" ON "inspiration_audit_logs"("sourceId");
CREATE UNIQUE INDEX "inspiration_domain_policies_domain_key" ON "inspiration_domain_policies"("domain");
CREATE UNIQUE INDEX "workspace_permission_definitions_key_key" ON "workspace_permission_definitions"("key");
CREATE INDEX "workspace_permission_definitions_scope_isActive_idx" ON "workspace_permission_definitions"("scope", "isActive");
CREATE INDEX "workspace_role_permissions_roleKey_idx" ON "workspace_role_permissions"("roleKey");
CREATE UNIQUE INDEX "workspace_role_permissions_roleKey_permissionId_key" ON "workspace_role_permissions"("roleKey", "permissionId");
CREATE UNIQUE INDEX "organizer_profiles_userId_key" ON "organizer_profiles"("userId");
CREATE UNIQUE INDEX "organizer_profiles_slug_key" ON "organizer_profiles"("slug");
CREATE INDEX "organizer_profiles_isPublic_isVerified_idx" ON "organizer_profiles"("isPublic", "isVerified");
CREATE INDEX "organizer_profiles_city_region_idx" ON "organizer_profiles"("city", "region");
CREATE INDEX "event_collaborators_eventId_isActive_idx" ON "event_collaborators"("eventId", "isActive");
CREATE INDEX "event_collaborators_userId_isActive_idx" ON "event_collaborators"("userId", "isActive");
CREATE UNIQUE INDEX "event_collaborators_eventId_userId_key" ON "event_collaborators"("eventId", "userId");
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");
CREATE INDEX "workspace_invitations_inviteeUserId_status_idx" ON "workspace_invitations"("inviteeUserId", "status");
CREATE INDEX "workspace_invitations_inviteeEmail_status_idx" ON "workspace_invitations"("inviteeEmail", "status");
CREATE INDEX "workspace_invitations_eventId_status_idx" ON "workspace_invitations"("eventId", "status");
CREATE INDEX "workspace_invitations_token_idx" ON "workspace_invitations"("token");
CREATE INDEX "organization_members_userId_isActive_idx" ON "organization_members"("userId", "isActive");
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");
CREATE INDEX "client_relationships_clientId_idx" ON "client_relationships"("clientId");
CREATE UNIQUE INDEX "client_relationships_organizerId_clientId_key" ON "client_relationships"("organizerId", "clientId");
CREATE INDEX "event_activity_logs_eventId_createdAt_idx" ON "event_activity_logs"("eventId", "createdAt");
CREATE INDEX "event_activity_logs_userId_idx" ON "event_activity_logs"("userId");
CREATE INDEX "event_tasks_eventId_status_idx" ON "event_tasks"("eventId", "status");
CREATE INDEX "event_tasks_assignedToId_idx" ON "event_tasks"("assignedToId");
CREATE INDEX "event_task_comments_taskId_createdAt_idx" ON "event_task_comments"("taskId", "createdAt");
CREATE INDEX "event_chat_channels_eventId_idx" ON "event_chat_channels"("eventId");
CREATE UNIQUE INDEX "event_chat_channels_eventId_slug_key" ON "event_chat_channels"("eventId", "slug");
CREATE INDEX "event_chat_messages_channelId_createdAt_idx" ON "event_chat_messages"("channelId", "createdAt");
CREATE INDEX "event_chat_messages_senderId_idx" ON "event_chat_messages"("senderId");
CREATE UNIQUE INDEX "event_blueprint_configs_eventType_key" ON "event_blueprint_configs"("eventType");
CREATE UNIQUE INDEX "event_workspaces_eventId_key" ON "event_workspaces"("eventId");
CREATE INDEX "event_workspaces_eventType_idx" ON "event_workspaces"("eventType");
CREATE INDEX "event_enabled_features_eventId_isEnabled_idx" ON "event_enabled_features"("eventId", "isEnabled");
CREATE INDEX "event_enabled_features_featureKey_idx" ON "event_enabled_features"("featureKey");
CREATE UNIQUE INDEX "event_enabled_features_eventId_featureKey_key" ON "event_enabled_features"("eventId", "featureKey");
CREATE INDEX "event_package_features_packageId_idx" ON "event_package_features"("packageId");
CREATE UNIQUE INDEX "event_package_features_packageId_featureKey_key" ON "event_package_features"("packageId", "featureKey");
CREATE INDEX "event_addons_eventId_idx" ON "event_addons"("eventId");
CREATE UNIQUE INDEX "video_assets_originalKey_key" ON "video_assets"("originalKey");
CREATE INDEX "video_assets_ownerId_idx" ON "video_assets"("ownerId");
CREATE INDEX "video_assets_status_idx" ON "video_assets"("status");
CREATE INDEX "video_assets_category_idx" ON "video_assets"("category");
CREATE INDEX "video_assets_eventId_idx" ON "video_assets"("eventId");
CREATE INDEX "video_assets_vendorId_idx" ON "video_assets"("vendorId");
CREATE INDEX "video_assets_createdAt_idx" ON "video_assets"("createdAt");
CREATE UNIQUE INDEX "event_gift_campaigns_publicToken_key" ON "event_gift_campaigns"("publicToken");
CREATE INDEX "event_gift_campaigns_eventId_status_idx" ON "event_gift_campaigns"("eventId", "status");
CREATE INDEX "event_gift_campaigns_publicToken_idx" ON "event_gift_campaigns"("publicToken");
CREATE INDEX "event_gift_campaigns_invitationId_idx" ON "event_gift_campaigns"("invitationId");
CREATE UNIQUE INDEX "event_gift_payments_reference_key" ON "event_gift_payments"("reference");
CREATE UNIQUE INDEX "event_gift_payments_paymentId_key" ON "event_gift_payments"("paymentId");
CREATE UNIQUE INDEX "event_gift_payments_idempotencyKey_key" ON "event_gift_payments"("idempotencyKey");
CREATE INDEX "event_gift_payments_campaignId_status_idx" ON "event_gift_payments"("campaignId", "status");
CREATE INDEX "event_gift_payments_eventId_createdAt_idx" ON "event_gift_payments"("eventId", "createdAt");
CREATE INDEX "event_gift_payments_status_idx" ON "event_gift_payments"("status");
CREATE INDEX "event_gift_payments_userId_idx" ON "event_gift_payments"("userId");
CREATE INDEX "event_gift_payments_guestId_idx" ON "event_gift_payments"("guestId");
CREATE UNIQUE INDEX "event_gift_receipts_giftPaymentId_key" ON "event_gift_receipts"("giftPaymentId");
CREATE UNIQUE INDEX "event_gift_receipts_receiptNumber_key" ON "event_gift_receipts"("receiptNumber");
CREATE UNIQUE INDEX "event_gift_receipts_tokenFingerprint_key" ON "event_gift_receipts"("tokenFingerprint");
CREATE INDEX "event_gift_receipts_receiptNumber_idx" ON "event_gift_receipts"("receiptNumber");
CREATE UNIQUE INDEX "event_wallet_withdrawal_requests_idempotencyKey_key" ON "event_wallet_withdrawal_requests"("idempotencyKey");
CREATE INDEX "event_wallet_withdrawal_requests_eventId_status_createdAt_idx" ON "event_wallet_withdrawal_requests"("eventId", "status", "createdAt");
CREATE INDEX "event_wallet_withdrawal_requests_accountId_status_idx" ON "event_wallet_withdrawal_requests"("accountId", "status");
CREATE INDEX "event_wallet_withdrawal_requests_requestedById_idx" ON "event_wallet_withdrawal_requests"("requestedById");
CREATE UNIQUE INDEX "event_wallet_ledger_entries_idempotencyKey_key" ON "event_wallet_ledger_entries"("idempotencyKey");
CREATE INDEX "event_wallet_ledger_entries_accountId_createdAt_idx" ON "event_wallet_ledger_entries"("accountId", "createdAt");
CREATE INDEX "event_wallet_ledger_entries_eventId_createdAt_idx" ON "event_wallet_ledger_entries"("eventId", "createdAt");
CREATE INDEX "event_wallet_ledger_entries_giftPaymentId_idx" ON "event_wallet_ledger_entries"("giftPaymentId");
CREATE INDEX "event_wallet_ledger_entries_type_idx" ON "event_wallet_ledger_entries"("type");
CREATE UNIQUE INDEX "event_admission_settings_eventId_key" ON "event_admission_settings"("eventId");
CREATE UNIQUE INDEX "guest_passes_tokenHash_key" ON "guest_passes"("tokenHash");
CREATE UNIQUE INDEX "guest_passes_tokenNonce_key" ON "guest_passes"("tokenNonce");
CREATE INDEX "guest_passes_eventId_status_idx" ON "guest_passes"("eventId", "status");
CREATE INDEX "guest_passes_invitationId_status_idx" ON "guest_passes"("invitationId", "status");
CREATE INDEX "guest_passes_tokenPrefix_idx" ON "guest_passes"("tokenPrefix");
CREATE UNIQUE INDEX "guest_passes_eventId_code_key" ON "guest_passes"("eventId", "code");
CREATE UNIQUE INDEX "guest_passes_invitationId_tokenVersion_key" ON "guest_passes"("invitationId", "tokenVersion");
CREATE INDEX "guest_import_batches_eventId_status_idx" ON "guest_import_batches"("eventId", "status");
CREATE INDEX "guest_import_batches_eventId_createdAt_idx" ON "guest_import_batches"("eventId", "createdAt");
CREATE INDEX "guest_import_rows_batchId_status_idx" ON "guest_import_rows"("batchId", "status");
CREATE INDEX "guest_import_rows_invitationId_idx" ON "guest_import_rows"("invitationId");
CREATE UNIQUE INDEX "guest_import_rows_batchId_rowIndex_key" ON "guest_import_rows"("batchId", "rowIndex");
CREATE UNIQUE INDEX "general_pass_batches_registrationToken_key" ON "general_pass_batches"("registrationToken");
CREATE INDEX "general_pass_batches_eventId_status_idx" ON "general_pass_batches"("eventId", "status");
CREATE INDEX "general_pass_registrations_batchId_createdAt_idx" ON "general_pass_registrations"("batchId", "createdAt");
CREATE INDEX "general_pass_registrations_batchId_ipHash_idx" ON "general_pass_registrations"("batchId", "ipHash");
CREATE INDEX "guest_import_deliveries_batchId_status_idx" ON "guest_import_deliveries"("batchId", "status");
CREATE INDEX "guest_import_deliveries_status_queuedAt_idx" ON "guest_import_deliveries"("status", "queuedAt");
CREATE UNIQUE INDEX "guest_import_deliveries_batchId_rowId_channel_key" ON "guest_import_deliveries"("batchId", "rowId", "channel");
CREATE UNIQUE INDEX "event_qr_links_publicToken_key" ON "event_qr_links"("publicToken");
CREATE INDEX "event_qr_links_eventId_type_status_idx" ON "event_qr_links"("eventId", "type", "status");
CREATE INDEX "event_qr_links_publicToken_idx" ON "event_qr_links"("publicToken");
CREATE UNIQUE INDEX "event_qr_links_eventId_type_title_key" ON "event_qr_links"("eventId", "type", "title");
CREATE UNIQUE INDEX "shared_event_access_passes_tokenHash_key" ON "shared_event_access_passes"("tokenHash");
CREATE INDEX "shared_event_access_passes_eventId_status_idx" ON "shared_event_access_passes"("eventId", "status");
CREATE INDEX "shared_event_access_passes_tokenHash_idx" ON "shared_event_access_passes"("tokenHash");
CREATE UNIQUE INDEX "shared_event_access_passes_eventId_type_tokenVersion_key" ON "shared_event_access_passes"("eventId", "type", "tokenVersion");
CREATE UNIQUE INDEX "shared_event_access_passes_eventId_manualCode_key" ON "shared_event_access_passes"("eventId", "manualCode");
CREATE INDEX "shared_access_pass_print_variants_passId_idx" ON "shared_access_pass_print_variants"("passId");
CREATE UNIQUE INDEX "shared_access_pass_print_variants_passId_roleKey_key" ON "shared_access_pass_print_variants"("passId", "roleKey");
CREATE INDEX "shared_access_pass_scans_eventId_createdAt_idx" ON "shared_access_pass_scans"("eventId", "createdAt");
CREATE INDEX "shared_access_pass_scans_passId_createdAt_idx" ON "shared_access_pass_scans"("passId", "createdAt");
CREATE UNIQUE INDEX "shared_access_pass_scans_clientRecordId_key" ON "shared_access_pass_scans"("clientRecordId");
CREATE UNIQUE INDEX "vendor_team_passes_tokenHash_key" ON "vendor_team_passes"("tokenHash");
CREATE UNIQUE INDEX "vendor_team_passes_tokenNonce_key" ON "vendor_team_passes"("tokenNonce");
CREATE UNIQUE INDEX "vendor_team_passes_publicToken_key" ON "vendor_team_passes"("publicToken");
CREATE INDEX "vendor_team_passes_eventId_status_idx" ON "vendor_team_passes"("eventId", "status");
CREATE INDEX "vendor_team_passes_eventId_passType_idx" ON "vendor_team_passes"("eventId", "passType");
CREATE INDEX "vendor_team_passes_publicToken_idx" ON "vendor_team_passes"("publicToken");
CREATE INDEX "vendor_team_passes_tokenPrefix_idx" ON "vendor_team_passes"("tokenPrefix");
CREATE UNIQUE INDEX "vendor_team_passes_eventId_admissionCode_key" ON "vendor_team_passes"("eventId", "admissionCode");
CREATE INDEX "event_vendor_pass_types_eventId_isActive_idx" ON "event_vendor_pass_types"("eventId", "isActive");
CREATE UNIQUE INDEX "event_vendor_pass_types_eventId_key_key" ON "event_vendor_pass_types"("eventId", "key");
CREATE INDEX "vendor_team_pass_members_passId_idx" ON "vendor_team_pass_members"("passId");
CREATE INDEX "vendor_team_pass_admissions_passId_createdAt_idx" ON "vendor_team_pass_admissions"("passId", "createdAt");
CREATE INDEX "vendor_team_pass_admissions_passId_outcome_createdAt_idx" ON "vendor_team_pass_admissions"("passId", "outcome", "createdAt");
CREATE INDEX "vendor_team_pass_admissions_eventId_createdAt_idx" ON "vendor_team_pass_admissions"("eventId", "createdAt");
CREATE UNIQUE INDEX "vendor_team_pass_admissions_clientRecordId_key" ON "vendor_team_pass_admissions"("clientRecordId");
CREATE UNIQUE INDEX "event_guides_eventId_key" ON "event_guides"("eventId");
CREATE INDEX "event_guides_eventId_status_idx" ON "event_guides"("eventId", "status");
CREATE UNIQUE INDEX "event_guide_offline_packs_tokenHash_key" ON "event_guide_offline_packs"("tokenHash");
CREATE INDEX "event_guide_offline_packs_guideId_status_idx" ON "event_guide_offline_packs"("guideId", "status");
CREATE INDEX "event_guide_offline_packs_tokenHash_idx" ON "event_guide_offline_packs"("tokenHash");
CREATE INDEX "event_guide_view_stats_guideId_day_idx" ON "event_guide_view_stats"("guideId", "day");
CREATE UNIQUE INDEX "event_guide_view_stats_guideId_day_tab_channel_key" ON "event_guide_view_stats"("guideId", "day", "tab", "channel");
CREATE UNIQUE INDEX "help_guides_slug_key" ON "help_guides"("slug");
CREATE INDEX "help_guides_status_role_sortOrder_idx" ON "help_guides"("status", "role", "sortOrder");
CREATE INDEX "help_guides_category_status_idx" ON "help_guides"("category", "status");
CREATE INDEX "help_guides_featured_status_idx" ON "help_guides"("featured", "status");
CREATE INDEX "help_guides_featureKey_idx" ON "help_guides"("featureKey");
CREATE INDEX "help_guides_reviewStatus_idx" ON "help_guides"("reviewStatus");
CREATE INDEX "help_guides_scheduledPublishAt_idx" ON "help_guides"("scheduledPublishAt");
CREATE INDEX "help_guide_feedback_guideId_createdAt_idx" ON "help_guide_feedback"("guideId", "createdAt");
CREATE INDEX "help_guide_versions_guideId_createdAt_idx" ON "help_guide_versions"("guideId", "createdAt");
CREATE UNIQUE INDEX "help_guide_versions_guideId_version_key" ON "help_guide_versions"("guideId", "version");
CREATE INDEX "guide_steps_guideId_sortOrder_idx" ON "guide_steps"("guideId", "sortOrder");
CREATE TABLE IF NOT EXISTS "addon_fulfillment_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "addonSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_INFO',
    "brief" JSONB,
    "deliverableUrl" TEXT,
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "addon_fulfillment_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "invitation_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "addon_fulfillment_requests_status_idx" ON "addon_fulfillment_requests"("status");
CREATE UNIQUE INDEX "addon_fulfillment_requests_orderId_addonSlug_key" ON "addon_fulfillment_requests"("orderId", "addonSlug");
CREATE TABLE IF NOT EXISTS "admin_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "admin_settings_key_key" ON "admin_settings"("key");
CREATE TABLE IF NOT EXISTS "admin_vendor_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "admin_vendor_settings_key_key" ON "admin_vendor_settings"("key");
CREATE TABLE IF NOT EXISTS "ai_design_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_design_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ai_design_requests_userId_idx" ON "ai_design_requests"("userId");
CREATE TABLE IF NOT EXISTS "api_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "description" TEXT,
    "config" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "encryptedKey" TEXT,
    "publicKey" TEXT,
    "webhookUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "api_settings_provider_key" ON "api_settings"("provider");
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE TABLE IF NOT EXISTS "background_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queue" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "background_jobs_queue_status_idx" ON "background_jobs"("queue", "status");
CREATE TABLE IF NOT EXISTS "color_palettes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "category" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "color_palettes_slug_key" ON "color_palettes"("slug");
CREATE TABLE IF NOT EXISTS "design_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'INVITATION',
    "category" TEXT NOT NULL,
    "eventType" TEXT,
    "style" TEXT NOT NULL,
    "colorPalette" JSONB NOT NULL,
    "fontPairing" JSONB NOT NULL,
    "layoutType" TEXT NOT NULL,
    "canvas" JSONB NOT NULL,
    "blocks" JSONB NOT NULL,
    "variables" JSONB,
    "themePreset" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL NOT NULL DEFAULT 0,
    "supportsAnimation" BOOLEAN NOT NULL DEFAULT false,
    "supportsQr" BOOLEAN NOT NULL DEFAULT true,
    "supportsRsvp" BOOLEAN NOT NULL DEFAULT true,
    "supportsTicket" BOOLEAN NOT NULL DEFAULT false,
    "supportsPersonalization" BOOLEAN NOT NULL DEFAULT true,
    "previewUrl" TEXT,
    "thumbnailUrl" TEXT,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 0,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "designerId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "design_templates_designerId_fkey" FOREIGN KEY ("designerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "design_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "design_templates_slug_key" ON "design_templates"("slug");
CREATE INDEX "design_templates_category_idx" ON "design_templates"("category");
CREATE INDEX "design_templates_productType_idx" ON "design_templates"("productType");
CREATE INDEX "design_templates_isPremium_idx" ON "design_templates"("isPremium");
CREATE INDEX "design_templates_isFeatured_idx" ON "design_templates"("isFeatured");
CREATE TABLE IF NOT EXISTS "design_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedDesignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "design_versions_generatedDesignId_fkey" FOREIGN KEY ("generatedDesignId") REFERENCES "generated_designs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "design_versions_generatedDesignId_version_key" ON "design_versions"("generatedDesignId", "version");
CREATE INDEX rsvps_guestId_createdAt_idx ON rsvps(guestId, createdAt);
CREATE UNIQUE INDEX event_wallet_accounts_eventId_book_key ON event_wallet_accounts(eventId, book);
CREATE INDEX event_wallet_accounts_eventId_idx ON event_wallet_accounts(eventId);
CREATE TABLE IF NOT EXISTS "ticket_promos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "discountFixedMinor" INTEGER,
    "maxUses" INTEGER,
    "maxUsesPerUser" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "startsAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ticket_promos_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ticket_promos_eventId_code_key" ON "ticket_promos"("eventId", "code");
CREATE INDEX "ticket_promos_eventId_active_idx" ON "ticket_promos"("eventId", "active");
CREATE TABLE IF NOT EXISTS "ticket_promo_redemptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promoId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_promo_redemptions_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "ticket_promos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ticket_promo_redemptions_orderId_key" ON "ticket_promo_redemptions"("orderId");
CREATE INDEX "ticket_promo_redemptions_promoId_userId_idx" ON "ticket_promo_redemptions"("promoId", "userId");
CREATE INDEX "ticket_promo_redemptions_eventId_idx" ON "ticket_promo_redemptions"("eventId");
CREATE TABLE IF NOT EXISTS "data_deletion_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "discovery" TEXT,
    "retentionNotes" TEXT,
    "reviewedById" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "data_deletion_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "data_deletion_requests_userId_status_idx" ON "data_deletion_requests"("userId", "status");
CREATE INDEX "data_deletion_requests_status_requestedAt_idx" ON "data_deletion_requests"("status", "requestedAt");
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "support_tickets_userId_status_createdAt_idx" ON "support_tickets"("userId", "status", "createdAt");
CREATE INDEX "support_tickets_assignedToId_status_idx" ON "support_tickets"("assignedToId", "status");
CREATE INDEX "support_tickets_status_createdAt_idx" ON "support_tickets"("status", "createdAt");
CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "support_ticket_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "support_ticket_messages_ticketId_createdAt_idx" ON "support_ticket_messages"("ticketId", "createdAt");
CREATE TABLE IF NOT EXISTS "support_ticket_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_ticket_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "support_ticket_events_ticketId_createdAt_idx" ON "support_ticket_events"("ticketId", "createdAt");
