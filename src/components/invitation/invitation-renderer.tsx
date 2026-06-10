"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { ClassicGoldTemplate } from "./templates/classic-gold";
import { ArchGreenTemplate } from "./templates/arch-green";
import { RusticLaceTemplate } from "./templates/rustic-lace";
import { BohoHexagonTemplate } from "./templates/boho-hexagon";
import { LuxuryRingsTemplate } from "./templates/luxury-rings";
import { CustomMediaTemplate } from "./templates/custom-media";

export function InvitationRenderer(props: InvitationRenderProps) {
  switch (props.design.layout) {
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
