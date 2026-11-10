import { CeleCardCardDetail } from "@/components/digital-business-card/celecard-card-detail";

export default async function AdminCeleCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CeleCardCardDetail cardId={id} />;
}
