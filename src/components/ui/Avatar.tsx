import { cn } from "../../lib/cn";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ src, alt = "", fallback, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full object-cover bg-surface-200", sizeStyles[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-medium",
        sizeStyles[size],
        className
      )}
    >
      {fallback ? fallback.slice(0, 2).toUpperCase() : <User className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />}
    </div>
  );
}
