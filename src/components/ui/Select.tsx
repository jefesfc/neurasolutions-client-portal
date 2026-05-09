import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-surface-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          "rounded-lg border bg-white px-3 py-2 text-sm text-surface-900",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          error ? "border-danger" : "border-surface-300",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
);

Select.displayName = "Select";
