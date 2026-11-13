import { CeleYouTapConnect } from "@/components/digital-business-card/celeyou-tap-connect";
import { TAP_MODE_HEADING, TAP_TO_CONNECT_NAME } from "@/lib/celeyou-proximity/product";

export const metadata = {
  title: `${TAP_TO_CONNECT_NAME} · Celeventic`,
  description: TAP_MODE_HEADING,
};

export default async function CeleYouTapPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; code?: string }>;
}) {
  const query = await searchParams;
  return (
    <CeleYouTapConnect initialCardId={query.card} initialCode={query.code} />
  );
}
