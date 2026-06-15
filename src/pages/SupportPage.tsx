import { useState, useCallback, useEffect } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { useT } from "../i18n/useT";
import { TicketCard } from "../components/support/TicketCard";
import { TicketForm } from "../components/support/TicketForm";
import { FAQAccordion } from "../components/support/FAQAccordion";
import { ChatSupport } from "../components/support/ChatSupport";
import { Tabs } from "../components/ui/Tabs";
import { mockFAQs } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";
import type { SupportTicket } from "../types";

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

export default function SupportPage() {
  const t = useT();
  const token = useAuthStore((s) => s.token);
  const [activeTab, setActiveTab] = useState("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);

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
    { id: "tickets", label: "Tickets", count: tickets.length },
    { id: "new", label: "New Ticket" },
    { id: "chat", label: "Live Chat" },
    { id: "faq", label: "FAQ" },
  ];

  return (
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
          {loading && <p className="text-sm text-slate-400">Loading tickets...</p>}
          {!loading && tickets.length === 0 && (
            <p className="text-sm text-slate-400">No tickets yet. Create one to get started.</p>
          )}
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
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
  );
}
