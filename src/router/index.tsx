import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "../config/routes";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PlatformAdminRoute } from "../components/auth/PlatformAdminRoute";
import LoginPage from "../pages/LoginPage";
import AdminPage from "../pages/admin/AdminPage";
import DashboardPage from "../pages/DashboardPage";
import LeadsPage from "../pages/LeadsPage";
import ContactsPage from "../pages/ContactsPage";
import CalendarPage from "../pages/CalendarPage";
import EmailsPage from "../pages/EmailsPage";
import ChatPage from "../pages/ChatPage";
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
    element: <Protected><LeadsPage /></Protected>,
  },
  {
    path: ROUTES.Contacts,
    element: <Protected><ContactsPage /></Protected>,
  },
  {
    path: ROUTES.Calendar,
    element: <Protected><CalendarPage /></Protected>,
  },
  {
    path: ROUTES.Emails,
    element: <Protected><EmailsPage /></Protected>,
  },
  {
    path: ROUTES.AIChat,
    element: <Protected><ChatPage /></Protected>,
  },
  {
    path: ROUTES.AISystems,
    element: <Protected><AISystemsPage /></Protected>,
  },
  {
    path: ROUTES.AISystemDetail,
    element: <Protected><AISystemDetailPage /></Protected>,
  },
  {
    path: ROUTES.Analytics,
    element: <Protected><AnalyticsPage /></Protected>,
  },
  {
    path: ROUTES.Reports,
    element: <Protected><ReportsPage /></Protected>,
  },
  {
    path: ROUTES.Support,
    element: <Protected><SupportPage /></Protected>,
  },
  {
    path: ROUTES.Billing,
    element: <Protected><BillingPage /></Protected>,
  },
  {
    path: ROUTES.Profile,
    element: <Protected><ProfilePage /></Protected>,
  },
  {
    path: ROUTES.Usage,
    element: <Protected><UsagePage /></Protected>,
  },
  {
    path: ROUTES.Team,
    element: <Protected><TeamPage /></Protected>,
  },
  {
    path: ROUTES.Settings,
    element: <Protected><SettingsPage /></Protected>,
  },
  {
    path: "*",
    element: <Protected><NotFoundPage /></Protected>,
  },
]);
