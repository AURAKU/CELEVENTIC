import type { Metadata } from "next";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { CeleventicGuideHome } from "@/components/celeventic-guide/celeventic-guide-home";

export const metadata: Metadata = {
  title: "Celeventic Guide · Learn Celeventic",
  description:
    "Interactive tutorials, Start Here journeys, and FAQ for guests, organizers, vendors, and scanners — See How Celeventic Works.",
  openGraph: {
    title: "Celeventic Guide",
    description: "Learn Celeventic with motion walkthroughs, quick actions, and step-by-step guides.",
    type: "website",
  },
  alternates: {
    canonical: "/guide",
  },
};

export const dynamic = "force-dynamic";

export default async function GuideHomePage() {
  return (
    <>
      <HeaderShell />
      <main>
        <CeleventicGuideHome />
      </main>
      <Footer />
    </>
  );
}
