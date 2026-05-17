import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuthStore } from "../store/auth-store";
import { Mail, Shield, Settings, LogOut } from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    user: 'User',
  };

  return (
    <PageTransition>
      <PageHeader
        title="Profile"
        description="Your account and workspace settings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar fallback={user.name} size="lg" className="bg-brand-100 text-brand-700" />
              <div>
                <h3 className="text-xl font-bold text-surface-900">{user.name}</h3>
                <Badge variant="neutral">{roleLabel[user.role] ?? user.role}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <Mail className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-400">Email</p>
                  <p className="text-sm font-medium text-surface-700">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <Shield className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-xs text-surface-400">Role</p>
                  <p className="text-sm font-medium text-surface-700">{roleLabel[user.role] ?? user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Account management</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Account Settings
            </Button>
            <Button variant="danger" className="w-full justify-start gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
