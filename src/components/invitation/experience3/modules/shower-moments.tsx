"use client";

import styles from "./shower-moments.module.css";

type Tone = "light" | "dark";

/** Anticipation ribbon — unique to shower family (not chip-row controls). */
export function Experience3AnticipationRibbon({
  tone,
  line,
}: {
  tone: Tone;
  line: string;
}) {
  return (
    <p className={[styles.ribbon, tone === "dark" ? styles.ribbonDark : ""].join(" ")}>{line}</p>
  );
}

/** Soft story panel for emotional shower storytelling. */
export function Experience3ShowerStory({
  tone,
  eyebrow,
  title,
  body,
}: {
  tone: Tone;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section
      className={[styles.story, tone === "dark" ? styles.storyDark : ""].join(" ")}
      aria-label={title}
    >
      <p className={styles.storyEyebrow}>{eyebrow}</p>
      <h2 className={styles.storyTitle}>{title}</h2>
      <p className={styles.storyBody}>{body}</p>
    </section>
  );
}

/** Gift guidance — only rendered when host configures gift details. */
export function Experience3GiftWhisper({
  tone,
  detail,
}: {
  tone: Tone;
  detail: string;
}) {
  return (
    <aside
      className={[styles.gift, tone === "dark" ? styles.giftDark : ""].join(" ")}
      aria-label="Gift note"
    >
      <p className={styles.giftLabel}>A quiet note on gifts</p>
      <p className={styles.giftBody}>{detail}</p>
    </aside>
  );
}
