import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../store/auth-store";
import { formatDate } from "../lib/formatters";
import { Building2, Mail, Phone, Globe, Calendar, Settings, Users } from "lucide-react";

export default function ProfilePage() {
  const client = useAuthStore((s) => s.client);

  if (!client) return null;

  return (
    <PageTransition>
      <PageHeader
        title="Profile"
        description="Company profile and account settings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Your company details and account information</CardDescription>
          </CardHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar fallback={client.companyName} size="lg" className="bg-brand-100 text-brand-700" />
              <div>
                <h3 className="text-xl font-bold text-surface-900">{client.companyName}</h3>
                <Badge variant="neutral">{client.industry}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <Building2 className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-400">Industry</p>
                  <p className="text-sm font-medium text-surface-700">{client.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <Users className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-400">Company Size</p>
                  <p className="text-sm font-medium text-surface-700">{client.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <Globe className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-400">Website</p>
                  <p className="text-sm font-medium text-surface-700">{client.website}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <Calendar className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-400">Member Since</p>
                  <p className="text-sm font-medium text-surface-700">{formatDate(client.memberSince, "MMMM yyyy")}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Manager */}
        <Card>
          <CardHeader>
            <CardTitle>Account Manager</CardTitle>
            <CardDescription>Your dedicated point of contact</CardDescription>
          </CardHeader>
          <div className="flex flex-col items-center text-center">
            <Avatar fallback={client.accountManager.name} size="lg" className="bg-brand-100 text-brand-700 mb-3" />
            <h4 className="text-base font-semibold text-surface-900">{client.accountManager.name}</h4>
            <p className="text-sm text-surface-500 mb-4">Solutions Architect</p>
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-sm text-surface-600 p-2 bg-surface-50 rounded-lg">
                <Mail className="h-4 w-4 text-surface-400" />
                {client.accountManager.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-600 p-2 bg-surface-50 rounded-lg">
                <Phone className="h-4 w-4 text-surface-400" />
                {client.accountManager.phone}
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              <Settings className="h-4 w-4" />
              Account Settings
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}