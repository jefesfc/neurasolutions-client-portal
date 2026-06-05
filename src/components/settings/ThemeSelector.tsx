import { PALETTE_PRESETS, type ColorPalette } from "../../hooks/useTheme";
import { cn } from "../../lib/cn";

interface ThemeSelectorProps {
  currentPalette: ColorPalette;
  onSelect: (palette: ColorPalette) => void;
}

export function ThemeSelector({ currentPalette, onSelect }: ThemeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(PALETTE_PRESETS).map(([name, preset]) => {
        const isActive = currentPalette.appBg === preset.appBg && currentPalette.brandAccent === preset.brandAccent;
        return (
          <button
            key={name}
            onClick={() => onSelect(preset)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
              isActive
                ? "border-brand-500 bg-brand-500/10 text-brand-300"
                : "border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600"
            )}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: preset.brandAccent }}
            />
            {name}
          </button>
        );
      })}
    </div>
  );
}
