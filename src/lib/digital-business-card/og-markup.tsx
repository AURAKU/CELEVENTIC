import { CELECARD_OG_HEIGHT, CELECARD_OG_WIDTH } from "@/lib/digital-business-card/share";
import {
  CeleCardPlateBitmap,
  type CeleCardPlateBitmapProps,
} from "@/lib/digital-business-card/plate-bitmap";

export type CeleCardOgMarkupProps = Omit<CeleCardPlateBitmapProps, "width" | "height" | "cover">;

/** 1200×630 share tile: the live ID-1 plate only. Cover-fills so crawlers never pick the site logo. */
export function CeleCardOgMarkup(props: CeleCardOgMarkupProps) {
  return (
    <CeleCardPlateBitmap
      {...props}
      width={CELECARD_OG_WIDTH}
      height={CELECARD_OG_HEIGHT}
      cover
    />
  );
}
