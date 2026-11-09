"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const SCREEN_W = 393;
const SCREEN_H = 852;
const BEZEL = 11;

export type IPhoneLiveStageProps = {
  open: boolean;
  onClose: () => void;
  /** Invitation / couple names, used for the dialog label only */
  title: string;
  category?: string;
  nowPlaying?: string | null;
  nowPlayingCredit?: string | null;
  children: React.ReactNode;
};

function clockLabel() {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return "9:41";
  }
}

/**
 * iPhone 17 Pro-class front: Dynamic Island, titanium rim, action button,
 * Camera Control, home indicator. Screen is the live invitation.
 */
export function IPhoneLiveStage({
  open,
  onClose,
  title,
  children,
}: IPhoneLiveStageProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(clockLabel);
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const tick = () => setTime(clockLabel());
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fit = () => {
      const availW = Math.max(280, window.innerWidth - 24);
      const availH = Math.max(420, window.innerHeight - 24);
      const next = Math.min(1, availW / (SCREEN_W + 28), availH / (SCREEN_H + 28));
      setScale(Math.max(0.42, next));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const frameW = SCREEN_W + BEZEL * 2;
  const frameH = SCREEN_H + BEZEL * 2;

  const frameStyle = useMemo(
    () => ({
      width: frameW,
      height: frameH,
      transform: `scale(${scale})`,
      transformOrigin: "center center",
    }),
    [frameW, frameH, scale]
  );

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[420] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-iphone-preview="true"
    >
      <h2 id={titleId} className="sr-only">
        {title}
      </h2>
      <button
        type="button"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(15,23,42,0.28),rgba(2,6,15,0.94))] backdrop-blur-md"
        aria-label="Close live preview"
        onClick={onClose}
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg hover:bg-white"
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div
        className="relative z-10 flex items-center justify-center"
        style={{
          width: frameW * scale,
          height: frameH * scale,
        }}
      >
        <div
          className="absolute origin-center animate-[iphone-stage-in_520ms_cubic-bezier(0.22,1,0.36,1)_both]"
          style={frameStyle}
        >
          <span className="absolute -left-[3px] top-[118px] h-[28px] w-[3px] rounded-l-sm bg-[#6b6560]" />
          <span className="absolute -left-[3px] top-[162px] h-[52px] w-[3px] rounded-l-sm bg-[#6b6560]" />
          <span className="absolute -left-[3px] top-[222px] h-[52px] w-[3px] rounded-l-sm bg-[#6b6560]" />
          <span className="absolute -right-[3px] top-[168px] h-[78px] w-[3px] rounded-r-sm bg-[#6b6560]" />
          <span className="absolute -right-[4px] top-[268px] h-[42px] w-[4px] rounded-r-md bg-[#8a847c]" />

          <div
            className="relative h-full w-full overflow-hidden rounded-[3.15rem] shadow-[0_40px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.28)]"
            style={{
              padding: BEZEL,
              background:
                "linear-gradient(160deg, #d9d2c8 0%, #8a847c 22%, #3f3c38 48%, #1c1b19 100%)",
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[2.45rem] bg-black">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-12 items-start justify-between px-7 pt-3.5 text-[13px] font-semibold text-white">
                <span className="w-16 tabular-nums">{time}</span>
                <span
                  className="absolute left-1/2 top-2.5 h-[34px] w-[118px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  aria-hidden
                >
                  <span className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#1a1a1a] ring-1 ring-white/10" />
                </span>
                <span className="flex w-16 items-center justify-end gap-1 text-white">
                  <span className="text-[11px] tracking-tight">5G</span>
                  <span className="inline-block h-2.5 w-6 rounded-[3px] border border-white/90">
                    <span className="ml-[1px] mt-[1px] block h-[7px] w-[70%] rounded-[1px] bg-white" />
                  </span>
                </span>
              </div>

              <div className="absolute inset-0 isolate overflow-hidden bg-black">
                <div className="relative h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {children}
                </div>
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center"
                aria-hidden
              >
                <span className="h-[5px] w-[128px] rounded-full bg-white/80" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes iphone-stage-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

export const IPHONE_PREVIEW_EVENT = "celeventic:iphone-preview";
