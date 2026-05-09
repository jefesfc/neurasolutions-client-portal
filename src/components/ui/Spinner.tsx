import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={cn("animate-spin text-brand-500", sizeStyles[size], className)} />
    </div>
  );
}
