"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { canUseCamera } from "@/lib/qr/device-utils";
import {
  QR_SCAN_DEBOUNCE_MS,
  QR_SCAN_SAME_CODE_MS,
} from "@/lib/qr/qr-constants";
import { buildScannerConfig } from "@/lib/qr/scanner-config";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Flashlight, FlashlightOff, Monitor, Smartphone } from "lucide-react";

interface QrCameraScannerProps {
  active: boolean;
  onScan: (text: string) => void;
  onError?: (message: string) => void;
  /** When true, optimizes for scanning QR codes displayed on phone screens */
  screenScanMode?: boolean;
  onScreenScanModeChange?: (enabled: boolean) => void;
  showScreenScanToggle?: boolean;
  /**
   * Unique DOM id for the viewfinder. Required when only one scanner should
   * ever mount on a page, defaults to a React useId-safe slug.
   */
  viewfinderId?: string;
}

const FILE_READER_ID = "celeventic-qr-file-reader";

type ScannerRef = {
  stop: () => Promise<void>;
  clear: () => void | Promise<void>;
  start: (
    cameraIdOrConfig: string | MediaTrackConstraints,
    configuration: {
      fps: number;
      qrbox: number | { width: number; height: number } | ((w: number, h: number) => { width: number; height: number });
      aspectRatio?: number;
      disableFlip?: boolean;
      experimentalFeatures?: { useBarCodeDetectorIfSupported?: boolean };
    },
    onSuccess: (decoded: string) => void,
    onFailure: (err: string) => void
  ) => Promise<void>;
  scanFile: (file: File, showImage?: boolean) => Promise<string>;
  scanFileV2?: (file: File, showImage?: boolean) => Promise<string>;
  getRunningTrackCameraCapabilities?: () => { torch?: boolean };
  applyVideoConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
};

async function stopScanner(scanner: ScannerRef | null) {
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

const REAR_CAMERA_LABEL = /back|rear|environment|trás|arrière|wide|ultra/i;
const FRONT_CAMERA_LABEL = /front|user|selfie|facetime/i;

/**
 * Rear-camera candidates in strict preference order.
 *
 * Asking for `environment` first avoids relying on device enumeration order
 * (which is not standardized and commonly lists the selfie camera last).
 * Labelled device ids remain useful on browsers that reject exact facingMode.
 */
async function rearCameraCandidates(): Promise<Array<string | MediaTrackConstraints>> {
  const candidates: Array<string | MediaTrackConstraints> = [
    { facingMode: { exact: "environment" } },
  ];

  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras();
    const rearIds = cameras
      .filter(
        (camera) =>
          REAR_CAMERA_LABEL.test(camera.label) &&
          !FRONT_CAMERA_LABEL.test(camera.label)
      )
      .map((camera) => camera.id);
    candidates.push(...rearIds);
  } catch {
    // The semantic constraints below still work when enumeration is blocked.
  }

  candidates.push({ facingMode: { ideal: "environment" } });
  return candidates;
}

function sanitizeDomId(raw: string): string {
  return raw.replace(/:/g, "").replace(/[^a-zA-Z0-9_-]/g, "") || "qrview";
}

