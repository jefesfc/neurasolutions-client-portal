import { useState } from "react";
import { Check, Palette, RefreshCw } from "lucide-react";
import { cn } from "../../lib/cn";
import { type AppTheme, type BrandScale, generateBrandScale } from "../../hooks/useTheme";

interface ThemeOption {
  id: Exclude<AppTheme, "custom">;
  name: string;
  description: string;
  accent: string;
}

const THEMES: ThemeOption[] = [
  { id: "aios-blue",     name: "AIOS Blue",     description: "Classic indigo — default",         accent: "#6366f1" },
  { id: "midnight-pro",  name: "Midnight Pro",  description: "Deep violet — bold",               accent: "#8b5cf6" },
  { id: "arctic",        name: "Arctic",        description: "Sky blue — clean",                 accent: "#0ea5e9" },
];

const QUICK_COLORS = [
  "#6366f1", "#8b5cf6", "#0ea5e9", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#14b8a6",
  "#f97316", "#84cc16", "#06b6d4", "#a855f7",
];

interface ThemeSelectorProps {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
  customColors: BrandScale;
  onCustomColors: (colors: BrandScale) => void;
}

export function ThemeSelector({ value, onChange, customColors, onCustomColors }: ThemeSelectorProps) {
  const [customPrimary, setCustomPrimary] = useState(customColors["500"]);

  function applyCustomColor(hex: string) {
    setCustomPrimary(hex);
    onCustomColors(generateBrandScale(hex));
    onChange("custom");
  }

  return (
    <div className="space-y-6">
      {/* Preset themes */}
      <div>
        <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Preset Themes</p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const isActive = value === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={cn(
                  "relative rounded-xl border-2 p-3 transition-all duration-150 text-left",
                  isActive
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-surface-700 bg-surface-800 hover:border-surface-600"
                )}
              >
                {/* Color preview dot */}
                <div
                  className="w-8 h-8 rounded-lg mb-2 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${t.accent}dd, ${t.accent}88)` }}
                />
                <p className={cn("text-sm font-semibold", isActive ? "text-brand-300" : "text-surface-200")}>
                  {t.name}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">{t.description}</p>
                {isActive && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom color */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-surface-400" />
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Custom Color</p>
          {value === "custom" && (
            <span className="ml-auto text-xs text-brand-400 font-medium bg-brand-500/10 px-2 py-0.5 rounded-full">Active</span>
          )}
        </div>

        {/* Quick color swatches */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_COLORS.map((hex) => (
            <button
              key={hex}
              onClick={() => applyCustomColor(hex)}
              title={hex}
              className={cn(
                "w-7 h-7 rounded-lg transition-all duration-100 ring-offset-2 ring-offset-surface-900",
                value === "custom" && customPrimary === hex ? "ring-2 ring-white scale-110" : "hover:scale-110"
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>

        {/* Color picker input */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-700 bg-surface-800/50">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-lg shadow-lg cursor-pointer"
              style={{ backgroundColor: customPrimary }}
              onClick={() => document.getElementById("brand-color-picker")?.click()}
            />
            <input
              id="brand-color-picker"
              type="color"
              value={customPrimary}
              onChange={(e) => applyCustomColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-200">Primary Accent</p>
            <p className="text-xs text-surface-500 font-mono mt-0.5">{customPrimary.toUpperCase()}</p>
          </div>
          <button
            onClick={() => applyCustomColor("#6366f1")}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
            title="Reset to default"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Color scale preview */}
        {value === "custom" && (
          <div className="mt-3">
            <p className="text-xs text-surface-500 mb-2">Generated color scale:</p>
            <div className="flex gap-1 rounded-lg overflow-hidden h-6">
              {(["50","100","200","300","400","500","600","700","800","900"] as const).map((shade) => (
                <div
                  key={shade}
                  title={`${shade}: ${customColors[shade]}`}
                  className="flex-1"
                  style={{ backgroundColor: customColors[shade] }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-surface-600">50</span>
              <span className="text-[10px] text-surface-600">900</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
