"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "light",
  toggleTheme: () => undefined
});

const THEME_STORAGE_KEY = "factum-theme";
const LEGACY_THEME_STORAGE_KEY = "prooflayer-theme";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved =
    window.localStorage.getItem(THEME_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getPreferredTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark"))
    }),
    [theme]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
