import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { InvitationsLandingContent } from "@/components/invitation-mvp/invitations-landing-content";
import { catalogService } from "@/services/commerce/catalog.service";
import { getCatalogInvitationPackages } from "@/lib/invitation-mvp/packages";

export default async function InvitationsLandingPage() {
  const packages = await catalogService.getActivePackages().catch(() => getCatalogInvitationPackages());

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
