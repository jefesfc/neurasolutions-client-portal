import { RRule } from 'rrule';
import type { CalendarEvent, RecurrenceFreq } from '../types/calendar';

const FREQ_MAP: Record<RecurrenceFreq, number> = {
  daily:   RRule.DAILY,
  weekly:  RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly:  RRule.YEARLY,
};

export interface ExpandedEvent {
  event: CalendarEvent;
  occurrenceDate: Date;
}

export function expandEventsInWindow(
  events: CalendarEvent[],
  windowStart: Date,
  windowEnd: Date
): ExpandedEvent[] {
  const result: ExpandedEvent[] = [];

  for (const event of events) {
    if (!event.recurrence_rule) {
      const d = new Date(event.start_at);
      if (d >= windowStart && d <= windowEnd) {
        result.push({ event, occurrenceDate: d });
      }
    } else {
      const { freq, interval, until } = event.recurrence_rule;
      const rule = new RRule({
        freq: FREQ_MAP[freq] ?? RRule.MONTHLY,
        interval: interval ?? 1,
        dtstart: new Date(event.start_at),
        until: until ? new Date(until) : undefined,
      });
      for (const occ of rule.between(windowStart, windowEnd, true)) {
        result.push({ event, occurrenceDate: occ });
      }
    }
  }

  return result.sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
}

export function buildMonthEventMap(
  events: CalendarEvent[],
  year: number,
  month: number
): Map<string, CalendarEvent[]> {
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);
  const expanded   = expandEventsInWindow(events, monthStart, monthEnd);
  const map        = new Map<string, CalendarEvent[]>();

  for (const { event, occurrenceDate } of expanded) {
    const key = occurrenceDate.toLocaleDateString('en-CA');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(event);
  }

  return map;
}
