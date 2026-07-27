import type { Metadata } from "next";
import "./gift.css";

/**
 * Gift links are private by nature — they are handed to invited guests on a
 * card or in a message, never published. Keep them out of search indexes.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GiftLayout({ children }: { children: React.ReactNode }) {
  return children;
}
