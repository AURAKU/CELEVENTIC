import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { InvitationsLandingContent } from "@/components/invitation-mvp/invitations-landing-content";
import { catalogService } from "@/services/commerce/catalog.service";

export default async function InvitationsLandingPage() {
  const packages = await catalogService.getActivePackages();

  return (
    <>
      <HeaderShell />
      <main>
        <InvitationsLandingContent packages={packages} />
      </main>
      <Footer />
    </>
  );
}
