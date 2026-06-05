import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 lg:p-8",
};

export function Card({ className, hover = false, padding = "md", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-800 border border-surface-700 rounded-xl shadow-sm",
        hover && [
          "transition-all duration-200 cursor-pointer",
          "hover:border-cyan-500/60",
          "hover:shadow-[0_0_0_1px_rgba(6,182,212,0.08),0_4px_24px_rgba(6,182,212,0.10)]",
        ],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 mb-4", className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-surface-100", className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-surface-400", className)} {...props}>{children}</p>;
}
