import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:   "bg-brand-600 text-white hover:bg-brand-500 shadow-sm",
  secondary: "bg-surface-700 text-surface-200 hover:bg-surface-600 border border-surface-600",
  outline:   "border border-surface-600 bg-transparent text-surface-300 hover:bg-surface-700 hover:text-surface-100",
  ghost:     "text-surface-400 hover:bg-surface-700 hover:text-surface-200",
  danger:    "bg-danger text-white hover:bg-red-500 shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-6 py-2.5 text-base rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);

Button.displayName = "Button";
