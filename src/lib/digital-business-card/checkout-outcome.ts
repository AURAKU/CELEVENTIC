export type CeleCardCheckoutKind = "success" | "error" | "pending";

export function celeCardCheckoutUi(status: string | undefined, live?: boolean | null): {
  kind: CeleCardCheckoutKind;
  text: string;
} {
  if (status === "SUCCESSFUL") {
    if (live === false) {
      return {
        kind: "error",
        text: "Payment received. This CeleYou is not live yet. Open billing or contact support.",
      };
    }
    return {
      kind: "success",
      text: "Payment received. Your CeleYou is live while this plan lasts.",
    };
  }
  if (status === "FAILED") {
    return {
      kind: "error",
      text: "Payment did not complete. Your CeleYou was not activated. You can try checkout again.",
    };
  }
  return {
    kind: "pending",
    text: "Payment is still processing. Refresh billing in a moment. The card stays offline until Paystack confirms success.",
  };
}
