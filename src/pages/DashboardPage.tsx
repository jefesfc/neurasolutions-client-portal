import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { LeadsMap } from "../components/dashboard/LeadsMap";
import { SystemsStatusOverview } from "../components/dashboard/SystemsStatusOverview";
import { NotificationsPanel } from "../components/dashboard/NotificationsPanel";

export default function DashboardPage() {
  return (
    <PageTransition>
      <HeroBanner />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div className="space-y-6">
          <SystemsStatusOverview />
          <NotificationsPanel />
        </div>
      </div>
      <LeadsMap />
    </PageTransition>
  );
}
