import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { SystemsStatusOverview } from "../components/dashboard/SystemsStatusOverview";
import { ClientsOverview } from "../components/dashboard/ClientsOverview";

export default function DashboardPage() {
  return (
    <PageTransition>
      <HeroBanner />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div className="space-y-6">
          <SystemsStatusOverview />
          <ClientsOverview />
        </div>
      </div>
    </PageTransition>
  );
}
