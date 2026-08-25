"use client";

import Link from "next/link";
import { ImageIcon, Upload } from "lucide-react";
import styles from "./funeral-experience.module.css";

export function MemoryVaultCta({
  eventSlug,
  deceasedName,
}: {
  eventSlug: string;
  deceasedName: string;
}) {
  return (
    <section className="px-4 py-6 max-w-lg mx-auto w-full" id="memories">
      <div className={styles.vaultCard}>
        <p className={`${styles.gold} text-[0.7rem] uppercase tracking-[0.24em] font-semibold`}>
          Memory Vault
        </p>
        <h2 className={`${styles.heading} text-xl mt-2`}>Remember with us</h2>
        <p className={`${styles.muted} text-sm mt-2 leading-relaxed`}>
          Share a photo, short video, or message honouring {deceasedName}. Contributions appear after
          family review when moderation is enabled.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <Link className={styles.btnPrimary} href={`/events/${eventSlug}/memories`}>
            <ImageIcon className="h-4 w-4" aria-hidden />
            View Memories
          </Link>
          <Link className={styles.btnGhost} href={`/events/${eventSlug}/memories`}>
            <Upload className="h-4 w-4" aria-hidden />
            Share a Memory
          </Link>
        </div>
      </div>
    </section>
  );
}
