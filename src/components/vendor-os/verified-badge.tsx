import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  size = "sm",
  tone = "light",
}: {
  size?: "sm" | "md";
  tone?: "light" | "dark";
}) {
  return (
    <Badge
      variant="success"
      className={cn(
        "gap-1",
        size === "md" ? "px-3 py-1 text-sm" : "text-xs",
        tone === "dark" && "border-emerald-300/35 bg-emerald-400/18 text-emerald-100"
      )}
    >
      <BadgeCheck className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      Verified
    </Badge>
  );
}

export function FeaturedBadge() {
  return (
    <Badge className="bg-[#D4A63A] text-[#0F172A] text-xs">Featured</Badge>
  );
}
