import { ReactNode } from "react";
import { Sparkles, Calendar, Palette, QrCode } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  /** Wider card. Used for the account-type picker. */
  wide?: boolean;
  panelEyebrow?: string;
  panelTitle?: string;
  panelBody?: string;
  /** Numbered signup guide on the left panel. Hide on login. */
  showGuideSteps?: boolean;
}

const highlights = [
  { icon: Calendar, label: "Invitations, RSVP & QR" },
  { icon: Palette, label: "Templates that play live" },
  { icon: QrCode, label: "Admission on the day" },
];

export function AuthLayout({
  children,
  title,
  subtitle,
  wide,
  panelEyebrow = "Event Operating System",
  panelTitle = "Start in two minutes",
  panelBody = "Tell us who you are, create your account, then we'll show you exactly what to do next. No walkthrough call needed.",
  showGuideSteps = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-app-viewport flex">
      <div className="hidden lg:flex lg:w-[42%] xl:w-[46%] auth-panel relative flex-col justify-between p-10 xl:p-14 text-white overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-500/15 rounded-full blur-3xl" />

        <div className="relative">
          <Logo variant="light" size="lg" />
        </div>

        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 badge-pill bg-white/10 text-gold-400 border border-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            {panelEyebrow}
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight">
            {panelTitle.includes(" ") ? (
              <>
                {panelTitle.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="text-gradient-gold">{panelTitle.split(" ").slice(-1)}</span>
              </>
            ) : (
              panelTitle
            )}
          </h1>
          <p className="text-slate-200 text-lg max-w-md leading-relaxed">{panelBody}</p>
          {showGuideSteps ? (
            <ol className="space-y-3 text-sm text-slate-300 max-w-md">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  1
                </span>
                Choose how you&apos;ll use Celeventic
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  2
                </span>
                Create your account with email, phone, or Google
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
                  3
                </span>
                Follow one clear next step. Event, invitation, or guest RSVP
              </li>
            </ol>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/10 backdrop-blur-sm"
              >
                <item.icon className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-medium text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-slate-300">Trusted by hosts, planners, and guests</p>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center bg-mesh p-4 sm:p-6 lg:p-8 min-h-0 overflow-y-auto">
        <div className={cn("w-full py-6 sm:py-8", wide ? "max-w-2xl" : "max-w-md")}>
          <div className="lg:hidden flex justify-center mb-6 sm:mb-8">
            <Logo size="lg" />
          </div>
          <div className="text-center mb-6 sm:mb-8 px-1">
            <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-slate-900 text-balance">{title}</h2>
            <p className="text-slate-600 mt-2 leading-relaxed text-pretty">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-5 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
