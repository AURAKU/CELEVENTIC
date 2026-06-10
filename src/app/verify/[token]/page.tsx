import { redirect } from "next/navigation";

/** Legacy verify URLs redirect to the guest admission portal */
export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/admission/${token}`);
}
