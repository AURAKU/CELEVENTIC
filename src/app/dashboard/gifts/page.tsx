import type { Metadata } from "next";
import { GiftWalletClient } from "@/components/gifts/gift-wallet-client";

export const metadata: Metadata = {
  title: "Gift Wallet",
};

export default function GiftsPage() {
  return <GiftWalletClient />;
}
