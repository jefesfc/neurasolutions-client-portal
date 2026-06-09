// src/components/invoicing/FinancialProjections.tsx (stub — will be replaced in Task C3)
import type { ProjectionData } from '../../types/invoicing';
interface Props { data: ProjectionData | null; loading: boolean; }
export function FinancialProjections({ loading }: Props) {
  return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{loading ? 'Loading...' : 'Financial projections coming soon.'}</div>;
}
