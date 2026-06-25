import { ReactNode } from "react";
import { Sparkles, Calendar, Palette, QrCode } from "lucide-react";
import { Logo } from "@/components/layout/logo";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const highlights = [
  { icon: Calendar, label: "10K+ Events Managed" },
  { icon: Palette, label: "Premium Design Studio" },
  { icon: QrCode, label: "1M+ QR Scans" },
];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] auth-panel relative flex-col justify-between p-10 xl:p-14 text-white overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-500/15 rounded-full blur-3xl" />

        <div className="relative">
          <Logo variant="light" size="lg" />
        </div>

        <div className="relative space-y-8">
          <div className="inline-flex items-center gap-2 badge-pill bg-white/10 text-gold-400 border border-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            Event Operating System
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight">
            Run world-class events with{" "}
            <span className="text-gradient-gold">intelligent</span> tools
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Invitations, ticketing, QR admission, Event Intelligence, and memory vault — all in one premium platform.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
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

        <p className="relative text-xs text-slate-600">
          Trusted by organizers worldwide
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-mesh p-4 sm:p-6 lg:p-8 min-h-0">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-6 sm:mb-8">
            <Logo size="lg" />
          </div>
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900">{title}</h2>
            <p className="text-slate-500 mt-2">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur-sm shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-6 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
