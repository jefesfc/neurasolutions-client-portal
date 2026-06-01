import { useState, useEffect } from "react";

export type AppTheme = "aios-blue" | "midnight-pro" | "arctic";

const STORAGE_KEY = "aios-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(
    () => (localStorage.getItem(STORAGE_KEY) as AppTheme) ?? "aios-blue"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "aios-blue") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
