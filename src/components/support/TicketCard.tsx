import { Link } from "react-router-dom";
import { MessageSquare, Clock, ChevronRight } from "lucide-react";
import type { SupportTicket } from "../../types";
import { Badge } from "../ui/Badge";
import { formatRelative } from "../../lib/formatters";

const statusBadge: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  open: "info",
  in_progress: "warning",
  waiting: "default",
  resolved: "success",
  closed: "neutral" as "default",
};

const priorityBadge: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  low: "neutral" as "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

interface TicketCardProps {
  ticket: SupportTicket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl shadow-sm hover:shadow-md hover:border-surface-300 transition-all duration-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-surface-400 font-mono">{ticket.number}</span>
        <div className="flex items-center gap-2">
          <Badge variant={priorityBadge[ticket.priority]}>{ticket.priority}</Badge>
          <Badge variant={statusBadge[ticket.status]} dot>{ticket.status}</Badge>
        </div>
      </div>

      <h3 className="text-base font-semibold text-surface-900 mb-1">{ticket.subject}</h3>
      <p className="text-sm text-surface-500 line-clamp-2 mb-3">{ticket.description}</p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-surface-400">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {ticket.messages.length}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatRelative(ticket.updatedAt)}
          </span>
        </div>
        <Link to={`/support/${ticket.id}`} className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
          View <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}