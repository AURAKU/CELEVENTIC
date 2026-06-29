"use client";

import type { InvitationRenderProps } from "@/types/invitation-design";
import { isCinematicLayout } from "@/lib/invitation/cinematic-themes";
import { CinematicLayoutRouter } from "./cinematic-layouts";

export { isCinematicLayout };

export function CinematicTemplate(props: InvitationRenderProps) {
  return <CinematicLayoutRouter {...props} />;
}
