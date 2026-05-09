import { ChartCard } from "./ChartCard";
import { cn } from "../../lib/cn";

interface HeatmapProps {
  title: string;
  data: { day: string; hour: number; value: number }[];
  maxValue: number;
}

function intensityColor(value: number, max: number): string {
  if (max === 0) return "bg-surface-100";
  const pct = value / max;
  if (pct < 0.2) return "bg-surface-100";
  if (pct < 0.4) return "bg-brand-200";
  if (pct < 0.6) return "bg-brand-300";
  if (pct < 0.8) return "bg-brand-400";
  return "bg-brand-500";
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Heatmap({ title, data, maxValue }: HeatmapProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <ChartCard title={title} subtitle="Activity distribution by day and hour">
      <div className="overflow-x-auto">
        <div className="inline-grid" style={{ gridTemplateColumns: `60px repeat(24, 1fr)` }}>
          <div className="h-6" />
          {hours.map((h) => (
            <div key={h} className="h-6 flex items-center justify-center text-[10px] text-surface-400">
              {h}
            </div>
          ))}
          {DAYS.map((day) => (
            <div key={day} className="contents">
              <div className="h-6 flex items-center text-[10px] text-surface-400 pr-2">{day}</div>
              {hours.map((hour) => {
                const cell = data.find((d) => d.day === day && d.hour === hour);
                const value = cell?.value ?? 0;
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn("h-6 rounded-[2px] m-[1px] transition-colors", intensityColor(value, maxValue))}
                    title={`${day} ${hour}:00 - ${value} interactions`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 justify-end">
        <span className="text-[10px] text-surface-400">Low</span>
        {[0.2, 0.4, 0.6, 0.8, 1].map((pct) => (
          <div key={pct} className={cn("h-3 w-3 rounded-sm", intensityColor(Math.round(maxValue * pct), maxValue))} />
        ))}
        <span className="text-[10px] text-surface-400">High</span>
      </div>
    </ChartCard>
  );
}