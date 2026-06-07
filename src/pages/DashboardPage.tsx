import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";
import { DashboardPanel } from "../components/dashboard/DashboardPanel";

export default function DashboardPage() {
  return (
    <PageTransition>
      <HeroBanner />
      <DashboardPanel />
    </PageTransition>
  );
}
