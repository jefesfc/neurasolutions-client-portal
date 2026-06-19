import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";
import { GettingStartedWidget } from "../components/dashboard/GettingStartedWidget";

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="p-6">
        <GettingStartedWidget />
        <HeroBanner />
      </div>
    </PageTransition>
  );
}
