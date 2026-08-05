"use client";

import { Component, type ReactNode } from "react";

interface Props {
  /** Pipeline beat this boundary guards — used only for diagnostics. */
  beat: "soft-intro" | "tap-to-begin" | "reveal";
  /**
   * Advance the pipeline past the failed beat. Called once, from
   * `componentDidCatch`, so the host owns the phase transition.
   */
  onFallthrough: () => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Guards a single ceremony beat (brand film, tap gate, envelope reveal).
 *
 * These beats are decoration in front of the invitation: a video element, a
 * canvas, an animation library, a studio-authored palette. When one of them
 * throws — a malformed design config, a media element the browser refuses, a
 * motion feature missing on an older WebView — the guest previously lost the
 * entire invitation to a blank white screen, because nothing between the beat
 * and the route boundary was catching it.
 *
 * So this boundary does not render an error card. An error card in front of a
 * wedding invitation is its own kind of failure. It falls *through* to the next
 * beat instead, which ends at the guest portal — the content the guest actually
 * came for. The ceremony is the only thing lost, and the host is told about it
 * in the console rather than the guest being told on the page.
 */
export class CeremonyErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[invite-ceremony:${this.props.beat}]`, error);
    // Commit phase, so asking the host to change phase here is safe. The host
    // renders a different branch, which unmounts this boundary.
    this.props.onFallthrough();
  }

  render() {
    // One frame of nothing before the host advances — never a stuck blank
    // screen, because `onFallthrough` has already been queued above.
    if (this.state.failed) return null;
    return this.props.children;
  }
}
