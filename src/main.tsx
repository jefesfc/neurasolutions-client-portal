import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { DEFAULT_PALETTE, generateBrandScale } from './hooks/useTheme.ts'

// Apply saved palette immediately (before React renders) to avoid FOUC
try {
  const stored = localStorage.getItem('aios-palette');
  const palette = stored ? { ...DEFAULT_PALETTE, ...JSON.parse(stored) } : DEFAULT_PALETTE;
  const root = document.documentElement;
  root.style.setProperty("--color-surface-900", palette.appBg);
  root.style.setProperty("--color-surface-800", palette.cardBg);
  root.style.setProperty("--color-surface-700", palette.borderHover);
  root.style.setProperty("--color-surface-100", palette.textPrimary);
  root.style.setProperty("--color-surface-200", palette.textPrimary);
  root.style.setProperty("--color-surface-300", palette.textLabel);
  root.style.setProperty("--color-surface-400", palette.textSecondary);
  root.style.setProperty("--color-surface-500", palette.textMuted);
  const scale = generateBrandScale(palette.brandAccent);
  Object.entries(scale).forEach(([shade, val]) => {
    root.style.setProperty(`--color-brand-${shade}`, val);
  });
  root.style.setProperty("--color-chart-1", palette.chart1);
  root.style.setProperty("--color-chart-2", palette.chart2);
  root.style.setProperty("--color-chart-3", palette.chart3);
  root.style.setProperty("--color-chart-4", palette.chart4);
  root.style.setProperty("--color-chart-5", palette.chart5);
  root.style.setProperty("--color-chart-6", palette.chart6);
  root.style.setProperty("--color-positive", palette.colorSuccess);
  root.style.setProperty("--color-warning",  palette.colorWarning);
  root.style.setProperty("--color-danger",   palette.colorDanger);
} catch { /* fail silently */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
