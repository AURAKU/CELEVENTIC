"use client";

import { useEffect, useState } from "react";
import { reviewReachInput } from "@/lib/digital-business-card/socials";

export function useVisibleReachReview(brand: string, value: string, hasQr = false) {
  const review = reviewReachInput(brand, value, { hasQr });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (review.status !== "review" || !review.message) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 520);
    return () => window.clearTimeout(timer);
  }, [review.message, review.status, value]);

  return {
    invalid: visible,
    message: visible ? review.message : null,
  };
}

export function DigitalCardReachNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-xl border px-3 py-2 text-[11.5px] leading-relaxed"
      style={{
        background: "rgba(255, 247, 237, 0.96)",
        borderColor: "rgba(180, 83, 9, 0.28)",
        color: "#9a3412",
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Check this detail</p>
      <p className="mt-0.5">{message}</p>
    </div>
  );
}

export function reachReviewInputStyle(invalid: boolean) {
  if (!invalid) return null;
  return {
    borderColor: "#c2410c",
    boxShadow: "0 0 0 3px rgba(194, 65, 12, 0.14)",
  };
}
