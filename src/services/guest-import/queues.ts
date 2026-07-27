/**
 * Queue names for the bulk import pipeline.
 *
 * Split into their own module so `lib/job-handlers` and the services can share
 * the constants without importing each other's Prisma-touching code.
 */

/** Generates invitations, guests, passes, place cards and seating from a batch. */
export const GUEST_IMPORT_QUEUE = "guest-import-generate";

/** Sends the queued invitation deliveries for a batch. */
export const GUEST_IMPORT_DELIVERY_QUEUE = "guest-import-deliver";

/** Mints a fixed run of general admission passes (Method A). */
export const GENERAL_PASS_QUEUE = "general-pass-generate";
