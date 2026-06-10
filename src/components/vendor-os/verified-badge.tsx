import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <Badge variant="success" className={size === "md" ? "text-sm px-3 py-1" : "text-xs gap-1"}>
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
