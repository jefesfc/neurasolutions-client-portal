import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthEventMap } from '../../lib/calendar-utils';
import { CATEGORY_CONFIG, type EventCategory, type CalendarEvent } from '../../types/calendar';

interface Props {
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function CalendarGrid({ events, selectedDate, onSelectDate }: Props) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const eventMap = useMemo(
    () => buildMonthEventMap(events, viewYear, viewMonth),
    [events, viewYear, viewMonth]
  );

  const monthStart  = new Date(viewYear, viewMonth, 1);
  const totalDays   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (monthStart.getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const monthLabel = monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const monthStats = useMemo(() => {
    const counts: Partial<Record<EventCategory, number>> = {};
    let total = 0;
    eventMap.forEach(evs => {
      evs.forEach(ev => {
        counts[ev.category] = (counts[ev.category] ?? 0) + 1;
        total++;
      });
    });
    return { counts, total };
  }, [eventMap]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function dateKey(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const selKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Month navigator ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-800 tracking-tight">{monthLabel}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {monthStats.total > 0
              ? `${monthStats.total} event${monthStats.total !== 1 ? 's' : ''} this month`
              : 'No events this month'}
          </p>
        </div>

        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Day labels ── */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold pb-1.5 uppercase tracking-wide ${
              i >= 5 ? 'text-slate-300' : 'text-slate-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day cells ── */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="min-h-[40px]" />;

          const key    = dateKey(day);
          const dayEvs = eventMap.get(key) ?? [];
          const isToday = (
            today.getFullYear() === viewYear &&
            today.getMonth()    === viewMonth &&
            today.getDate()     === day
          );
          const isSel     = selKey === key;
          const isWeekend = idx % 7 >= 5;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(isSel ? null : new Date(viewYear, viewMonth, day))}
              className={[
                'flex flex-col items-center rounded-xl px-0.5 pt-1.5 pb-1 text-xs transition-all min-h-[40px] cursor-pointer',
                isToday
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                  : isSel
                  ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-inset ring-indigo-300'
                  : isWeekend
                  ? 'text-slate-300 hover:bg-slate-50'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              <span className="text-[11px] leading-tight">{day}</span>

              {dayEvs.length > 0 && (
                <div className="flex justify-center items-center gap-0.5 mt-1 flex-wrap max-w-full">
                  {dayEvs.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isToday
                          ? 'rgba(255,255,255,0.8)'
                          : CATEGORY_CONFIG[ev.category].color,
                      }}
                    />
                  ))}
                  {dayEvs.length > 3 && (
                    <span
                      className={`text-[8px] leading-none font-semibold ml-0.5 ${
                        isToday ? 'text-white/70' : 'text-slate-400'
                      }`}
                    >
                      +{dayEvs.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── This-month legend ── */}
      {monthStats.total > 0 && (
        <div className="mt-auto pt-4 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
            This Month
          </p>
          <div className="space-y-2">
            {(Object.entries(CATEGORY_CONFIG) as [EventCategory, { label: string; color: string }][]).map(
              ([cat, cfg]) => {
                const count = monthStats.counts[cat] ?? 0;
                if (count === 0) return null;
                const pct = Math.round((count / monthStats.total) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="text-[11px] text-slate-500">{cfg.label}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700">{count}</span>
                    </div>
                    <div className="h-0.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
