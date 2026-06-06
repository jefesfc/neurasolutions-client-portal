import { Check } from "lucide-react";
import { PALETTE_PRESETS, type ColorPalette } from "../../hooks/useTheme";
import { cn } from "../../lib/cn";

interface ThemeSelectorProps {
  currentPalette: ColorPalette;
  onSelect: (palette: ColorPalette) => void;
}

const THEME_META: Record<string, { description: string }> = {
  "Obsidian": { description: "Deep black · luxury & focus" },
  "Carbon":   { description: "Navy dark · balanced & default" },
  "Pearl":    { description: "Clean white · light & corporate" },
};

export function ThemeSelector({ currentPalette, onSelect }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(PALETTE_PRESETS).map(([name, preset]) => {
        const isActive = currentPalette.appBg === preset.appBg && currentPalette.cardBg === preset.cardBg;
        const meta = THEME_META[name] ?? { description: "" };

        return (
          <button
            key={name}
            onClick={() => onSelect(preset)}
            className={cn(
              "relative flex flex-col rounded-xl border-2 p-3 text-left transition-all",
              isActive
                ? "border-brand-500 ring-1 ring-brand-500/30 bg-brand-500/5"
                : "border-slate-200 hover:border-indigo-300 hover:shadow-md"
            )}
          >
            {/* Mini color preview */}
            <div
              className="w-full h-16 rounded-lg mb-3 overflow-hidden"
              style={{ background: preset.appBg, border: `1px solid ${preset.borderHover}` }}
            >
              {/* Topbar */}
              <div
                className="h-4 flex items-center px-1.5 gap-1"
                style={{ background: preset.cardBg, borderBottom: `1px solid ${preset.borderHover}` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: preset.brandAccent }} />
                <div className="flex-1 h-0.5 rounded-sm mx-1" style={{ background: preset.borderHover }} />
                <div className="w-3 h-1.5 rounded-sm" style={{ background: preset.borderHover }} />
              </div>
              {/* Body */}
              <div className="flex gap-1 p-1.5" style={{ background: preset.appBg }}>
                {/* Mini cards */}
                <div className="flex-1 rounded p-1 space-y-0.5" style={{ background: preset.cardBg, border: `1px solid ${preset.borderHover}` }}>
                  <div className="h-1 w-6 rounded-sm" style={{ background: preset.textPrimary, opacity: 0.9 }} />
                  <div className="h-0.5 w-4 rounded-sm" style={{ background: preset.textMuted }} />
                </div>
                <div className="flex-1 rounded p-1" style={{ background: preset.cardBg, border: `1px solid ${preset.borderHover}` }}>
                  <div className="flex items-end gap-0.5 h-full pt-1">
                    {[0.5, 0.8, 0.6, 1.0, 0.7].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${h * 16}px`, background: i === 0 ? preset.brandAccent : preset.chart2, opacity: 0.75 + i * 0.05 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Theme name + check */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
              </div>
              {isActive && (
                <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
