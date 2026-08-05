"use client";

import { useEffect, useRef } from "react";
import {
  ForeverAfarisWeddingOpening,
  type WeddingOpeningProps,
} from "@/components/invitation/templates/forever-afaris-wedding-opening";
import {
  DEFAULT_WEDDING_BOARD,
  resolveGateTitle,
  resolveIntroCoupleLine,
  type WeddingEnvelopeStyle,
  type WeddingGateStyle,
  type WeddingSealColor,
  type WeddingSealMotif,
} from "@/lib/invitation/wedding-board";
import type { WeddingPaletteOverrides } from "@/components/invitation/templates/forever-afaris-wedding-palette";

export interface BlushGateOpeningCopy {
  monogram?: string;
  instruction?: string;
  gateWord?: string;
  coupleLine?: string;
  addressLine?: string;
  envelopeStyle?: WeddingEnvelopeStyle;
  gateStyle?: WeddingGateStyle;
  sealColor?: WeddingSealColor;
  sealMotif?: WeddingSealMotif;
  palette?: WeddingPaletteOverrides;
  haptics?: boolean;
}

interface BlushGateRevealProps {
  guestName?: string;
  eventTitle: string;
  hostName?: string;
  /** Editable opening copy resolved from `design.studio.weddingBoard`. */
  copy?: BlushGateOpeningCopy;
  /** Catalogue tiles already consumed the tap, open without a second gesture. */
  autoOpen?: boolean;
  /** Returning guest, surface an honest, opt-in way to move along faster. */
  allowSkip?: boolean;
  /** Framed catalogue/studio preview — absolute shell instead of viewport-fixed. */
  embedded?: boolean;
  onBegin?: () => void;
  onComplete: () => void;
}

/**
 * Pipeline adapter for the Blush Gate ceremony.
 *
 * The choreography itself lives with the template (`ForeverAfarisWeddingOpening`)
 * so the envelope, wax seal, and gate share the template's palette. This wrapper
 * plugs it into the shared reveal contract: copy and ceremony design come from
 * the studio board, `onBegin` unlocks audio, and `autoOpen` supports catalogue
 * previews.
 */
export function BlushGateReveal({
  guestName,
  eventTitle,
  hostName,
  copy,
  autoOpen = false,
  allowSkip = false,
  embedded = false,
  onBegin,
  onComplete,
}: BlushGateRevealProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Catalogue previews that still opt into autoOpen: linger on the sealed
  // envelope first so the lift never feels rushed.
  useEffect(() => {
    if (!autoOpen) return;
    const id = setTimeout(() => {
      stageRef.current
        ?.querySelector<HTMLElement>('[data-blush-gate-seal="true"]')
        ?.click();
    }, 3200);
    return () => clearTimeout(id);
  }, [autoOpen]);

  const coupleLine =
    copy?.coupleLine?.trim() ||
    resolveIntroCoupleLine() ||
    hostName?.trim() ||
    eventTitle.trim() ||
    "CHELSY & JEFFERY";

  const openingProps: WeddingOpeningProps = {
    monogram: copy?.monogram?.trim() || DEFAULT_WEDDING_BOARD.sealMonogram,
    instruction: copy?.instruction?.trim() || DEFAULT_WEDDING_BOARD.openingInstruction,
    gateWord: resolveGateTitle(copy?.gateWord),
    addressLine: copy?.addressLine?.trim() || undefined,
    envelopeStyle: copy?.envelopeStyle ?? DEFAULT_WEDDING_BOARD.envelopeStyle,
    gateStyle: copy?.gateStyle ?? DEFAULT_WEDDING_BOARD.gateStyle,
    sealColor: copy?.sealColor ?? DEFAULT_WEDDING_BOARD.sealColor,
    sealMotif: copy?.sealMotif ?? DEFAULT_WEDDING_BOARD.sealMotif,
    palette: copy?.palette,
    haptics: copy?.haptics ?? DEFAULT_WEDDING_BOARD.haptics,
    coupleLine,
    allowSkip,
    embedded,
    onBegin,
    onComplete,
  };

  return (
    <div
      ref={stageRef}
      className={embedded ? "absolute inset-0 h-full w-full" : undefined}
      aria-label={guestName ? `Invitation for ${guestName}` : undefined}
    >
      <ForeverAfarisWeddingOpening {...openingProps} />
    </div>
  );
}
