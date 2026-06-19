import { PageTransition } from "../components/shared/PageTransition";
import { HeroBanner } from "../components/dashboard/HeroBanner";
import { GettingStartedWidget } from "../components/dashboard/GettingStartedWidget";
import { useAuthStore } from "../store/auth-store";

const DEMO_EMAIL = 'ldmrukuae@gmail.com';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isDemo = user?.email === DEMO_EMAIL;

  return (
    <PageTransition>
      <div className="p-6">
        {!isDemo && <GettingStartedWidget />}
        <HeroBanner />
      </div>
    </PageTransition>
  );
}
