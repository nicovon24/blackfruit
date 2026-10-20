"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, getClient, getServer);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const currentTheme = mounted ? (theme === "system" ? resolvedTheme : theme) ?? "light" : "light";
  const isDark = currentTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label = `Cambiar a modo ${nextTheme === "dark" ? "oscuro" : "claro"}`;
  const Icon = isDark ? Moon : Sun;

  return <button type="button" className="theme-toggle" title={label} aria-label={label} aria-pressed={isDark} disabled={!mounted} onClick={() => setTheme(nextTheme)}><Icon size={18} aria-hidden="true" /></button>;
}
