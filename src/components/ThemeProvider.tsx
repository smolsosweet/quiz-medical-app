"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let savedTheme: Theme | null = null;
    try {
      savedTheme = localStorage.getItem("theme") as Theme | null;
    } catch (e) {
      console.warn("localStorage not available");
    }

    const applyTheme = (newTheme: Theme) => {
      setTheme(newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    };

    if (savedTheme === "light" || savedTheme === "dark") {
      applyTheme(savedTheme);
    } else {
      applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem("theme")) {
          applyTheme(e.matches ? "dark" : "light");
        }
      } catch (err) {}
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {}
  };

  // To avoid SSR hydration mismatch on the theme value while still providing the context,
  // we can provide a default 'light' theme on the server.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
