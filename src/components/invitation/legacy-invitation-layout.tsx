"use client";

/**
 * Protected v1 layout switch — Invitation Experience 3.0.
 *
 * Bit-identical to the historical invitation-renderer layout cases.
 * Do not change visuals here for Studio / Experience 3.0 upgrades;
 * register layoutVersion ≥ 2 instead.
 */

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { ClassicGoldTemplate } from "./templates/classic-gold";
import { ArchGreenTemplate } from "./templates/arch-green";
import { RusticLaceTemplate } from "./templates/rustic-lace";
import { BohoHexagonTemplate } from "./templates/boho-hexagon";
import { LuxuryRingsTemplate } from "./templates/luxury-rings";
import { CustomMediaTemplate } from "./templates/custom-media";
import { PassportLuxeTemplate } from "./templates/passport-luxe";
import { GlassAcrylicTemplate } from "./templates/glass-acrylic";
import { FloralGardenTemplate } from "./templates/floral-garden";
import { TraditionalMarriageCeremonyTemplate } from "./templates/traditional-marriage-ceremony";
import { ForeverAfarisWeddingTemplate } from "./templates/forever-afaris-wedding";
import { LuxuryFashionFlagshipTemplate } from "./templates/luxury-fashion-flagship";
import { AureliaEditorialWeddingTemplate } from "./templates/aurelia-editorial-wedding";
import { CinematicTemplate, isCinematicLayout } from "./templates/cinematic-template";

export function LegacyInvitationLayout(props: InvitationRendererProps) {
  if (isCinematicLayout(props.design.layout)) {
    return <CinematicTemplate {...props} />;
  }

  switch (props.design.layout) {
    case "traditional-marriage-ceremony":
      return <TraditionalMarriageCeremonyTemplate {...props} />;
    case "forever-afaris-wedding":
      return <ForeverAfarisWeddingTemplate {...props} />;
    case "luxury-fashion-flagship":
      return <LuxuryFashionFlagshipTemplate {...props} />;
    case "aurelia-editorial-wedding":
    case "seraphine-champagne-wedding":
      return <AureliaEditorialWeddingTemplate {...props} />;
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
}
