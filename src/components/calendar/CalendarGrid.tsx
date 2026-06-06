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
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
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
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Calendar grid (bordered cells) ── */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-7 border border-slate-200 rounded-xl overflow-hidden shadow-sm">

          {/* Day header row */}
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={[
                'py-2 text-center text-[10px] font-bold uppercase tracking-wider border-b border-slate-200',
                i < 6 ? 'border-r border-slate-200' : '',
                i >= 5 ? 'bg-slate-50 text-slate-300' : 'bg-slate-50 text-slate-400',
              ].join(' ')}
            >
              {d}
            </div>
          ))}

          {/* Day cells */}
          {cells.map((day, idx) => {
            const isLastCol = idx % 7 === 6;
            const rowCount  = Math.ceil(cells.length / 7);
            const rowIdx    = Math.floor(idx / 7);
            const isLastRow = rowIdx === rowCount - 1;

            if (!day) {
              return (
                <div
                  key={idx}
                  className={[
                    'min-h-[44px] bg-slate-50/40',
                    !isLastCol ? 'border-r border-slate-200' : '',
                    !isLastRow ? 'border-b border-slate-200' : '',
                  ].join(' ')}
                />
              );
            }

            const key       = dateKey(day);
            const dayEvs    = eventMap.get(key) ?? [];
            const isToday   = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
            const isSel     = selKey === key;
            const isWeekend = idx % 7 >= 5;

            return (
              <button
                key={idx}
                onClick={() => onSelectDate(isSel ? null : new Date(viewYear, viewMonth, day))}
                className={[
                  'relative min-h-[44px] p-1.5 flex flex-col items-start transition-all cursor-pointer group text-left',
                  !isLastCol ? 'border-r border-slate-200' : '',
                  !isLastRow ? 'border-b border-slate-200' : '',
                  isToday
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : isSel
                    ? 'bg-indigo-50 hover:bg-indigo-100'
                    : isWeekend
                    ? 'bg-slate-50/70 hover:bg-slate-100'
                    : 'bg-white hover:bg-slate-50',
                ].join(' ')}
              >
                {/* Day number */}
                <span
                  className={[
                    'text-[11px] font-bold leading-none',
                    isToday
                      ? 'text-white'
                      : isSel
                      ? 'text-indigo-700'
                      : isWeekend
                      ? 'text-slate-300'
                      : 'text-slate-700',
                  ].join(' ')}
                >
                  {day}
                </span>

                {/* Event indicators */}
                {dayEvs.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-1 w-full">
                    {dayEvs.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        className="w-full rounded-sm px-1 py-px flex items-center gap-0.5 overflow-hidden"
                        style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.2)' : `${CATEGORY_CONFIG[ev.category].color}20` }}
                      >
                        <span
                          className="w-1 h-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.9)' : CATEGORY_CONFIG[ev.category].color }}
                        />
                        <span
                          className="text-[8px] font-semibold truncate leading-tight"
                          style={{ color: isToday ? 'rgba(255,255,255,0.85)' : CATEGORY_CONFIG[ev.category].color }}
                        >
                          {ev.title}
                        </span>
                      </div>
                    ))}
                    {dayEvs.length > 2 && (
                      <span className={`text-[8px] font-bold pl-1 ${isToday ? 'text-white/60' : 'text-slate-400'}`}>
                        +{dayEvs.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── This-month legend ── */}
      {monthStats.total > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            This Month
          </p>
          <div className="space-y-1.5">
            {(Object.entries(CATEGORY_CONFIG) as [EventCategory, { label: string; color: string }][]).map(
              ([cat, cfg]) => {
                const count = monthStats.counts[cat] ?? 0;
                if (count === 0) return null;
                const pct = Math.round((count / monthStats.total) * 100);
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <span className="text-[11px] text-slate-500 flex-1 truncate">{cfg.label}</span>
                    <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 w-4 text-right">{count}</span>
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
