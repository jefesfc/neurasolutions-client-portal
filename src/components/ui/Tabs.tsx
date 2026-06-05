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
    <div className="flex gap-1 p-1 bg-surface-800 rounded-xl border border-surface-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium rounded-lg transition-all",
            activeTab === tab.id
              ? "bg-surface-700 text-surface-100 shadow-sm"
              : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                activeTab === tab.id
                  ? "bg-surface-600 text-surface-200"
                  : "bg-surface-700 text-surface-400"
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
