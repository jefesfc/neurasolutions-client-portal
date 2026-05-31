import { useMemo } from 'react';
import { format } from 'date-fns';
import { expandEventsInWindow } from '../../lib/calendar-utils';
import { CATEGORY_CONFIG, type CalendarEvent } from '../../types/calendar';
import { EventBadge } from './EventBadge';

interface Props {
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectEvent: (event: CalendarEvent) => void;
  onClearDate: () => void;
}

export function AgendaList({ events, selectedDate, onSelectEvent, onClearDate }: Props) {
  const now = useMemo(() => new Date(), []);

  const items = useMemo(() => {
    const windowStart = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      : now;
    const windowEnd = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59)
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return expandEventsInWindow(events, windowStart, windowEnd);
  }, [events, selectedDate, now]);

  const heading = selectedDate
    ? format(selectedDate, 'd MMMM yyyy')
    : 'Next 90 days';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{heading}</h3>
        {selectedDate && (
          <button onClick={onClearDate} className="text-xs text-surface-400 hover:text-surface-700 transition-colors">
            Clear filter
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-surface-500 text-sm">
          No events {selectedDate ? 'on this day' : 'in the next 90 days'}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {items.map(({ event, occurrenceDate }, idx) => (
            <button
              key={`${event.id}-${idx}`}
              onClick={() => onSelectEvent(event)}
              className="w-full text-left p-3 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors border-l-2 group"
              style={{ borderLeftColor: CATEGORY_CONFIG[event.category].color }}
            >
              <div className="flex items-center gap-2 mb-1">
                <EventBadge category={event.category} />
                {event.status === 'done'      && <span className="text-[10px] text-surface-500">✓ Done</span>}
                {event.status === 'cancelled' && <span className="text-[10px] text-red-400">Cancelled</span>}
                {event.recurrence_rule && <span className="text-[10px] text-surface-500">↻</span>}
              </div>
              <p className="text-sm font-medium text-surface-900 leading-snug">{event.title}</p>
              <p className="text-xs text-surface-400 mt-0.5">
                {event.all_day
                  ? format(occurrenceDate, 'd MMM yyyy')
                  : format(occurrenceDate, 'd MMM yyyy · HH:mm')}
              </p>
              {event.amount != null && (
                <p className="text-xs text-surface-500 mt-0.5">
                  {event.currency} {event.amount.toLocaleString()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
