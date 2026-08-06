import { z } from "zod";
import type { ImportOptions } from "./types";

/**
 * The one schema every endpoint validates import options against.
 *
 * Shared deliberately: options travel on three different requests (staging,
 * re-mapping, saving the review) and they decide how many people a pass admits
 * at the gate. A route that accepted them loosely would let a caller raise
 * `maxPartySize` past the ceiling the preview was reviewed under.
 */
export const importOptionsSchema = z
  .object({
    templateId: z.string().max(200).nullable().optional(),
    message: z.string().max(2000).nullable().optional(),
    defaultPartySize: z.number().int().min(1).max(50).optional(),
    maxPartySize: z.number().int().min(1).max(200).optional(),
    issueEntryPass: z.boolean().optional(),
    enablePlaceCard: z.boolean().optional(),
    applySeating: z.boolean().optional(),
    seatingPlanId: z.string().max(200).nullable().optional(),
    normalizeGhanaPhones: z.boolean().optional(),
    validateEmails: z.boolean().optional(),
    publishImmediately: z.boolean().optional(),
    deliveryChannels: z.array(z.enum(["EMAIL", "SMS", "WHATSAPP"])).max(3).optional(),
    duplicatePolicy: z.enum(["REVIEW", "SKIP", "CREATE_ANYWAY"]).optional(),
    defaultTagIds: z.array(z.string().min(1).max(200)).max(20).optional(),
  })
  .strict();

export type ImportOptionsInput = Partial<ImportOptions>;
