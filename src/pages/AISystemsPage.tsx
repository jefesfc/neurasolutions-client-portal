import { useState } from "react";
import { PageTransition } from "../components/shared/PageTransition";
import { PageHeader } from "../components/layout/PageHeader";
import { SystemGrid } from "../components/ai-systems/SystemGrid";
import { SearchInput } from "../components/shared/SearchInput";
import { mockAISystems } from "../lib/mock-data";

export default function AISystemsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockAISystems.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageTransition>
      <PageHeader
        title="AI Systems"
        description="Monitor and manage your installed AI systems"
      />
      <div className="mb-6">
        <SearchInput
          placeholder="Search systems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          containerClassName="max-w-md"
        />
      </div>
      <SystemGrid systems={filtered} />
    </PageTransition>
  );
}