/** Browser camera QR scanner, optimized for iOS, Android, and screen-to-screen passes */
export function QrCameraScanner({
  active,
  onScan,
  onError,
  screenScanMode: controlledScreenMode,
  onScreenScanModeChange,
  showScreenScanToggle = true,
  viewfinderId: viewfinderIdProp,
}: QrCameraScannerProps) {
  const reactId = useId();
  const viewfinderId = viewfinderIdProp ?? `celeventic-qr-viewfinder-${sanitizeDomId(reactId)}`;
  const scannerRef = useRef<ScannerRef | null>(null);
  const lastScanRef = useRef<{ text: string; at: number } | null>(null);
  const cooldownRef = useRef(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [starting, setStarting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  // Printed passes are the entrance default; hosts toggle screen mode when needed.
  const [internalScreenMode, setInternalScreenMode] = useState(false);
  const screenScanMode = controlledScreenMode ?? internalScreenMode;

  const setScreenScanMode = useCallback(
    (value: boolean) => {
      if (onScreenScanModeChange) onScreenScanModeChange(value);
      else setInternalScreenMode(value);
    },
    [onScreenScanModeChange]
  );

  const handleScan = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.text === trimmed && now - last.at < QR_SCAN_SAME_CODE_MS) return;
      if (cooldownRef.current) return;
      lastScanRef.current = { text: trimmed, at: now };
      cooldownRef.current = true;
      onScan(trimmed);
      window.setTimeout(() => {
        cooldownRef.current = false;
      }, QR_SCAN_DEBOUNCE_MS);
    },
    [onScan]
  );

  const applyTorch = useCallback(async (on: boolean) => {
    const track = videoTrackRef.current;
    if (!track) return false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ torch: on } as any] });
      setTorchOn(on);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      void stopScanner(scannerRef.current);
      scannerRef.current = null;
      videoTrackRef.current = null;
      setTorchOn(false);
      setTorchAvailable(false);
      lastScanRef.current = null;
      cooldownRef.current = false;
      return;
    }

    if (!canUseCamera()) {
      onError?.("Camera requires HTTPS. Open Celeventic over a secure connection.");
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setStarting(true);
      await stopScanner(scannerRef.current);
      scannerRef.current = null;
      videoTrackRef.current = null;
      setTorchAvailable(false);
      setTorchOn(false);

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const host = document.getElementById(viewfinderId);
        if (!host) {
          onError?.("Scanner viewfinder is not ready. Refresh and try again.");
          return;
        }

        const scanner = new Html5Qrcode(viewfinderId, {
          verbose: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        }) as unknown as ScannerRef;
        scannerRef.current = scanner;

        const cameras = await rearCameraCandidates();
        const config = buildScannerConfig(screenScanMode);

        const startWithCamera = async (cam: string | MediaTrackConstraints) => {
          await scanner.start(cam, config, (decoded) => handleScan(decoded), () => undefined);
        };

        let lastStartError: unknown = null;
        let started = false;
        for (const camera of cameras) {
          try {
            await startWithCamera(camera);
            started = true;
            break;
          } catch (error) {
            lastStartError = error;
          }
        }
        if (!started) {
          throw lastStartError instanceof Error
            ? lastStartError
            : new Error("Rear camera is unavailable on this device.");
        }

        if (cancelled) return;

        // Capture the live track for torch + capability probes.
        const video = host.querySelector("video");
        const stream = video?.srcObject;
        if (stream instanceof MediaStream) {
          const track = stream.getVideoTracks()[0] ?? null;
          const facingMode = track?.getSettings?.().facingMode;
          if (facingMode === "user") {
            await stopScanner(scanner);
            scannerRef.current = null;
            throw new Error(
              "The browser selected the selfie camera. Choose the rear camera in browser permissions and try again."
            );
          }
          videoTrackRef.current = track;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const caps = track?.getCapabilities?.() as any;
          setTorchAvailable(Boolean(caps?.torch));
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Camera unavailable";
          onError?.(
            msg.includes("NotAllowed")
              ? "Camera permission denied. Allow camera access in your browser settings."
              : msg.includes("NotFound")
                ? "No camera found on this device."
                : msg
          );
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
      videoTrackRef.current = null;
    };
  }, [active, handleScan, onError, screenScanMode, viewfinderId]);

  if (!active) return null;

  return (
    <div className="space-y-3">
      {showScreenScanToggle && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            {screenScanMode ? (
              <Smartphone className="h-4 w-4 text-brand-600 shrink-0" />
            ) : (
              <Monitor className="h-4 w-4 text-slate-500 shrink-0" />
            )}
            <div>
              <Label htmlFor="screen-scan-mode" className="font-medium cursor-pointer">
                Screen pass mode
              </Label>
              <p className="text-xs text-slate-500">
                Boost sensitivity for QR codes shown on guest phone screens
              </p>
            </div>
          </div>
          <Switch
            id="screen-scan-mode"
            checked={screenScanMode}
            onCheckedChange={setScreenScanMode}
          />
        </div>
      )}

      <div
        className={cn(
          "relative w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-slate-900 border shadow-xl",
          screenScanMode ? "border-brand-400/50 ring-2 ring-brand-400/20" : "border-slate-700"
        )}
      >
        <div
          id={viewfinderId}
          className={cn(
            "w-full min-h-[300px] sm:min-h-[420px] [&_video]:w-full [&_video]:h-full",
            // Screen mode: contain keeps the guest phone QR fully in frame (cover crops edges).
            screenScanMode ? "[&_video]:object-contain bg-black" : "[&_video]:object-cover"
          )}
        />
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-medium">
            Starting camera…
          </div>
        )}
        {!starting && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-center">
            <p className="text-xs text-white/90">
              {screenScanMode
                ? "Hold steady · fill the frame with the guest's phone QR"
                : "Point at the pass · printed or on-screen · auto-focus on"}
            </p>
          </div>
        )}
        {torchAvailable && !starting && (
          <div className="absolute top-3 right-3">
            <Button
              type="button"
              size="sm"
              variant={torchOn ? "default" : "secondary"}
              className="h-9 gap-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 border-0"
              onClick={() => void applyTorch(!torchOn)}
            >
              {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
              {torchOn ? "Torch off" : "Torch"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Hidden container required by html5-qrcode file scanning, mount once per page. */
export function QrFileReaderHost() {
  return <div id={FILE_READER_ID} className="hidden" aria-hidden />;
}

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export class QrImageScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrImageScanError";
  }
}

async function scanWithBarcodeDetector(file: File): Promise<string | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Detector = (window as any).BarcodeDetector;
    const detector = new Detector({ formats: ["qr_code"] });
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    bitmap.close?.();
    const raw = codes?.[0]?.rawValue;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

/** Scan QR from uploaded / dropped image, multi-engine for gate reliability */
export async function scanQrFromFile(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new QrImageScanError("The image file is empty. Please try another photo.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new QrImageScanError("Image is too large (max 12MB). Try a clearer, smaller photo of the QR.");
  }
  if (file.type && !ACCEPTED_IMAGE_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    throw new QrImageScanError("Please upload a PNG, JPG, or WebP image of the guest’s QR pass.");
  }

  const fromDetector = await scanWithBarcodeDetector(file);
  if (fromDetector) return fromDetector;

  const host = typeof document !== "undefined" ? document.getElementById(FILE_READER_ID) : null;
  if (!host) {
    throw new QrImageScanError("Scanner is not ready. Refresh the page and try again.");
  }

  const { Html5Qrcode } = await import("html5-qrcode");
  const scanner = new Html5Qrcode(FILE_READER_ID, { verbose: false }) as unknown as ScannerRef;
  try {
    let decoded: string;
    if (scanner.scanFileV2) {
      decoded = await scanner.scanFileV2(file, false);
    } else {
      decoded = await scanner.scanFile(file, false);
    }
    const text = typeof decoded === "string" ? decoded.trim() : String(decoded ?? "").trim();
    if (!text) {
      throw new QrImageScanError(
        "No QR code detected in this image. Use a sharp photo of the admission QR, or enter the 4-digit gate code."
      );
    }
    return text;
  } catch (err) {
    if (err instanceof QrImageScanError) throw err;
    throw new QrImageScanError(
      "Could not read a QR code from this image. Ensure the full code is visible and well-lit, or use the 4-digit gate code."
    );
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
