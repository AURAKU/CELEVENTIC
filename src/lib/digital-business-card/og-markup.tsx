import { CELECARD_OG_HEIGHT, CELECARD_OG_WIDTH } from "@/lib/digital-business-card/share";
import {
  CeleCardPlateBitmap,
  type CeleCardPlateBitmapProps,
} from "@/lib/digital-business-card/plate-bitmap";

export type CeleCardOgMarkupProps = Omit<CeleCardPlateBitmapProps, "width" | "height" | "cover" | "contain">;

/** 1200×630 share tile: the full ID-1 plate (photo, name, title, company, QR). Never a headshot crop. */
export function CeleCardOgMarkup(props: CeleCardOgMarkupProps) {
  return (
    <CeleCardPlateBitmap
      {...props}
      width={CELECARD_OG_WIDTH}
      height={CELECARD_OG_HEIGHT}
      contain
    />
  );
}
