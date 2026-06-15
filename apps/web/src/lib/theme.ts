export type AppTheme = "light" | "dark";

/**
 * Returns the initial theme for client components.
 * The application defaults to light mode; only an explicit stored preference
 * can activate dark mode on first load.
 */
export function getInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem("theme") as AppTheme | null;
    if (stored === "dark" || stored === "light") return stored;
    return "light";
  } catch {
    return "light";
  }
}
