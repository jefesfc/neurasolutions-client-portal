import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "../config/routes";
import { AppLayout } from "../components/layout/AppLayout";
import DashboardPage from "../pages/DashboardPage";
import AISystemsPage from "../pages/AISystemsPage";
import AISystemDetailPage from "../pages/AISystemDetailPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import ReportsPage from "../pages/ReportsPage";
import SupportPage from "../pages/SupportPage";
import BillingPage from "../pages/BillingPage";
import ProfilePage from "../pages/ProfilePage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.AISystems,
    element: (
      <AppLayout>
        <AISystemsPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.AISystemDetail,
    element: (
      <AppLayout>
        <AISystemDetailPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.Analytics,
    element: (
      <AppLayout>
        <AnalyticsPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.Reports,
    element: (
      <AppLayout>
        <ReportsPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.Support,
    element: (
      <AppLayout>
        <SupportPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.Billing,
    element: (
      <AppLayout>
        <BillingPage />
      </AppLayout>
    ),
  },
  {
    path: ROUTES.Profile,
    element: (
      <AppLayout>
        <ProfilePage />
      </AppLayout>
    ),
  },
  {
    path: "*",
    element: (
      <AppLayout>
        <NotFoundPage />
      </AppLayout>
    ),
  },
]);
