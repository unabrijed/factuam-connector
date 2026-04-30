"use client";

import { useTheme } from "../app/providers";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-faint)]"
      aria-label="Toggle color theme"
    >
      <span className="text-base">{theme === "dark" ? "☾" : "☀"}</span>
      <span>{theme === "dark" ? "Dark" : "Light"} mode</span>
    </button>
  );
}
