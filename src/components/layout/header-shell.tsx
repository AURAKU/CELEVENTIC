import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/header";

export async function HeaderShell() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  return <Header initialSession={session} />;
}
