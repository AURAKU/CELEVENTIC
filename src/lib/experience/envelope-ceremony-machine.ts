/**
 * Pure sealed-envelope ceremony state machine.
 *
 * idle  --(user gesture only)-->  unsealing  --(timer)-->  opening  --(timer)-->  done
 *
 * No timer may leave idle. Auto-open is a separate explicit preview path that
 * still enters through the same begin() entry — never a hidden idle→done jump.
 */

export type EnvelopeCeremonyPhase = "idle" | "unsealing" | "opening" | "done";

export interface EnvelopeCeremonyConfig {
  /** Unseal duration before flap commit (ms). */
  unsealMs: number;
  /** Full ceremony duration including unseal (ms). */
  durationMs: number;
  /** Skip unsealing beat (reduced motion). */
  reduceMotion?: boolean;
  /** Extra settle after duration before done (memorial). */
  settleExtraMs?: number;
}

export interface EnvelopeCeremonySnapshot {
  phase: EnvelopeCeremonyPhase;
  started: boolean;
  completed: boolean;
}

export type EnvelopeCeremonyEvent =
  | { type: "BEGIN" }
  | { type: "TICK_UNSEAL_DONE" }
  | { type: "TICK_COMPLETE" }
  | { type: "RESET" };

export function createEnvelopeCeremonySnapshot(
  phase: EnvelopeCeremonyPhase = "idle"
): EnvelopeCeremonySnapshot {
  return {
    phase,
    started: phase !== "idle",
    completed: phase === "done",
  };
}

export function reduceEnvelopeCeremony(
  state: EnvelopeCeremonySnapshot,
  event: EnvelopeCeremonyEvent,
  config: EnvelopeCeremonyConfig
): EnvelopeCeremonySnapshot {
  switch (event.type) {
    case "RESET":
      return createEnvelopeCeremonySnapshot("idle");
    case "BEGIN": {
      if (state.started || state.phase !== "idle") return state;
      if (config.reduceMotion) {
        return { phase: "opening", started: true, completed: false };
      }
      return { phase: "unsealing", started: true, completed: false };
    }
    case "TICK_UNSEAL_DONE": {
      if (state.phase !== "unsealing") return state;
      return { ...state, phase: "opening" };
    }
    case "TICK_COMPLETE": {
      if (state.phase === "idle" || state.phase === "done") return state;
      return { phase: "done", started: true, completed: true };
    }
    default:
      return state;
  }
}

/** Scheduled timer lengths after BEGIN — idle has none. */
export function envelopeCeremonyTimersAfterBegin(config: EnvelopeCeremonyConfig): {
  unsealMs: number | null;
  completeMs: number;
} {
  if (config.reduceMotion) {
    return { unsealMs: null, completeMs: config.durationMs + 80 };
  }
  return {
    unsealMs: config.unsealMs,
    completeMs: config.durationMs + (config.settleExtraMs ?? 80),
  };
}
