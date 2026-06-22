import type { Metadata } from "next";
import { LegalHubLayout } from "@/components/legal/legal-hub-layout";

export const metadata: Metadata = {
  title: "Legal Center",
  description:
    "Celeventic legal policies — Terms, Privacy, Refund, Cookie, Revision, IP, and Data Rights.",
};

export default function LegalHubPage() {
  return <LegalHubLayout />;
}
