import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

const STORAGE_KEY = "benchlens.theme";

/**
 * Dark is the default. The token layer puts the dark ramp on `:root` and the
 * light ramp on `.light`, so BOTH themes need an explicit class — the previous
 * implementation only added `.dark` and relied on "no class" meaning light,
 * which silently broke the moment the defaults were inverted.
 */
export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (!switchable) return defaultTheme;
    /*
     * `?theme=` beats the stored preference, mirroring `?lang=`: it makes a
     * given rendering linkable and gives a fresh browser context a way to start
     * in the requested theme without a write-then-navigate dance.
     */
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("theme");
      if (param === "light" || param === "dark") return param;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      /* private mode — fall through to the default */
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    if (switchable) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* ignore */
      }
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => setTheme(prev => (prev === "light" ? "dark" : "light"))
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
