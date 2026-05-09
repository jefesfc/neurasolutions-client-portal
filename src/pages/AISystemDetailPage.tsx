import { useParams, Link } from "react-router-dom";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { SystemDetailPanel } from "../components/ai-systems/SystemDetailPanel";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { mockAISystems } from "../lib/mock-data";
import { ArrowLeft, Cpu } from "lucide-react";

export default function AISystemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const system = mockAISystems.find((s) => s.id === id);

  if (!system) {
    return (
      <PageTransition>
        <EmptyState
          icon={Cpu}
          title="System not found"
          description="The AI system you're looking for doesn't exist."
          action={
            <Link to="/systems">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to Systems
              </Button>
            </Link>
          }
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title={system.name}
        description={system.shortDescription}
        actions={
          <Link to="/systems">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              All Systems
            </Button>
          </Link>
        }
      />
      <SystemDetailPanel system={system} />
    </PageTransition>
  );
}