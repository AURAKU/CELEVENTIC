/**
 * Original Femmora monogram — botanical stem, not a copy of any house mark.
 */
export function FemmoraMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width="56"
      height="56"
      fill="none"
      aria-hidden
    >
      <path
        d="M32 8c-2.8 9.4-7.4 15.2-14 18.8 6.2.6 11.4-.4 16.4-3.6C32.8 32.8 28 41.2 22 50c8.8-4.2 16.4-4.6 24.2.4-3.4-8.2-4.2-16.6-2.2-26.2C50.8 28.8 54 34 56 42c-1.8-14.4-6.6-24.6-16.6-32.2C42.2 6.8 37.4 6.2 32 8Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M31 18.5c.4 8.2-.6 16.8-3.8 28"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
