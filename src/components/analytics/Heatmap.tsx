import { ChartCard } from "./ChartCard";
import { cn } from "../../lib/cn";

interface HeatmapProps {
  title: string;
  data: { day: string; hour: number; value: number }[];
  maxValue: number;
}

function intensityClass(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-surface-100";
  const pct = value / max;
  if (pct < 0.14) return "bg-brand-100";
  if (pct < 0.28) return "bg-brand-200";
  if (pct < 0.43) return "bg-brand-300";
  if (pct < 0.57) return "bg-brand-400";
  if (pct < 0.71) return "bg-brand-500";
  if (pct < 0.86) return "bg-brand-600";
  return "bg-brand-700";
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourLabel({ h }: { h: number }) {
  const show = h % 3 === 0;
  return (
    <div className="flex items-center justify-center text-[9px] text-surface-400 tabular-nums select-none">
      {show ? `${h}h` : ""}
    </div>
  );
}

export function Heatmap({ title, data, maxValue }: HeatmapProps) {
  return (
    <ChartCard title={title} subtitle="Activity distribution by day and hour">
      <div className="overflow-x-auto pb-1">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: "52px repeat(24, minmax(22px, 1fr))",
            minWidth: "640px",
          }}
        >
          {/* Top hour labels */}
          <div className="h-5" />
          {HOURS.map((h) => (
            <HourLabel key={`top-${h}`} h={h} />
          ))}

          {/* Day rows */}
          {DAYS.map((day) => {
            return (
              <div key={day} className="contents">
                <div className="h-9 flex items-center text-xs font-medium text-surface-500 pr-2 select-none">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const cell = data.find((d) => d.day === day && d.hour === hour);
                  const value = cell?.value ?? 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={cn(
                        "h-9 rounded m-[2px] transition-all duration-150 cursor-default",
                        "hover:ring-2 hover:ring-brand-400 hover:ring-offset-1 hover:ring-offset-white hover:scale-110 hover:z-10 relative",
                        intensityClass(value, maxValue)
                      )}
                      title={`${day} ${String(hour).padStart(2, "0")}:00 — ${value.toLocaleString()} interactions`}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Bottom hour labels */}
          <div className="h-5 flex items-center text-[9px] text-surface-400 select-none">total</div>
          {HOURS.map((h) => {
            const colTotal = data
              .filter((d) => d.hour === h)
              .reduce((s, d) => s + d.value, 0);
            const show = h % 3 === 0;
            return (
              <div key={`bot-${h}`} className="h-5 flex items-center justify-center text-[9px] text-surface-400 tabular-nums select-none">
                {show && colTotal > 0 ? colTotal.toLocaleString() : show ? `${h}h` : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-5 justify-between">
        <span className="text-xs text-surface-400">Less activity</span>
        <div className="flex items-center gap-1">
          {["bg-surface-100", "bg-brand-100", "bg-brand-200", "bg-brand-300", "bg-brand-400", "bg-brand-500", "bg-brand-600", "bg-brand-700"].map((cls) => (
            <div key={cls} className={cn("h-4 w-5 rounded-sm", cls)} />
          ))}
        </div>
        <span className="text-xs text-surface-400">More activity</span>
      </div>
    </ChartCard>
  );
}