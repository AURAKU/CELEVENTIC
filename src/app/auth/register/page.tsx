import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) q.set(key, value);
  }
  const qs = q.toString();
  redirect(qs ? `/auth/onboarding?${qs}` : "/auth/onboarding");
}
