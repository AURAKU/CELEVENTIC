"use client";

import { Component, type ReactNode } from "react";

interface Props {
  /** Pipeline beat this boundary guards — used only for diagnostics. */
  beat: "soft-intro" | "tap-to-begin" | "reveal";
  /**
   * Advance the pipeline past the failed beat. Called once, from
   * `componentDidCatch`, so the host owns the phase transition.
   *
   * NEVER used for mandatory memorial reveal when `fallthroughPolicy="hold"`.
   */
  onFallthrough: () => void;
  /**
   * `advance` (default): soft-intro / tap / non-mandatory reveals fall through.
   * `hold`: mandatory memorial envelope — do NOT treat errors as ceremony
   * completion. Surface recovery UI instead of silently opening the portal.
   */
  fallthroughPolicy?: "advance" | "hold";
  /** Optional safe diagnostic hook — never receives guest PII. */
  onError?: (error: Error, beat: Props["beat"]) => void;
  /**
   * Shown when `fallthroughPolicy="hold"` and the reveal tree throws.
   * Typically a retry control that remounts the sealed envelope.
   */
  recoverFallback?: ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
  errorName: string | null;
}

const LIVE_REVEAL_DIAG_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_CELEVENTIC_LIVE_REVEAL_DIAG === "1";

/**
 * Guards a single ceremony beat (brand film, tap gate, envelope reveal).
 *
 * Soft-intro / tap-to-begin may fall through to the next beat on failure so
 * guests still reach their invitation. Mandatory memorial envelope reveals
 * MUST NOT silently treat a runtime error as successful ceremony completion.
 */
export class CeremonyErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, errorName: null };

  static getDerivedStateFromError(error: Error): State {
    return { failed: true, errorName: error?.name ?? "Error" };
  }

  componentDidCatch(error: Error) {
    console.error(`[invite-ceremony:${this.props.beat}]`, error);
    if (LIVE_REVEAL_DIAG_ENABLED) {
      console.info("[reveal-error]", {
        beat: this.props.beat,
        name: error.name,
        message: error.message,
        policy: this.props.fallthroughPolicy ?? "advance",
      });
    }
    this.props.onError?.(error, this.props.beat);

    if (this.props.fallthroughPolicy === "hold") {
      // Mandatory memorial: never interpret reveal failure as portal success.
      return;
    }

    this.props.onFallthrough();
  }

  private retry = () => {
    this.setState({ failed: false, errorName: null });
  };

  render() {
    if (!this.state.failed) return this.props.children;

    if (this.props.fallthroughPolicy === "hold") {
      if (this.props.recoverFallback) {
        return this.props.recoverFallback;
      }
      return (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#0a0908] px-6 text-center"
          data-ceremony-recover="reveal"
          role="alert"
        >
          <p
            className="max-w-sm text-sm tracking-wide text-[#F7EFD8]/90"
            style={{ fontFamily: "var(--font-cinzel), Cinzel, serif" }}
          >
            The opening ceremony could not start. Your invitation is still here.
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-full border border-[#E0B84A]/70 bg-black/70 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#F7EFD8]"
            data-ceremony-retry="reveal"
          >
            Show sealed envelope
          </button>
        </div>
      );
    }

    // Advance policy: one frame of nothing before the host advances.
    return null;
  }
}
