import styles from "./luxury-fashion-flagship.module.css";
import { FashionSocialFinaleStrip } from "./fashion-social-scene";
import type { ResolvedInvitationSocialLink } from "@/lib/experience/luxury-fashion";

export function FashionFinale({
  message,
  kicker,
  houseName,
  datesLabel,
  address,
  onRsvp,
  onLocation,
  onShare,
  onReplayFilm,
  replayLabel,
  onReplayUnveiling,
  onCollection,
  socialLinks,
  onSocial,
}: {
  message: string;
  kicker: string;
  houseName: string;
  datesLabel: string;
  address: string;
  onRsvp?: () => void;
  onLocation?: () => void;
  onShare?: () => void;
  onReplayFilm?: () => void;
  replayLabel?: string;
  onReplayUnveiling?: () => void;
  onCollection?: () => void;
  socialLinks?: ResolvedInvitationSocialLink[];
  onSocial?: (platform: ResolvedInvitationSocialLink["platform"]) => void;
}) {
  return (
    <section className={styles.finale} data-testid="fashion-finale">
      <p className={styles.kicker}>{houseName}</p>
      <p className={styles.heading}>{kicker}</p>
      <p className={styles.finaleMeta}>
        {datesLabel}
        <span aria-hidden> · </span>
        {address}
      </p>
      <p className={styles.lede}>{message}</p>
      <div className={styles.ctaRow} data-testid="fashion-finale-actions">
        {onRsvp ? (
          <button type="button" className={styles.cta} onClick={onRsvp}>
            RSVP
          </button>
        ) : null}
        {onLocation ? (
          <button type="button" className={styles.cta} onClick={onLocation}>
            Location
          </button>
        ) : null}
        {onShare ? (
          <button type="button" className={styles.cta} onClick={onShare}>
            Share
          </button>
        ) : null}
        {onReplayUnveiling ? (
          <button type="button" className={styles.cta} onClick={onReplayUnveiling} data-testid="fashion-replay-unveiling">
            {replayLabel || "Replay the unveiling"}
          </button>
        ) : null}
        {onReplayFilm ? (
          <button type="button" className={styles.cta} onClick={onReplayFilm}>
            Replay store film
          </button>
        ) : null}
        {onCollection ? (
          <button type="button" className={styles.cta} onClick={onCollection}>
            View collection
          </button>
        ) : null}
      </div>
      {socialLinks?.length ? (
        <FashionSocialFinaleStrip links={socialLinks} houseName={houseName} onOpen={onSocial} />
      ) : null}
    </section>
  );
}
