import styles from "./luxury-fashion-flagship.module.css";

export type FashionFactMarkKind = "location" | "time" | "date";

/** Original couture marks for campaign facts — not a lucide/SaaS icon pack. */
export function FashionFactMark({ kind }: { kind: FashionFactMarkKind }) {
  if (kind === "time") {
    return (
      <svg className={styles.factMark} viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="12.2" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <circle cx="16" cy="16" r="9.4" fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.55" />
        <path
          d="M16 6.8a9.2 9.2 0 0 1 8.4 12.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="1.15" fill="currentColor" />
        <path d="M16 16L16 10.6" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M16 16L20.4 18.2" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "date") {
    return (
      <svg className={styles.factMark} viewBox="0 0 32 32" aria-hidden>
        <rect x="8.2" y="9.4" width="16.4" height="14.2" rx="1.1" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <rect x="6.6" y="7.6" width="16.4" height="14.2" rx="1.1" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <path d="M6.6 11.4h16.4" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <path d="M23 7.6v14.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M10.4 15.2h3.1M15.2 15.2h3.1M10.4 18.4h3.1" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={styles.factMark} viewBox="0 0 32 32" aria-hidden>
      <path
        d="M10.2 7.4h9.2l3.6 3.4v14.4c0 .7-.7 1.1-1.3.8L16 22.4l-5.7 3.6c-.6.4-1.3 0-1.3-.8V8.6c0-.7.5-1.2 1.2-1.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="14.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="16" cy="14.4" r="1.05" fill="currentColor" />
    </svg>
  );
}
