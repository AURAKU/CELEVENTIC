import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Single gold primary action per page — use secondary/outline for other actions. */
export function PrimaryAction({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      variant="secondary"
      className={cn("shadow-md font-semibold", className)}
      {...props}
    >
      {children}
    </Button>
  );
}
