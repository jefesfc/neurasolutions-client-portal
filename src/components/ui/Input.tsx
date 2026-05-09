import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-surface-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "rounded-lg border bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          "disabled:bg-surface-50 disabled:text-surface-400",
          error ? "border-danger ring-danger/20" : "border-surface-300",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-400">{hint}</p>}
    </div>
  )
);

Input.displayName = "Input";
