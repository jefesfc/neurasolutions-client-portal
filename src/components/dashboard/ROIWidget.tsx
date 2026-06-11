import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth-store";
import { Zap, Clock, PoundSterling, TrendingUp } from "lucide-react";

const API_URL =
  (window as Window & { __env__?: { API_URL?: string } }).__env__?.API_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:3001";

interface ROIData {
  interactions_this_month: number;
  hours_saved: number;
  ai_cost_gbp: number;
  leads_this_month: number;
}

const TILES = [
  {
    key: "interactions_this_month" as const,
    label: "AI Interactions",
    sub: "this month",
    icon: Zap,
    color: "#6366f1",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "hours_saved" as const,
    label: "Hours Saved",
    sub: "by automation",
    icon: Clock,
    color: "#10b981",
    format: (v: number) => `${v}h`,
  },
  {
    key: "ai_cost_gbp" as const,
    label: "AI Operating Cost",
    sub: "this month",
    icon: PoundSterling,
    color: "#f59e0b",
    format: (v: number) => `£${v.toFixed(2)}`,
  },
  {
    key: "leads_this_month" as const,
    label: "New Leads",
    sub: "this month",
    icon: TrendingUp,
    color: "#06b6d4",
    format: (v: number) => v.toLocaleString(),
  },
];

export function ROIWidget() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<ROIData | null>(null);

  useEffect(() => {
    void fetch(`${API_URL}/billing/roi`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json() as Promise<ROIData>)
      .then(setData)
      .catch(console.error);
  }, [token]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,215,0,0.10)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <p
        style={{
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 12,
          opacity: 0.7,
        }}
      >
        ⚡ AI Value Generated — This Month
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const value = data ? tile.format(data[tile.key]) : "—";
          return (
            <div
              key={tile.key}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${tile.color}22`,
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon size={13} color={tile.color} />
                <span style={{ color: tile.color, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                  {tile.label}
                </span>
              </div>
              <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                {value}
              </span>
              <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{tile.sub}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
