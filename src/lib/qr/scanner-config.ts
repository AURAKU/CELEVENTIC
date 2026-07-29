import { QR_SCANNER_FPS, QR_SCANNER_FPS_SCREEN } from "@/lib/qr/qr-constants";

export interface QrScannerConfig {
  fps: number;
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    width: number;
    height: number;
  };
  disableFlip: boolean;
  experimentalFeatures: {
    useBarCodeDetectorIfSupported: boolean;
  };
}

/**
 * Conservative camera decode configuration for mobile gate devices.
 *
 * Camera selection belongs to Html5Qrcode.start(). Supplying videoConstraints
 * here makes html5-qrcode ignore the selected rear-camera id and also defeats
 * its fallback path.
 */
export function buildScannerConfig(screenScanMode: boolean): QrScannerConfig {
  return {
    fps: screenScanMode ? QR_SCANNER_FPS_SCREEN : QR_SCANNER_FPS,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const ratio = screenScanMode ? 0.92 : 0.82;
      const available = Math.max(50, Math.min(viewfinderWidth, viewfinderHeight));
      const size = Math.min(available, Math.max(120, Math.floor(available * ratio)));
      return { width: size, height: size };
    },
    disableFlip: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
  };
}
