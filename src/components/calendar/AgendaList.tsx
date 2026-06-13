import { useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { expandEventsInWindow } from '../../lib/calendar-utils';
import { CATEGORY_CONFIG, type CalendarEvent, type EventCategory } from '../../types/calendar';
import { EventBadge } from './EventBadge';

interface Props {
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectEvent: (event: CalendarEvent) => void;
  onClearDate: () => void;
}

const STATUS_CONFIG = {
  done:      { label: 'Done',      cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-500 border border-red-200'             },
  pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-600 border border-amber-200'       },
} as const;

const CATEGORY_FILTERS: { key: EventCategory | 'all'; label: string }[] = [
  { key: 'all',      label: 'All'       },
  { key: 'meeting',  label: 'Meetings'  },
  { key: 'invoice',  label: 'Invoices'  },
  { key: 'contract', label: 'Contracts' },
  { key: 'reminder', label: 'Reminders' },
  { key: 'other',    label: 'Other'     },
];

interface EventCardProps {
  event: CalendarEvent;
  occurrenceDate: Date;
  onClick: () => void;
}

function EventCard({ event, occurrenceDate, onClick }: EventCardProps) {
  const cfg       = CATEGORY_CONFIG[event.category];
  const statusCfg = STATUS_CONFIG[event.status];
  const isDone      = event.status === 'done';
  const isCancelled = event.status === 'cancelled';

  const timeStr = event.all_day ? 'All day' : format(occurrenceDate, 'HH:mm');

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-200 hover:border-cyan-400/50 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_4px_16px_rgba(34,211,238,0.08)] transition-all flex overflow-hidden bg-white"
    >
      {/* Category accent bar */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: cfg.color }} />

      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">

            {/* Badge row */}
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <EventBadge category={event.category} />
              {event.recurrence_rule && (
                <span className="text-[10px] text-slate-400 font-medium">↻</span>
              )}
            </div>

            {/* Title */}
            <p
              className={[
                'text-sm font-semibold leading-snug',
                isCancelled
                  ? 'line-through text-slate-400'
                  : isDone
                  ? 'line-through text-slate-500'
                  : 'text-slate-800',
              ].join(' ')}
            >
              {event.title}
            </p>

            {/* Time + amount */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center text-[10px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                {timeStr}
              </span>
              {event.amount != null && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${cfg.color}1a`, color: cfg.color }}
                >
                  {event.currency} {event.amount != null ? Number(event.amount).toLocaleString() : '—'}
                </span>
              )}
              {event.description && (
                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {event.description}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          {event.status !== 'pending' && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function AgendaList({ events, selectedDate, onSelectEvent, onClearDate }: Props) {
  const now = useMemo(() => new Date(), []);
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'all'>('all');

  const items = useMemo(() => {
    const windowStart = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      : now;
    const windowEnd = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59)
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return expandEventsInWindow(events, windowStart, windowEnd);
  }, [events, selectedDate, now]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items;
    return items.filter(({ event }) => event.category === activeFilter);
  }, [items, activeFilter]);

  const grouped = useMemo(() => {
    if (selectedDate) return null;
    const map = new Map<string, typeof filtered>();
    filtered.forEach(item => {
      const key = format(item.occurrenceDate, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries()).slice(0, 40);
  }, [filtered, selectedDate]);

  const heading = selectedDate
    ? format(selectedDate, 'EEEE, d MMMM yyyy')
    : 'Upcoming — Next 90 Days';

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{heading}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' && (
              <> · {CATEGORY_FILTERS.find(f => f.key === activeFilter)?.label}</>
            )}
          </p>
        </div>
        {selectedDate && (
          <button
            onClick={onClearDate}
            className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 flex-shrink-0"
          >
            ← All upcoming
          </button>
        )}
      </div>

      {/* ── Category filter chips ── */}
      <div className="flex gap-1.5 mb-3 flex-wrap flex-shrink-0">
        {CATEGORY_FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          const color    = key !== 'all' ? CATEGORY_CONFIG[key].color : undefined;
          const count    = key === 'all'
            ? items.length
            : items.filter(({ event }) => event.category === key).length;
          if (count === 0 && key !== 'all') return null;

          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border',
                isActive
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
              ].join(' ')}
              style={isActive ? { backgroundColor: color ?? '#4f46e5', borderColor: color ?? '#4f46e5' } : {}}
            >
              {key !== 'all' && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : color }}
                />
              )}
              {label}
              <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Event list ── */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">📅</div>
          <div>
            <p className="text-sm font-medium text-slate-500">
              No events {selectedDate ? 'on this day' : 'coming up'}
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="text-xs text-indigo-500 hover:underline mt-1"
              >
                Show all categories
              </button>
            )}
            {selectedDate && (
              <button onClick={onClearDate} className="block text-xs text-indigo-500 hover:underline mt-1 mx-auto">
                View all upcoming
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
          {selectedDate || !grouped ? (
            filtered.map(({ event, occurrenceDate }, idx) => (
              <EventCard
                key={`${event.id}-${idx}`}
                event={event}
                occurrenceDate={occurrenceDate}
                onClick={() => onSelectEvent(event)}
              />
            ))
          ) : (
            grouped.map(([dateKey, dayItems]) => {
              const date       = new Date(dateKey + 'T12:00:00');
              const isToday    = isSameDay(date, now);
              const isTomorrow = isSameDay(date, new Date(now.getTime() + 86400000));
              const label      = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEE, d MMM');

              return (
                <div key={dateKey} className="mb-1">
                  <div className="flex items-center gap-2 py-1.5 mb-1 sticky top-0 bg-white z-10">
                    <span
                      className={`text-[11px] font-bold tracking-wide ${
                        isToday ? 'text-indigo-600' : 'text-slate-500'
                      }`}
                    >
                      {label}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] text-slate-300 font-medium">{dayItems.length}</span>
                  </div>
                  <div className="space-y-1">
                    {dayItems.map(({ event, occurrenceDate }, idx) => (
                      <EventCard
                        key={`${event.id}-${idx}`}
                        event={event}
                        occurrenceDate={occurrenceDate}
                        onClick={() => onSelectEvent(event)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
