import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CeleCardClaimClient } from "@/components/digital-business-card/celecard-claim-client";

export default async function CeleCardClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <CeleCardClaimClient token={token} signedIn={Boolean(session?.user?.id)} />
    </main>
  );
}
