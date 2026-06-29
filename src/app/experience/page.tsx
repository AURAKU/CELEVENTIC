import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { ExperienceShowcasePage } from "@/components/experience/experience-showcase-page";

export const metadata = {
  title: "Experience Engine | Celeventic",
  description: "Invitations reimagined — every template is its own cinematic universe with unique intros, reveals, audio, and pacing.",
};

export default function ExperiencePage() {
  return (
    <>
      <HeaderShell />
      <main>
        <ExperienceShowcasePage />
      </main>
      <Footer />
    </>
  );
}
