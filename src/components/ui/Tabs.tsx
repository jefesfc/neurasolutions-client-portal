import { cn } from "../../lib/cn";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-surface-100 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium rounded-lg transition-all",
            activeTab === tab.id
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                activeTab === tab.id ? "bg-surface-100 text-surface-600" : "bg-surface-200 text-surface-500"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
