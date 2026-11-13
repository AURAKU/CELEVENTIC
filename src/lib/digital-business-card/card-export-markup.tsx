import { CELECARD_EXPORT_HEIGHT, CELECARD_EXPORT_WIDTH } from "@/lib/digital-business-card/share";
import {
  CeleCardPlateBitmap,
  type CeleCardPlateBitmapProps,
} from "@/lib/digital-business-card/plate-bitmap";

export type CeleCardExportMarkupProps = Omit<CeleCardPlateBitmapProps, "width" | "height" | "cover">;

/** High-resolution ID-1 plate PNG attached to WhatsApp, iMessage, Instagram, and the rest. */
export function CeleCardExportMarkup(props: CeleCardExportMarkupProps) {
  return (
    <CeleCardPlateBitmap
      {...props}
      width={CELECARD_EXPORT_WIDTH}
      height={CELECARD_EXPORT_HEIGHT}
    />
  );
}
