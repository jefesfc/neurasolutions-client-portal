import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { useAuthStore } from '../store/auth-store';
import { PageTransition } from '../components/shared/PageTransition';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { AgendaList } from '../components/calendar/AgendaList';
import { EventModal } from '../components/calendar/EventModal';
import type { CalendarEvent } from '../types/calendar';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  const { data: events, loading, error, refetch } = useQuery<CalendarEvent>('calendar_events', {
    order: 'start_at.asc',
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Permission guard AFTER all hooks
  if (user && user.role !== 'admin' && !user.section_permissions.includes('calendar')) {
    void navigate('/');
    return null;
  }

  function openCreate() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    refetch();
  }

  return (
    <PageTransition>
      <PageHeader
        title="Calendar"
        description="Track meetings, invoices, contracts and reminders"
        actions={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              New Event
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid grid-cols-5 gap-6 h-[calc(100vh-13rem)]">
          <div className="col-span-2 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
          </div>
          <div className="col-span-3 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex h-[calc(100vh-13rem)]">
          <div className="w-2/5 border-r border-slate-200 p-5 flex-shrink-0">
            <CalendarGrid
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>
          <div className="flex-1 p-5 overflow-hidden">
            <AgendaList
              events={events}
              selectedDate={selectedDate}
              onSelectEvent={openEdit}
              onClearDate={() => setSelectedDate(null)}
            />
          </div>
        </div>
      )}

      <EventModal
        event={editingEvent}
        defaultDate={selectedDate}
        isOpen={modalOpen}
        canEdit={canEdit ?? false}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </PageTransition>
  );
}
