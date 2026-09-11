"use client";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";
export function ThemeToggle({
  initialTheme,
}: {
  initialTheme: "light" | "dark";
}) {
  const [theme, setTheme] = useState(initialTheme);
  return (
    <button
      className="theme-toggle secondary"
      aria-label={
        theme === "light" ? "Qorong‘i rejimga o‘tish" : "Yorug‘ rejimga o‘tish"
      }
      onClick={() => {
        const next = theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        document.cookie = `orient-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        setTheme(next);
      }}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      <span>{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
