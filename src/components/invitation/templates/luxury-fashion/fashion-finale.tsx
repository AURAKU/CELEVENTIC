import styles from "./luxury-fashion-flagship.module.css";

export function FashionFinale({ message, houseName }: { message: string; houseName: string }) {
  return (
    <section className={styles.finale} data-testid="fashion-finale">
      <p className={styles.kicker}>{houseName}</p>
      <p className={styles.heading} style={{ letterSpacing: "0.18em" }}>
        {message}
      </p>
    </section>
  );
}
