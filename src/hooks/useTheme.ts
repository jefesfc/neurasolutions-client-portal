import { useState, useEffect } from "react";

export type AppTheme = "aios-blue" | "midnight-pro" | "arctic" | "custom";

export interface BrandScale {
  "50": string; "100": string; "200": string; "300": string; "400": string;
  "500": string; "600": string; "700": string; "800": string; "900": string;
}

const STORAGE_KEY = "aios-theme";
const CUSTOM_COLORS_KEY = "aios-custom-colors";

const PRESET_SCALES: Record<Exclude<AppTheme, "custom">, BrandScale> = {
  "aios-blue": {
    "50": "#eef2ff", "100": "#e0e7ff", "200": "#c7d2fe", "300": "#a5b4fc",
    "400": "#818cf8", "500": "#6366f1", "600": "#4f46e5", "700": "#4338ca",
    "800": "#3730a3", "900": "#312e81",
  },
  "midnight-pro": {
    "50": "#f5f3ff", "100": "#ede9fe", "200": "#ddd6fe", "300": "#c4b5fd",
    "400": "#a78bfa", "500": "#8b5cf6", "600": "#7c3aed", "700": "#6d28d9",
    "800": "#5b21b6", "900": "#4c1d95",
  },
  "arctic": {
    "50": "#f0f9ff", "100": "#e0f2fe", "200": "#bae6fd", "300": "#7dd3fc",
    "400": "#38bdf8", "500": "#0ea5e9", "600": "#0284c7", "700": "#0369a1",
    "800": "#075985", "900": "#0c4a6e",
  },
};

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function generateBrandScale(primaryHex: string): BrandScale {
  const [h, s] = hexToHsl(primaryHex);
  return {
    "50":  hslToHex(h, Math.min(s * 0.3, 25), 97),
    "100": hslToHex(h, Math.min(s * 0.45, 35), 93),
    "200": hslToHex(h, Math.min(s * 0.6, 52), 86),
    "300": hslToHex(h, Math.min(s * 0.75, 70), 75),
    "400": hslToHex(h, Math.min(s * 0.88, 80), 65),
    "500": primaryHex,
    "600": hslToHex(h, Math.min(s, 85), 46),
    "700": hslToHex(h, Math.min(s, 82), 37),
    "800": hslToHex(h, Math.min(s * 0.9, 75), 28),
    "900": hslToHex(h, Math.min(s * 0.8, 65), 19),
  };
}

function applyBrandScale(scale: BrandScale) {
  const root = document.documentElement;
  (Object.keys(scale) as Array<keyof BrandScale>).forEach((shade) => {
    root.style.setProperty(`--color-brand-${shade}`, scale[shade]);
  });
}

function clearBrandScale() {
  const root = document.documentElement;
  ["50","100","200","300","400","500","600","700","800","900"].forEach((shade) => {
    root.style.removeProperty(`--color-brand-${shade}`);
  });
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(
    () => (localStorage.getItem(STORAGE_KEY) as AppTheme) ?? "aios-blue"
  );

  const [customColors, setCustomColorsState] = useState<BrandScale>(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
      return stored ? (JSON.parse(stored) as BrandScale) : generateBrandScale("#6366f1");
    } catch {
      return generateBrandScale("#6366f1");
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    clearBrandScale();
    if (theme === "custom") {
      root.removeAttribute("data-theme");
      applyBrandScale(customColors);
    } else if (theme === "aios-blue") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, customColors]);

  function setTheme(t: AppTheme) {
    setThemeState(t);
  }

  function setCustomColors(colors: BrandScale) {
    setCustomColorsState(colors);
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
    if (theme !== "custom") setThemeState("custom");
  }

  const activeBrandScale: BrandScale =
    theme === "custom" ? customColors : PRESET_SCALES[theme as Exclude<AppTheme, "custom">] ?? PRESET_SCALES["aios-blue"];

  return { theme, setTheme, customColors, setCustomColors, activeBrandScale, PRESET_SCALES };
}
