import type { GuestPartyType } from "@prisma/client";
import { analyseName } from "@/lib/guest-import/name";

/**
 * Party allowance rules, shared by the quick-create form, the API and the
 * bulk editor so a number typed in one place cannot mean something different
 * in another.
 *
 * The allowance is the count of heads the gate will admit on one invitation.
 * It is deliberately separate from "how many guest rows exist": an organiser
 * inviting "Mr & Mrs Obuah" types one name and means two people.
 */

/** Smallest allowance. An invitation that admits nobody is not an invitation. */
export const MIN_PARTY_SIZE = 1;

/**
 * Ceiling for a single personalised invitation.
 *
 * Matches the bulk importer's `maxPartySize` default so a stray keystroke
 * cannot open the gate to fifty people, while still covering a large family
 * table. Genuine coach parties belong in a general-pass batch.
 */
export const MAX_PARTY_SIZE = 20;

/** One-tap sizes offered under the stepper. */
export const PARTY_SIZE_PRESETS = [1, 2, 4, 6, 8, 10] as const;

export const PARTY_TYPE_LABELS: Record<GuestPartyType, string> = {
  INDIVIDUAL: "Individual",
  COUPLE: "Couple",
  PLUS_GUEST: "Plus guest",
  FAMILY: "Family",
  GROUP: "Group",
};

/** Bring any input — string, float, nonsense — into the allowed range. */
export function clampPartySize(value: unknown, fallback = MIN_PARTY_SIZE): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) return fallback;
  return Math.min(MAX_PARTY_SIZE, Math.max(MIN_PARTY_SIZE, Math.floor(numeric)));
}

export interface AllowanceSuggestion {
  partySize: number;
  partyType: GuestPartyType;
  /**
   * False when the name implies a party whose size cannot be known from the
   * text — "The Mensah Family". The form pre-fills the number but asks the
   * organiser to confirm it, and never sends an unconfirmed family through as
   * a single head.
   */
  confirmed: boolean;
  /** Plain-English reason shown under the stepper, or null when unremarkable. */
  hint: string | null;
  /** Individually named people parsed out of the name, e.g. a couple. */
  memberNames: string[];
}

/**
 * Read a typed name and propose an allowance.
 *
 * Called on every keystroke in quick create, so it stays pure and cheap.
 */
export function suggestAllowance(name: string): AllowanceSuggestion {
  const analysis = analyseName(name);
  const partySize = clampPartySize(analysis.partySize);

  let hint: string | null = null;
  if (!analysis.allowanceConfirmed) {
    hint =
      analysis.partyType === "FAMILY"
        ? "A family invitation — set how many people it should admit."
        : "A group invitation — set how many people it should admit.";
  } else if (analysis.explicitCount) {
    hint = `The name says ${partySize} ${partySize === 1 ? "person" : "people"}.`;
  } else if (analysis.partyType === "COUPLE") {
    hint = "Reads as a couple, so this admits two.";
  }

  return {
    partySize,
    partyType: analysis.partyType,
    confirmed: analysis.allowanceConfirmed,
    hint,
    memberNames: analysis.memberNames,
  };
}

/** How the allowance reads on a card: "Admits 2". */
export function describeAllowance(partySize: number): string {
  return partySize === 1 ? "Admits 1 person" : `Admits ${partySize} people`;
}
