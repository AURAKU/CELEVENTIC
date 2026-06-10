import { invitationFontVars } from "@/lib/invitation-fonts";
import "../globals.css";

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${invitationFontVars} scroll-smooth`}>{children}</div>;
}
