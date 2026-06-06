import { cn } from "../../lib/cn";
import { formatRelative, formatDateTime } from "../../lib/formatters";

interface TimestampProps {
  date: string;
  relative?: boolean;
  className?: string;
}

export function Timestamp({ date, relative = true, className }: TimestampProps) {
  return (
    <time
      dateTime={date}
      title={formatDateTime(date)}
      className={cn("text-sm text-slate-400", className)}
    >
      {relative ? formatRelative(date) : formatDateTime(date)}
    </time>
  );
}