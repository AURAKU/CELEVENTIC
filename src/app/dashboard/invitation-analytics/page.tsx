import { redirect } from "next/navigation";

export default function InvitationAnalyticsPage() {
  redirect("/dashboard/invitations?tab=analytics");
}
