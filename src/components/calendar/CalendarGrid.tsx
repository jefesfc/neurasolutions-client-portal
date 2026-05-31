import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthEventMap } from '../../lib/calendar-utils';
import { CATEGORY_CONFIG, type CalendarEvent } from '../../types/calendar';

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
  const startOffset = (monthStart.getDay() + 6) % 7; // 0 = Monday

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const monthLabel = monthStart.toLocaleString('default', { month: 'long', year: 'numeric' });

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

  return (
    <div className="flex flex-col h-full select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-surface-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-surface-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] text-surface-500 pb-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;

          const key      = dateKey(day);
          const dayEvs   = eventMap.get(key) ?? [];
          const isToday  = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
          const selKey   = selectedDate
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`
            : null;
          const isSel    = selKey === key;

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(isSel ? null : new Date(viewYear, viewMonth, day))}
              className={[
                'flex flex-col items-center rounded-lg p-1 text-xs transition-colors min-h-[38px] cursor-pointer',
                isToday  ? 'bg-indigo-600 text-white font-semibold' : '',
                isSel && !isToday ? 'bg-white/20 text-white' : '',
                !isToday && !isSel ? 'hover:bg-white/10 text-surface-300' : '',
              ].join(' ')}
            >
              <span>{day}</span>
              {dayEvs.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                  {dayEvs.slice(0, 3).map((ev, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_CONFIG[ev.category].color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
