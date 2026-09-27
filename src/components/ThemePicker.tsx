"use client";

import { useEffect, useState } from "react";

export const THEMES = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "sepia", name: "Sepia" },
  { id: "contrast", name: "High contrast" },
  { id: "system", name: "Match my device" },
] as const;

export type ThemeChoice = (typeof THEMES)[number]["id"];

export const THEME_KEY = "ceo-voice.theme";

/**
 * Runs in <head> before first paint so a saved theme never flashes light first.
 * Keep in sync with `apply()` below.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"light";if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;

function apply(choice: ThemeChoice) {
  const resolved = choice === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
  document.documentElement.dataset.theme = resolved;
}

export function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeChoice | null;
      if (saved && THEMES.some((t) => t.id === saved)) setChoice(saved);
    } catch {
      /* storage unavailable: stay on the default */
    }
  }, []);

  // "Match my device" follows the OS setting live, e.g. when it switches to dark at sunset.
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const change = (next: ThemeChoice) => {
    setChoice(next);
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* non-critical */
    }
  };

  return (
    <label className="flex items-center gap-2 text-sm text-graphite-400">
      <span className="sr-only sm:not-sr-only">Theme</span>
      <select
        value={choice}
        onChange={(e) => change(e.target.value as ThemeChoice)}
        className="rounded-md border border-graphite-700 bg-graphite-950 px-2 py-1 text-sm text-graphite-100 focus:border-gold-600 focus:outline-none"
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
