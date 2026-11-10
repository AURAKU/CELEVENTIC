import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeJoinCode } from "@/lib/celeyou-proximity/join-code";
import { tapStudioPath } from "@/lib/celeyou-proximity/product";

export const metadata = {
  title: "Join Tap-to-Connect · CeleYou",
  description: "Open Tap Mode to approve a nearby CeleYou share. Phone to phone NFC is not used.",
};

export default async function TapJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = normalizeJoinCode(decodeURIComponent(raw || ""));
  const session = await getServerSession(authOptions);
  const next = tapStudioPath(undefined, code || undefined);
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(next)}`);
  }
  redirect(next);
}
