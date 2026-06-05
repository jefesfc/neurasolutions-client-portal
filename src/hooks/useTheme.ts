import { useState, useEffect } from "react";

export interface ColorPalette {
  appBg: string;
  cardBg: string;
  borderHover: string;
  textPrimary: string;
  textLabel: string;
  textSecondary: string;
  textMuted: string;
  brandAccent: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chart6: string;
  colorSuccess: string;
  colorWarning: string;
  colorDanger: string;
}

export const DEFAULT_PALETTE: ColorPalette = {
  appBg:         "#0f172a",
  cardBg:        "#1e293b",
  borderHover:   "#334155",
  textPrimary:   "#f1f5f9",
  textLabel:     "#cbd5e1",
  textSecondary: "#94a3b8",
  textMuted:     "#64748b",
  brandAccent:   "#6366f1",
  chart1:        "#6366f1",
  chart2:        "#10b981",
  chart3:        "#f59e0b",
  chart4:        "#ef4444",
  chart5:        "#8b5cf6",
  chart6:        "#0ea5e9",
  colorSuccess:  "#10b981",
  colorWarning:  "#f59e0b",
  colorDanger:   "#ef4444",
};

export const PALETTE_PRESETS: Record<string, ColorPalette> = {
  "AIOS Dark": DEFAULT_PALETTE,
  "Deep Navy": {
    ...DEFAULT_PALETTE,
    appBg: "#070d1a", cardBg: "#0f1d33", borderHover: "#1a2d4d",
    brandAccent: "#3b82f6", chart1: "#3b82f6",
  },
  "Midnight": {
    ...DEFAULT_PALETTE,
    appBg: "#0d0d1a", cardBg: "#15152b", borderHover: "#252540",
    brandAccent: "#8b5cf6", chart1: "#8b5cf6",
  },
  "Slate": {
    ...DEFAULT_PALETTE,
    appBg: "#141920", cardBg: "#1c2330", borderHover: "#2d3748",
    brandAccent: "#0ea5e9", chart1: "#0ea5e9",
  },
  "Forest": {
    ...DEFAULT_PALETTE,
    appBg: "#0a1612", cardBg: "#112318", borderHover: "#1a3525",
    brandAccent: "#10b981", chart1: "#10b981",
  },
};

const PALETTE_KEY = "aios-palette";

// ── hex ↔ HSL helpers ────────────────────────────────────────────────
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

export function generateBrandScale(hex: string): Record<string, string> {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return {};
  const [h, s] = hexToHsl(hex);
  return {
    "50":  hslToHex(h, Math.min(s * 0.3, 25), 97),
    "100": hslToHex(h, Math.min(s * 0.45, 35), 93),
    "200": hslToHex(h, Math.min(s * 0.6, 52), 86),
    "300": hslToHex(h, Math.min(s * 0.75, 70), 75),
    "400": hslToHex(h, Math.min(s * 0.88, 80), 65),
    "500": hex,
    "600": hslToHex(h, Math.min(s, 85), 46),
    "700": hslToHex(h, Math.min(s, 82), 37),
    "800": hslToHex(h, Math.min(s * 0.9, 75), 28),
    "900": hslToHex(h, Math.min(s * 0.8, 65), 19),
  };
}

// ── Apply / clear palette to :root ──────────────────────────────────
function applyPalette(p: ColorPalette) {
  const root = document.documentElement;

  // Remove any data-theme preset overrides
  root.removeAttribute("data-theme");

  // Surface remapping
  root.style.setProperty("--color-surface-900", p.appBg);
  root.style.setProperty("--color-surface-800", p.cardBg);
  root.style.setProperty("--color-surface-700", p.borderHover);
  root.style.setProperty("--color-surface-100", p.textPrimary);
  root.style.setProperty("--color-surface-200", p.textPrimary);
  root.style.setProperty("--color-surface-300", p.textLabel);
  root.style.setProperty("--color-surface-400", p.textSecondary);
  root.style.setProperty("--color-surface-500", p.textMuted);

  // Brand scale from accent
  const scale = generateBrandScale(p.brandAccent);
  Object.entries(scale).forEach(([shade, val]) => {
    root.style.setProperty(`--color-brand-${shade}`, val);
  });

  // Charts
  root.style.setProperty("--color-chart-1", p.chart1);
  root.style.setProperty("--color-chart-2", p.chart2);
  root.style.setProperty("--color-chart-3", p.chart3);
  root.style.setProperty("--color-chart-4", p.chart4);
  root.style.setProperty("--color-chart-5", p.chart5);
  root.style.setProperty("--color-chart-6", p.chart6);

  // Status
  root.style.setProperty("--color-positive", p.colorSuccess);
  root.style.setProperty("--color-warning",  p.colorWarning);
  root.style.setProperty("--color-danger",   p.colorDanger);
}

function loadPalette(): ColorPalette {
  try {
    const stored = localStorage.getItem(PALETTE_KEY);
    if (!stored) return DEFAULT_PALETTE;
    return { ...DEFAULT_PALETTE, ...JSON.parse(stored) as Partial<ColorPalette> };
  } catch {
    return DEFAULT_PALETTE;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useTheme() {
  const [palette, setPaletteState] = useState<ColorPalette>(loadPalette);

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);

  function setPalette(updates: Partial<ColorPalette>) {
    setPaletteState((prev) => ({ ...prev, ...updates }));
  }

  function savePalette() {
    localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
  }

  function resetPalette() {
    localStorage.removeItem(PALETTE_KEY);
    setPaletteState(DEFAULT_PALETTE);
  }

  return { palette, setPalette, savePalette, resetPalette };
}
