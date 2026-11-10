import { getServerSession } from "next-auth";
import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { DigitalCardLiveDemoStudio } from "@/components/digital-business-card/digital-card-live-demo-studio";
import { authOptions } from "@/lib/auth";
import { getServerAppUrl } from "@/lib/app-url";
import { redirect } from "next/navigation";
import { CELECARD_DUMMY_LIVE_FALLBACK, viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

export const metadata = {
  title: "Live CeleYou studio dummy | Celeventic",
  description: "See how a paid, activated CeleYou looks in the subscriber studio.",
  robots: { index: false, follow: false },
};

export default async function CeleCardLiveDemoStudioPage() {
  if (!(await viewerMayOpenDummyLive())) redirect(CELECARD_DUMMY_LIVE_FALLBACK);
  const origin = await getServerAppUrl();
  const session = await getServerSession(authOptions);

  return (
    <>
      <HeaderShell />
      <main className="min-h-app-viewport">
        <DigitalCardLiveDemoStudio origin={origin} cardholder={Boolean(session?.user)} />
      </main>
      <Footer />
    </>
  );
}
