import { Activity, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { KPITile } from '../ui/KPITile';
import type { SecuritySummary } from '../../types/security';
import { useTranslations } from '../../i18n/useT';

interface Props {
  summary: SecuritySummary | null;
  loading: boolean;
}

export function SecurityKPIRow({ summary, loading }: Props) {
  const T = useTranslations();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <KPITile
        label={T.security.kpiTotalEvents}
        value={summary?.total_events ?? '—'}
        sub={T.security.kpiMonitored}
        color="#818cf8"
        Icon={Activity}
        loading={loading}
      />
      <KPITile
        label={T.security.kpiHighCritical}
        value={loading ? '—' : `${summary?.high_count ?? '0'} / ${summary?.critical_count ?? '0'}`}
        sub={T.security.kpiSeverity}
        color="#f87171"
        Icon={AlertTriangle}
        loading={loading}
      />
      <KPITile
        label={T.security.kpiUnresolved}
        value={summary?.high_unresolved ?? '—'}
        sub={T.security.kpiRequireAction}
        color="#fbbf24"
        Icon={Clock}
        loading={loading}
      />
      <KPITile
        label={T.security.kpiResolved}
        value={summary?.resolved_count ?? '—'}
        sub={T.security.kpiCleared}
        color="#34d399"
        Icon={ShieldCheck}
        loading={loading}
      />
    </div>
  );
}
