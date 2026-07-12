import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpLinkProps {
  href?: string;
  label?: string;
  className?: string;
}

export function HelpLink({
  href = "/dashboard/help",
  label = "Help",
  className,
}: HelpLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors",
        className
      )}
    >
      <HelpCircle className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
