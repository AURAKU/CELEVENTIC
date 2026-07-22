"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { canUseCamera, isMobileDevice } from "@/lib/qr/device-utils";
import { QR_SCANNER_FPS, QR_SCANNER_FPS_SCREEN } from "@/lib/qr/qr-constants";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Smartphone, Monitor } from "lucide-react";

interface QrCameraScannerProps {
  active: boolean;
  onScan: (text: string) => void;
  onError?: (message: string) => void;
  /** When true, optimizes for scanning QR codes displayed on phone screens */
  screenScanMode?: boolean;
  onScreenScanModeChange?: (enabled: boolean) => void;
  showScreenScanToggle?: boolean;
}

const VIEWFINDER_ID = "celeventic-qr-viewfinder";
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
      rememberLastUsedCameraId?: boolean;
      experimentalFeatures?: { useBarCodeDetectorIfSupported?: boolean };
      videoConstraints?: MediaTrackConstraints;
    },
    onSuccess: (decoded: string) => void,
    onFailure: (err: string) => void
  ) => Promise<void>;
  scanFile: (file: File, showImage?: boolean) => Promise<string>;
  scanFileV2?: (file: File, showImage?: boolean) => Promise<string>;
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

async function pickCameraId(): Promise<string | MediaTrackConstraints> {
  try {
    const { Html5Qrcode } = await import("html5-qrcode");
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) return { facingMode: "environment" };

    const rear =
      cameras.find((c) => /back|rear|environment|trás|arrière|wide/i.test(c.label)) ??
      cameras[cameras.length - 1];

    return rear.id;
  } catch {
    return { facingMode: "environment" };
  }
}

function buildScannerConfig(screenScanMode: boolean) {
  return {
    fps: screenScanMode ? QR_SCANNER_FPS_SCREEN : QR_SCANNER_FPS,
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const ratio = screenScanMode ? 0.82 : 0.72;
      const size = Math.floor(minEdge * ratio);
      return { width: Math.max(200, size), height: Math.max(200, size) };
    },
    aspectRatio: 1,
    disableFlip: false,
    rememberLastUsedCameraId: true,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
    videoConstraints: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };
}

/** Browser camera QR scanner — optimized for iOS, Android, and screen-to-screen passes */
export function QrCameraScanner({
  active,
  onScan,
  onError,
  screenScanMode: controlledScreenMode,
  onScreenScanModeChange,
  showScreenScanToggle = true,
}: QrCameraScannerProps) {
  const scannerRef = useRef<ScannerRef | null>(null);
  const lastScanRef = useRef("");
  const cooldownRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [internalScreenMode, setInternalScreenMode] = useState(isMobileDevice());
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
      if (cooldownRef.current || text === lastScanRef.current) return;
      lastScanRef.current = text;
      cooldownRef.current = true;
      onScan(text);
      setTimeout(() => {
        cooldownRef.current = false;
      }, 1800);
    },
    [onScan]
  );

  useEffect(() => {
    if (!active) {
      void stopScanner(scannerRef.current);
      scannerRef.current = null;
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

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(VIEWFINDER_ID, { verbose: false }) as unknown as ScannerRef;
        scannerRef.current = scanner;

        const camera = await pickCameraId();
        const config = buildScannerConfig(screenScanMode);

        const startWithCamera = async (cam: string | MediaTrackConstraints) => {
          await scanner.start(cam, config, (decoded) => handleScan(decoded), () => undefined);
        };

        try {
          await startWithCamera(camera);
        } catch {
          await startWithCamera({ facingMode: "environment" });
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
    };
  }, [active, handleScan, onError, screenScanMode]);

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
              <p className="text-xs text-slate-500">Scan QR codes shown on guest phone screens</p>
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
          id={VIEWFINDER_ID}
          className="w-full min-h-[280px] sm:min-h-[340px] [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
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
                ? "Hold steady · scan the guest's pass on their phone screen"
                : "Point at QR code · works on iPhone, Android & printed passes"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Hidden container required by html5-qrcode file scanning */
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

/** Scan QR from uploaded / dropped image — multi-engine for gate reliability */
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
