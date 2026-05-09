import { useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { TicketCard } from "../components/support/TicketCard";
import { TicketForm } from "../components/support/TicketForm";
import { FAQAccordion } from "../components/support/FAQAccordion";
import { ChatSupport } from "../components/support/ChatSupport";
import { Tabs } from "../components/ui/Tabs";
import { mockTickets, mockFAQs } from "../lib/mock-data";

const tabs = [
  { id: "tickets", label: "Tickets", count: mockTickets.length },
  { id: "new", label: "New Ticket" },
  { id: "chat", label: "Live Chat" },
  { id: "faq", label: "FAQ" },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState("tickets");

  return (
    <PageTransition>
      <PageHeader
        title="Support Center"
        description="Get help from our team or browse common questions"
      />
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "tickets" && (
        <div className="space-y-3">
          {mockTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}

      {activeTab === "new" && (
        <div className="max-w-lg">
          <TicketForm />
        </div>
      )}

      {activeTab === "chat" && <ChatSupport />}

      {activeTab === "faq" && <FAQAccordion faqs={mockFAQs} />}
    </PageTransition>
  );
}