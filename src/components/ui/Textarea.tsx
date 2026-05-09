import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-surface-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          "rounded-lg border bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 resize-y",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          error ? "border-danger" : "border-surface-300",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
);

Textarea.displayName = "Textarea";
