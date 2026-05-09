import type { AISystem } from "../../types";
import { SystemCard } from "./SystemCard";
import { EmptyState } from "../ui/EmptyState";
import { Cpu } from "lucide-react";

interface SystemGridProps {
  systems: AISystem[];
}

export function SystemGrid({ systems }: SystemGridProps) {
  if (systems.length === 0) {
    return (
      <EmptyState
        icon={Cpu}
        title="No AI Systems"
        description="You don't have any AI systems installed yet. Contact your account manager to get started."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {systems.map((sys, i) => (
        <SystemCard key={sys.id} system={sys} index={i} />
      ))}
    </div>
  );
}