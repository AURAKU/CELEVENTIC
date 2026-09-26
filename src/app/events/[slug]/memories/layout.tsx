import { invitationFontVars } from "@/lib/invitation-fonts";

export default function EventMemoriesLayout({ children }: { children: React.ReactNode }) {
  return <div className={invitationFontVars}>{children}</div>;
}
