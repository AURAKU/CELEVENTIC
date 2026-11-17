"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { IX3_BRAND_LAUNCH } from "@/lib/invitation/studio3/reference-definitions";
import styles from "./experience3-shell.module.css";

export function Ix3BrandLaunchTemplate(props: InvitationRendererProps) {
  const brand = props.event.hostName || props.event.title;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_BRAND_LAUNCH}
      tone="dark"
      headline={props.event.title}
      kicker="Private launch experience"
      monogram={brand.slice(0, 1).toUpperCase()}
    >
      <div className={styles.divider} aria-hidden />
      <section aria-label="Launch briefing">
        <p className={styles.note} style={{ letterSpacing: "0.03em", fontSize: "0.95rem" }}>
          A refined reveal evening for {brand}. Arrival details and guest admission appear on your
          personal pass when provided.
        </p>
      </section>
    </Experience3Shell>
  );
}
