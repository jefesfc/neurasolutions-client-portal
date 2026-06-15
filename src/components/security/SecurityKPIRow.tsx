import { Activity, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { KPITile } from '../ui/KPITile';
import type { SecuritySummary } from '../../types/security';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

export function SecurityKPIRow({ summary, loading }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <KPITile
        label="Total Events"
        value={summary?.total_events ?? '—'}
        sub="monitored"
        color="#818cf8"
        Icon={Activity}
        loading={loading}
      />
      <KPITile
        label="High / Critical"
        value={loading ? '—' : `${summary?.high_count ?? '0'} / ${summary?.critical_count ?? '0'}`}
        sub="severity events"
        color="#f87171"
        Icon={AlertTriangle}
        loading={loading}
      />
      <KPITile
        label="Unresolved"
        value={summary?.high_unresolved ?? '—'}
        sub="require action"
        color="#fbbf24"
        Icon={Clock}
        loading={loading}
      />
      <KPITile
        label="Resolved"
        value={summary?.resolved_count ?? '—'}
        sub="cleared"
        color="#34d399"
        Icon={ShieldCheck}
        loading={loading}
      />
    </div>
  );
}
