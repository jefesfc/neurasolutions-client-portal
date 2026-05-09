import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-surface-100 p-4">
          <Icon className="h-8 w-8 text-surface-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-surface-700 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 max-w-md mb-4">{description}</p>
      {action}
    </div>
  );
}
