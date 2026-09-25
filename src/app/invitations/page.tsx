import { HeaderShell } from "@/components/layout/header-shell";
import { Footer } from "@/components/layout/footer";
import { InvitationsLandingContent } from "@/components/invitation-mvp/invitations-landing-content";
import { catalogService } from "@/services/commerce/catalog.service";
import { getCatalogInvitationPackages } from "@/lib/invitation-mvp/packages";
import { getSession, isAdminRole } from "@/lib/auth";
import {
  loadCatalogVisibilityOverlay,
  getVisibleBrowseCatalogTemplates,
} from "@/lib/invitation-mvp/catalog-visibility";

export default async function InvitationsLandingPage() {
  const session = process.env.DATABASE_URL ? await getSession().catch(() => null) : null;
  const overlay = await loadCatalogVisibilityOverlay();
  const packages = await catalogService.getActivePackages().catch(() => getCatalogInvitationPackages());
  const templates = getVisibleBrowseCatalogTemplates(overlay, {
    includeHidden: isAdminRole(session?.user?.role),
  });

  return (
    <>
      <HeaderShell />
      <main>
        <InvitationsLandingContent packages={packages} templates={templates} />
      </main>
      <Footer />
    </>
  );
}
