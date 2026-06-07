import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "../config/routes";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PlatformAdminRoute } from "../components/auth/PlatformAdminRoute";
import { ModulePermissionsGuard } from "../components/team/ModulePermissionsGuard";
import LoginPage from "../pages/LoginPage";
import AdminPage from "../pages/admin/AdminPage";
import DashboardPage from "../pages/DashboardPage";
import LeadsPage from "../pages/LeadsPage";
import ClientsPage from "../pages/ClientsPage";
import CalendarPage from "../pages/CalendarPage";
import EmailsPage from "../pages/EmailsPage";
import AISystemsPage from "../pages/AISystemsPage";
import AISystemDetailPage from "../pages/AISystemDetailPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import ReportsPage from "../pages/ReportsPage";
import SupportPage from "../pages/SupportPage";
import BillingPage from "../pages/BillingPage";
import ProfilePage from "../pages/ProfilePage";
import UsagePage from "../pages/UsagePage";
import TeamPage from "../pages/TeamPage";
import SettingsPage from "../pages/SettingsPage";
import SecurityPage from "../pages/SecurityPage";
import NotificationsPage from "../pages/NotificationsPage";
import NotFoundPage from "../pages/NotFoundPage";

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: ROUTES.Login,
    element: <LoginPage />,
  },
  {
    path: ROUTES.Admin,
    element: (
      <PlatformAdminRoute>
        <AppLayout><AdminPage /></AppLayout>
      </PlatformAdminRoute>
    ),
  },
  {
    path: ROUTES.Dashboard,
    element: <Protected><DashboardPage /></Protected>,
  },
  {
    path: ROUTES.Leads,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="leads">
          <LeadsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Clients,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="crm">
          <ClientsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Calendar,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="calendar">
          <CalendarPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Emails,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="emails">
          <EmailsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.AISystems,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="ai_systems">
          <AISystemsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.AISystemDetail,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="ai_systems">
          <AISystemDetailPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Analytics,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="analytics">
          <AnalyticsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Reports,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="reports">
          <ReportsPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Support,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="support">
          <SupportPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Billing,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="billing">
          <BillingPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Profile,
    element: <Protected><ProfilePage /></Protected>,
  },
  {
    path: ROUTES.Usage,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="usage">
          <UsagePage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Team,
    element: (
      <Protected>
        <ModulePermissionsGuard permission="team">
          <TeamPage />
        </ModulePermissionsGuard>
      </Protected>
    ),
  },
  {
    path: ROUTES.Settings,
    element: <Protected><SettingsPage /></Protected>,
  },
  {
    path: ROUTES.Security,
    element: <Protected><SecurityPage /></Protected>,
  },
  {
    path: ROUTES.Notifications,
    element: <Protected><NotificationsPage /></Protected>,
  },
  {
    path: "*",
    element: <Protected><NotFoundPage /></Protected>,
  },
]);
