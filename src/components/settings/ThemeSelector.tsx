import { useTheme, type AppTheme } from "../../hooks/useTheme";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

interface ThemeOption {
  id: AppTheme;
  name: string;
  description: string;
  preview: {
    sidebar: string;
    bg: string;
    card: string;
    accent: string;
    text: string;
  };
}

const THEMES: ThemeOption[] = [
  {
    id: "aios-blue",
    name: "AIOS Blue",
    description: "Classic indigo — the default premium look",
    preview: {
      sidebar: "#0f172a",
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#6366f1",
      text: "#334155",
    },
  },
  {
    id: "midnight-pro",
    name: "Midnight Pro",
    description: "Deep violet — bold and distinctive",
    preview: {
      sidebar: "#0f172a",
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#8b5cf6",
      text: "#334155",
    },
  },
  {
    id: "arctic",
    name: "Arctic",
    description: "Sky blue — clean and minimal",
    preview: {
      sidebar: "#0f172a",
      bg: "#f8fafc",
      card: "#ffffff",
      accent: "#0ea5e9",
      text: "#334155",
    },
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "w-full text-left rounded-xl border-2 p-4 transition-all duration-150",
              isActive
                ? "border-brand-500 bg-brand-50 shadow-sm"
                : "border-surface-200 bg-white hover:border-brand-300 hover:shadow-sm"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Mini app preview */}
              <div
                className="flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden border border-surface-200 flex"
                aria-hidden
              >
                <div className="w-5 h-full" style={{ backgroundColor: t.preview.sidebar }} />
                <div className="flex-1 flex flex-col gap-1 p-1" style={{ backgroundColor: t.preview.bg }}>
                  <div className="h-2 w-full rounded-sm" style={{ backgroundColor: t.preview.card }} />
                  <div className="h-3 w-full rounded-sm flex items-center px-1 gap-0.5" style={{ backgroundColor: t.preview.card }}>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.preview.accent }} />
                    <div className="h-1 flex-1 rounded-sm" style={{ backgroundColor: t.preview.text, opacity: 0.3 }} />
                  </div>
                  <div className="h-3 w-full rounded-sm flex items-center justify-center" style={{ backgroundColor: t.preview.accent }}>
                    <div className="h-1 w-5 rounded-sm bg-white opacity-80" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", isActive ? "text-brand-700" : "text-surface-900")}>
                  {t.name}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">{t.description}</p>
              </div>

              {/* Selected indicator */}
              <div
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                  isActive ? "bg-brand-500" : "border-2 border-surface-300"
                )}
              >
                {isActive && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
