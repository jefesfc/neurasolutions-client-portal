import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";
import { DashboardPanel } from "../components/dashboard/DashboardPanel";
import { ROIWidget } from "../components/dashboard/ROIWidget";

export default function DashboardPage() {
  return (
    <PageTransition>
      <HeroBanner />
      <ROIWidget />
      <DashboardPanel />
    </PageTransition>
  );
}
