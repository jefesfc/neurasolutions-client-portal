import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="p-6">
        <HeroBanner />
      </div>
    </PageTransition>
  );
}
