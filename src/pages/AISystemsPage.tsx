import { useEffect, useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { SystemGrid } from "../components/ai-systems/SystemGrid";
import { SearchInput } from "../components/shared/SearchInput";
import { mockAISystems } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";
import type { AISystem } from "../types";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

const AGENT_TO_SYSTEM: Record<string, string> = {
  "aios-chat":         "sys_webchat",
  "aios-telegram":     "sys_telegram",
  "aios-telegram-tts": "sys_voice",
  "aios-security":     "sys_security",
};

export default function AISystemsPage() {
  const token = useAuthStore((s) => s.token);
  const [search, setSearch] = useState("");
  const [systems, setSystems] = useState<AISystem[]>(mockAISystems);

  useEffect(() => {
    void fetch(`${API_URL}/billing/system-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<Record<string, { totalInteractions: number; interactionsThisMonth: number }>>)
      .then((metrics) => {
        setSystems(
          mockAISystems.map((sys) => {
            const agentKey = Object.entries(AGENT_TO_SYSTEM).find(([, sysId]) => sysId === sys.id)?.[0];
            if (!agentKey || !metrics[agentKey]) return sys;
            const real = metrics[agentKey];
            return {
              ...sys,
              metrics: {
                ...sys.metrics,
                totalInteractions: real.totalInteractions || sys.metrics.totalInteractions,
                interactionsThisMonth: real.interactionsThisMonth || sys.metrics.interactionsThisMonth,
                hoursSaved: Math.round((real.totalInteractions || sys.metrics.totalInteractions) * 0.05),
              },
            };
          })
        );
      })
      .catch(console.error);
  }, [token]);

  const filtered = systems.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <PageHeader
        title="AI Systems"
        description="Monitor and manage your installed AI systems"
      />
      <div className="mb-6">
        <SearchInput
          placeholder="Search systems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          containerClassName="max-w-md"
        />
      </div>
      <SystemGrid systems={filtered} />
    </PageTransition>
  );
}
