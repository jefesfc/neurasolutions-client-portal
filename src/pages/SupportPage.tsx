import { useState, useCallback, useEffect } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { useT, useTranslations } from "../i18n/useT";
import { TicketCard } from "../components/support/TicketCard";
import { TicketForm } from "../components/support/TicketForm";
import { FAQAccordion } from "../components/support/FAQAccordion";
import { ChatSupport } from "../components/support/ChatSupport";
import { Tabs } from "../components/ui/Tabs";
import { Badge } from "../components/ui/Badge";
import { mockFAQs } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";
import type { SupportTicket } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Calendar, Tag, AlertCircle, Clock } from "lucide-react";
import { formatRelative } from "../lib/formatters";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

interface DbTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapTicket(row: DbTicket): SupportTicket {
  return {
    id: row.id,
    number: "TKT-" + row.id.substring(0, 6).toUpperCase(),
    subject: row.subject,
    description: row.description,
    category: row.category as SupportTicket["category"],
    priority: row.priority as SupportTicket["priority"],
    status: row.status as SupportTicket["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: [],
  };
}

const STATUS_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  open: "info", in_progress: "warning", waiting: "default", resolved: "success", closed: "default",
};
const PRIORITY_BADGE: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  low: "default", medium: "info", high: "warning", critical: "danger",
};
const PRIORITY_COLOR: Record<string, string> = {
  low: "#64748b", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};

export default function SupportPage() {
  const t = useT();
  const T = useTranslations();
  const token = useAuthStore((s) => s.token);
  const [activeTab, setActiveTab] = useState("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as DbTicket[];
        setTickets(data.map(mapTicket));
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  function handleTicketCreated() {
    void fetchTickets();
    setActiveTab("tickets");
  }

  const tabs = [
    { id: "tickets", label: T.support.tabTickets, count: tickets.length },
    { id: "new",     label: T.support.tabNew      },
    { id: "chat",    label: T.support.tabChat     },
    { id: "faq",     label: T.support.tabFaq      },
  ];

  return (
    <>
    <PageTransition>
      <PageHeader
        title={t('pages.support.title')}
        description={t('pages.support.desc')}
      />
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "tickets" && (
        <div className="space-y-3">
          {loading && <p className="text-sm text-slate-400">{T.support.loading}</p>}
          {!loading && tickets.length === 0 && (
            <p className="text-sm text-slate-400">{T.support.empty}</p>
          )}
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onClick={() => setSelectedTicket(ticket)} />
          ))}
        </div>
      )}

      {activeTab === "new" && (
        <div className="max-w-lg">
          <TicketForm onCreated={handleTicketCreated} />
        </div>
      )}

      {activeTab === "chat" && <ChatSupport />}
      {activeTab === "faq" && <FAQAccordion faqs={mockFAQs} />}
    </PageTransition>

    {/* ── Ticket Detail Panel ──────────────────────────────────── */}

    <AnimatePresence>
      {selectedTicket && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={() => setSelectedTicket(null)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex-shrink-0 px-6 py-5 border-b border-slate-100"
              style={{ borderTop: `4px solid ${PRIORITY_COLOR[selectedTicket.priority] ?? "#6366f1"}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{selectedTicket.number}</span>
                    <Badge variant={PRIORITY_BADGE[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                    <Badge variant={STATUS_BADGE[selectedTicket.status]} dot>{selectedTicket.status}</Badge>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{selectedTicket.subject}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Description */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Meta grid */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Tag className="h-3.5 w-3.5" />, label: "Category", value: selectedTicket.category },
                    { icon: <AlertCircle className="h-3.5 w-3.5" />, label: "Priority", value: selectedTicket.priority },
                    { icon: <Hash className="h-3.5 w-3.5" />, label: "Status", value: selectedTicket.status.replace("_", " ") },
                    { icon: <Calendar className="h-3.5 w-3.5" />, label: "Opened", value: new Date(selectedTicket.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                    { icon: <Clock className="h-3.5 w-3.5" />, label: "Last update", value: formatRelative(selectedTicket.updatedAt) },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        {icon}
                        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 capitalize">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline placeholder */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Activity</p>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-brand-600">T</span>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Ticket opened · {new Date(selectedTicket.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-sm text-slate-600">{selectedTicket.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400 text-center">
                For urgent issues contact support directly via the Chat tab
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
