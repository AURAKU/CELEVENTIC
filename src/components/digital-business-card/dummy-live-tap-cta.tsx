import Link from "next/link";
import { Button } from "@/components/ui/button";
import { demoCardHubPath } from "@/lib/digital-business-card/demo-card";
import { viewerMayOpenDummyLive } from "@/lib/digital-business-card/demo-live-access";

/** Platform admins only. Guests, organizers, and cardholders never receive this markup. */
export async function DummyLiveTapCta() {
  if (!(await viewerMayOpenDummyLive())) return null;
  return (
    <Button
      asChild
      variant="outline"
      className="min-h-11 border-amber-200/40 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20 hover:text-white"
    >
      <Link href={demoCardHubPath()}>See a live dummy tap</Link>
    </Button>
  );
}
