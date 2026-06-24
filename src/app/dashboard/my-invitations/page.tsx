import { redirect } from "next/navigation";

export default function MyInvitationsPage() {
  redirect("/dashboard/invitations?tab=store");
}
