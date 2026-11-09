import { redirect } from "next/navigation";

/**
 * Legacy dashboard Help page. Unified into the public FAQ & Guides hub
 * (same Celeventic Guide experience as /guide and /legal/faq).
 */
export default function HelpPage() {
  redirect("/legal/faq");
}
