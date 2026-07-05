"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { ClassicGoldTemplate } from "./templates/classic-gold";
import { ArchGreenTemplate } from "./templates/arch-green";
import { RusticLaceTemplate } from "./templates/rustic-lace";
import { BohoHexagonTemplate } from "./templates/boho-hexagon";
import { LuxuryRingsTemplate } from "./templates/luxury-rings";
import { CustomMediaTemplate } from "./templates/custom-media";
import { PassportLuxeTemplate } from "./templates/passport-luxe";
import { GlassAcrylicTemplate } from "./templates/glass-acrylic";
import { FloralGardenTemplate } from "./templates/floral-garden";
import { CinematicTemplate, isCinematicLayout } from "./templates/cinematic-template";

export function InvitationRenderer(props: InvitationRenderProps) {
  const content = isCinematicLayout(props.design.layout) ? (
    <CinematicTemplate {...props} />
  ) : (() => {
    switch (props.design.layout) {
      case "passport-luxe":
        return <PassportLuxeTemplate {...props} />;
      case "glass-acrylic":
        return <GlassAcrylicTemplate {...props} />;
      case "floral-garden":
        return <FloralGardenTemplate {...props} />;
      case "arch-green":
        return <ArchGreenTemplate {...props} />;
      case "rustic-lace":
        return <RusticLaceTemplate {...props} />;
      case "boho-hexagon":
        return <BohoHexagonTemplate {...props} />;
      case "luxury-rings":
        return <LuxuryRingsTemplate {...props} />;
      case "custom-media":
        return <CustomMediaTemplate {...props} />;
      case "classic-gold":
      default:
        return <ClassicGoldTemplate {...props} />;
    }
  })();

  return <div className="invitation-copy-root">{content}</div>;
}
