import { invitationFontVars } from "@/lib/invitation-fonts";

export default function MemoryRouteLayout({ children }: { children: React.ReactNode }) {
  return <div className={invitationFontVars}>{children}</div>;
}
