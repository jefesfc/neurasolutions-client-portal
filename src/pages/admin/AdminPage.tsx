import { useEffect, useState } from 'react';
import { PageTransition } from '../../components/shared/PageTransition';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../store/auth-store';
import { Building2, Users, Zap } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  industry: string | null;
  created_at: string;
  user_count?: number;
}

const planVariant: Record<string, 'success' | 'warning' | 'info'> = {
  starter: 'info',
  growth: 'warning',
  enterprise: 'success',
};

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/admin/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setTenants(data.tenants ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <PageTransition>
      <PageHeader
        title="Platform Admin"
        description="All tenants on the NeuraSolutions platform"
      />

      {loading ? (
        <div className="text-surface-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-900">{tenant.name}</p>
                    <p className="text-xs text-surface-400">{tenant.subdomain}</p>
                  </div>
                </div>
                <Badge variant={planVariant[tenant.plan] ?? 'neutral'}>
                  {tenant.plan}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-surface-500">
                {tenant.industry && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {tenant.industry}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {tenant.user_count ?? 0} users
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
