import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/header";

export async function HeaderShell() {
  const session = await getSession();
  return <Header initialSession={session} />;
}
