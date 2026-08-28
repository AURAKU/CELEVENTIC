import styles from "./luxury-fashion-flagship.module.css";

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
  onCollection,
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
  onCollection?: () => void;
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
    </section>
  );
}
