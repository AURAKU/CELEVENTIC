import { CELEVENTIC_LOGO_MARK } from "@/lib/experience/celeventic-palette";
import { APP_NAME } from "@/lib/constants";
import styles from "./loading.module.css";

/**
 * Guest-facing preload beat for `/invite/[link]`.
 *
 * Next.js renders this automatically while the async `page.tsx` (invitation
 * lookup, QR/seating/memory-vault queries, etc.) is still resolving on the
 * server — it is streamed as part of the initial HTML response, so it paints
 * before any client JS loads or hydrates. That makes it the true first frame
 * a guest sees after tapping their invite link: a branded hold instead of a
 * blank tab, however long the data fetch takes.
 *
 * A plain <img> (not next/image) is used deliberately: it skips the image
 * optimizer round trip so the mark can paint the instant the HTML arrives.
 */
export default function InviteLoading() {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <p className={styles.srOnly}>Preparing your invitation…</p>
      <div className={styles.glow} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CELEVENTIC_LOGO_MARK}
        alt=""
        aria-hidden
        width={64}
        height={64}
        className={styles.mark}
        fetchPriority="high"
        decoding="async"
      />
      <div className={styles.bar} aria-hidden>
        <div className={styles.barFill} />
      </div>
      <p className={styles.label} aria-hidden>
        {APP_NAME}
      </p>
    </div>
  );
}
