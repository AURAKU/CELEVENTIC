import styles from "./luxury-fashion-flagship.module.css";

export function FashionFinale({
  message,
  kicker,
  houseName,
  datesLabel,
  address,
}: {
  message: string;
  kicker: string;
  houseName: string;
  datesLabel: string;
  address: string;
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
    </section>
  );
}
