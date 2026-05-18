import { useQuery } from "../../hooks/useQuery";
import { StatCard } from "../shared/StatCard";
import { Skeleton } from "../ui/Skeleton";
import type { Lead, Contact, TokenUsage } from "../../types/aios";

function pctChange(current: number, previous: number): { change: number; changeType: "increase" | "decrease" } {
  if (previous === 0) return { change: 0, changeType: "increase" };
  const diff = ((current - previous) / previous) * 100;
  return { change: Math.abs(diff), changeType: diff >= 0 ? "increase" : "decrease" };
}

export function KPICardGrid() {
  const { data: leads, loading: l1 } = useQuery<Lead>("leads");
  const { data: contacts, loading: l2 } = useQuery<Contact>("contacts");
  const { data: tokenUsage, loading: l3 } = useQuery<TokenUsage>("token_usage");

  if (l1 || l2 || l3) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const now = Date.now();
  const day7 = 7 * 24 * 60 * 60 * 1000;

  const leadsThisWeek = leads.filter(l => now - new Date(l.created_at).getTime() < day7).length;
  const leadsPrevWeek = leads.filter(l => {
    const age = now - new Date(l.created_at).getTime();
    return age >= day7 && age < day7 * 2;
  }).length;

  const wonLeads       = leads.filter(l => l.status === 'won').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const totalCost      = tokenUsage.reduce((sum, t) => sum + Number(t.cost), 0);

  const conversionRate = leads.length > 0 ? (wonLeads / leads.length) * 100 : 0;

  const leadsChange    = pctChange(leadsThisWeek, leadsPrevWeek);
  const contactsChange = pctChange(activeContacts, Math.max(activeContacts - 1, 0));

  const kpis = [
    {
      id: "total-leads",
      label: "Total Leads",
      value: leads.length,
      icon: "Users",
      format: "number" as const,
      ...pctChange(leadsThisWeek, leadsPrevWeek),
    },
    {
      id: "qualified",
      label: "Qualified Leads",
      value: qualifiedLeads,
      icon: "Star",
      format: "number" as const,
      ...leadsChange,
    },
    {
      id: "won",
      label: "Deals Won",
      value: wonLeads,
      icon: "Trophy",
      format: "number" as const,
      change: 0,
      changeType: "increase" as const,
    },
    {
      id: "contacts",
      label: "Active Contacts",
      value: activeContacts,
      icon: "BookUser",
      format: "number" as const,
      ...contactsChange,
    },
    {
      id: "conversion",
      label: "Conversion Rate",
      value: conversionRate,
      icon: "TrendingUp",
      format: "percentage" as const,
      change: 0,
      changeType: "increase" as const,
    },
    {
      id: "ai-cost",
      label: "AI Cost (total)",
      value: totalCost,
      icon: "Cpu",
      format: "currency" as const,
      change: 0,
      changeType: "increase" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {kpis.map((kpi) => (
        <StatCard key={kpi.id} {...kpi} />
      ))}
    </div>
  );
}