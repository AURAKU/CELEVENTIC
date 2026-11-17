"use client";

import type { InvitationRendererProps } from "@/components/invitation/invitation-renderer-types";
import { Experience3Shell } from "@/components/invitation/experience3/experience3-shell";
import { IX3_MEMORIAL } from "@/lib/invitation/studio3/reference-definitions";
import styles from "./experience3-shell.module.css";

export function Ix3MemorialTemplate(props: InvitationRendererProps) {
  const remembered =
    props.event.deceasedName?.trim() ||
    props.event.hostName?.trim() ||
    props.event.title;

  return (
    <Experience3Shell
      {...props}
      definition={IX3_MEMORIAL}
      tone="solemn"
      headline={remembered}
      kicker="A service of remembrance"
    >
      <div className={styles.divider} aria-hidden />
      <section aria-label="Memorial tribute">
        <p className={styles.note}>
          With gratitude for a life remembered. Please join us for a calm gathering of family and
          friends. Motion and sound remain gentle by design.
        </p>
      </section>
    </Experience3Shell>
  );
}
