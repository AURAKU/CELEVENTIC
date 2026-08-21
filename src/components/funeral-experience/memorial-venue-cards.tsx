"use client";

import { MapPin, Navigation, Phone, Copy } from "lucide-react";
import type { MemorialVenueView } from "@/lib/funeral-experience/experience-config";
import styles from "./funeral-experience.module.css";

export function MemorialVenueCards({
  venues,
  heading = "Venues",
}: {
  venues: MemorialVenueView[];
  heading?: string;
}) {
  if (!venues.length) return null;

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="px-4 py-6 max-w-lg mx-auto w-full" id="venues">
      <h2 className={`${styles.heading} text-lg mb-4`}>{heading}</h2>
      <div className="space-y-3">
        {venues.map((v, i) => {
          const maps =
            v.mapsLink ||
            (v.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  [v.name, v.address, v.town].filter(Boolean).join(", ")
                )}`
              : null);
          return (
            <article key={v.id || `${v.name}-${i}`} className={styles.programmeItem}>
              {v.role ? <p className={styles.programmeDay}>{v.role}</p> : null}
              <p className={styles.programmeTitle}>{v.name}</p>
              {[v.address, v.town, v.landmark].filter(Boolean).length ? (
                <p className={`${styles.muted} text-sm mt-1 inline-flex items-start gap-1.5`}>
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "var(--funeral-gold)" }} />
                  {[v.address, v.town, v.landmark].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {v.notes ? <p className={`${styles.muted} text-sm mt-1`}>{v.notes}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {maps ? (
                  <a className={styles.btnGhost} href={maps} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-3.5 w-3.5" aria-hidden />
                    Get Directions
                  </a>
                ) : null}
                {v.phone ? (
                  <a className={styles.btnGhost} href={`tel:${v.phone}`}>
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    Call
                  </a>
                ) : null}
                {(v.address || maps) && (
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => copyText(v.address || maps || v.name)}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy Location
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
