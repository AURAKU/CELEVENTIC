"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface QrCameraScannerProps {
  active: boolean;
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}

const VIEWFINDER_ID = "celeventic-qr-viewfinder";

async function stopScanner(scanner: { stop: () => Promise<void>; clear: () => void | Promise<void> } | null) {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    // ignore
  }
  try {
    await Promise.resolve(scanner.clear());
  } catch {
    // ignore
  }
}

/** Browser camera QR scanner using html5-qrcode */
export function QrCameraScanner({ active, onScan, onError }: QrCameraScannerProps) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void | Promise<void> } | null>(null);
  const lastScanRef = useRef("");
  const cooldownRef = useRef(false);
  const [starting, setStarting] = useState(false);

  const handleScan = useCallback(
    (text: string) => {
      if (cooldownRef.current || text === lastScanRef.current) return;
      lastScanRef.current = text;
      cooldownRef.current = true;
      onScan(text);
      setTimeout(() => {
        cooldownRef.current = false;
      }, 2000);
    },
    [onScan]
  );

  useEffect(() => {
    if (!active) {
      void stopScanner(scannerRef.current);
      scannerRef.current = null;
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setStarting(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(VIEWFINDER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 12, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
          (decoded) => handleScan(decoded),
          () => undefined
        );
      } catch (err) {
        if (!cancelled) {
          onError?.(err instanceof Error ? err.message : "Camera unavailable");
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      void stopScanner(scannerRef.current);
      scannerRef.current = null;
    };
  }, [active, handleScan, onError]);

  if (!active) return null;

  return (
    <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-xl">
      <div id={VIEWFINDER_ID} className="w-full min-h-[280px] sm:min-h-[320px]" />
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-medium">
          Starting camera…
        </div>
      )}
    </div>
  );
}

/** Scan QR from uploaded image file */
export async function scanQrFromFile(file: File): Promise<string> {
  const { Html5Qrcode } = await import("html5-qrcode");
  const scanner = new Html5Qrcode("celeventic-qr-file-reader");
  try {
    return await scanner.scanFile(file, false);
  } finally {
    try {
      await Promise.resolve(scanner.clear());
    } catch {
      // ignore
    }
  }
}

export function playScanFeedback(success: boolean) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(success ? [80, 40, 80] : [200]);
  }
  if (typeof window !== "undefined") {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 880 : 220;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
    } catch {
      // audio optional
    }
  }
}
