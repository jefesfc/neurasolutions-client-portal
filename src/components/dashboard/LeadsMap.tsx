import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { useQuery } from "../../hooks/useQuery";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import type { Lead } from "../../types/aios";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Phone prefix → { iso, name, coordinates [lon, lat] }
const PHONE_COUNTRY: { prefix: string; iso: string; name: string; coordinates: [number, number] }[] = [
  { prefix: "+971", iso: "AE", name: "UAE",      coordinates: [53.8,  23.4] },
  { prefix: "+234", iso: "NG", name: "Nigeria",   coordinates: [7.4,    9.1] },
  { prefix: "+385", iso: "HR", name: "Croatia",   coordinates: [15.9,  45.8] },
  { prefix: "+233", iso: "GH", name: "Ghana",     coordinates: [-1.0,   7.9] },
  { prefix: "+34",  iso: "ES", name: "Spain",     coordinates: [-3.7,  40.4] },
  { prefix: "+44",  iso: "GB", name: "UK",        coordinates: [-0.1,  51.5] },
  { prefix: "+33",  iso: "FR", name: "France",    coordinates: [2.2,   46.2] },
  { prefix: "+52",  iso: "MX", name: "Mexico",    coordinates: [-102.6,23.6] },
  { prefix: "+91",  iso: "IN", name: "India",     coordinates: [78.9,  20.6] },
  { prefix: "+46",  iso: "SE", name: "Sweden",    coordinates: [18.6,  60.1] },
  { prefix: "+39",  iso: "IT", name: "Italy",     coordinates: [12.6,  41.9] },
  { prefix: "+81",  iso: "JP", name: "Japan",     coordinates: [138.3, 36.2] },
];

function getCountry(phone: string | null) {
  if (!phone) return null;
  return PHONE_COUNTRY.find((c) => phone.startsWith(c.prefix)) ?? null;
}

interface BubbleData {
  iso: string;
  name: string;
  coordinates: [number, number];
  total: number;
  won: number;
}

export function LeadsMap() {
  const { data: leads, loading } = useQuery<Lead>("leads");
  const [tooltip, setTooltip] = useState<{ name: string; total: number; won: number } | null>(null);

  const bubbles = useMemo<BubbleData[]>(() => {
    const map = new Map<string, BubbleData>();
    for (const lead of leads) {
      const country = getCountry(lead.phone);
      if (!country) continue;
      const existing = map.get(country.iso);
      if (existing) {
        existing.total += 1;
        if (lead.status === "won") existing.won += 1;
      } else {
        map.set(country.iso, {
          ...country,
          total: 1,
          won: lead.status === "won" ? 1 : 0,
        });
      }
    }
    return Array.from(map.values());
  }, [leads]);

  const maxBubble = Math.max(...bubbles.map((b) => b.total), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Leads by Country</CardTitle></CardHeader>
        <Skeleton className="h-64 rounded-xl mt-2" />
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <CardHeader className="mb-0">
          <CardTitle>Leads by Country</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-brand-400 opacity-70" /> Leads
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-positive opacity-80" /> Won
          </span>
        </div>
      </div>

      <div className="relative px-2 pb-2">
        {tooltip && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none">
            <p className="font-semibold">{tooltip.name}</p>
            <p>{tooltip.total} lead{tooltip.total !== 1 ? "s" : ""} · {tooltip.won} won</p>
          </div>
        )}

        <ComposableMap
          projectionConfig={{ scale: 140, center: [15, 10] }}
          style={{ width: "100%", height: "280px" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#E8ECF0"
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                  />
                ))
              }
            </Geographies>

            {bubbles.map((bubble) => {
              const r = 4 + (bubble.total / maxBubble) * 14;
              return (
                <Marker
                  key={bubble.iso}
                  coordinates={bubble.coordinates}
                  onMouseEnter={() => setTooltip({ name: bubble.name, total: bubble.total, won: bubble.won })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle
                    r={r}
                    fill={bubble.won > 0 ? "#22c55e" : "#6366f1"}
                    fillOpacity={0.75}
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                  />
                  {bubble.total > 1 && (
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ fontSize: 9, fill: "#fff", fontWeight: 700, pointerEvents: "none" }}
                    >
                      {bubble.total}
                    </text>
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Legend row */}
      <div className="px-5 pb-4 flex flex-wrap gap-3">
        {bubbles
          .sort((a, b) => b.total - a.total)
          .map((b) => (
            <div key={b.iso} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: b.won > 0 ? "#22c55e" : "#6366f1", opacity: 0.8 }}
              />
              {b.name} ({b.total})
            </div>
          ))}
      </div>
    </Card>
  );
}
