"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme, type ThemeOption } from "./ThemeProvider";

const GROUPS: ("Custom" | "daisyUI")[] = ["Custom", "daisyUI"];

export default function ThemeDropdown({
  className = "",
}: {
  className?: string;
}) {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = themes.find((t) => t.name === theme) ?? themes[0];

  const renderOption = (t: ThemeOption) => {
    const active = t.name === theme;
    return (
      <button
        key={t.name}
        role="menuitemradio"
        aria-checked={active}
        onClick={() => {
          setTheme(t.name);
          setOpen(false);
        }}
        title={`${t.label} — ${t.desc}`}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
          active ? "bg-(--surface-3)" : "hover:bg-(--surface-2)"
        }`}
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-(--border-3) shadow-sm shadow-(--shadow)"
          style={{ background: t.bg }}
        />
        <span className="flex-1 truncate text-xs font-medium text-(--fg)">
          {t.label}
        </span>
        {active && <span className="text-xs font-bold text-(--accent-2)">✓</span>}
      </button>
    );
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch theme"
        aria-expanded={open}
        title={`Theme: ${current.label}`}
        className="flex items-center gap-2 rounded-full border border-(--border-2) bg-(--bg-3)/85 px-3 py-1.5 backdrop-blur-xl transition hover:border-(--border-3) active:scale-95"
      >
        <span
          className="h-4 w-4 rounded-full border border-(--border-3) shadow-sm shadow-(--shadow)"
          style={{ background: current.bg }}
        />
        <span className="hidden text-xs font-medium text-(--fg)/80 sm:block">
          {current.label}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`text-(--fg)/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M1 3.5 5 7.5 9 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[70vh] overflow-auto rounded-2xl border border-(--border-2) bg-(--bg-3)/95 p-2 shadow-2xl shadow-(--shadow) backdrop-blur-xl animate-[theme-pop_.18s_ease-out]"
          role="menu"
        >
          {GROUPS.map((group) => {
            const groupThemes = themes.filter((t) => t.group === group);
            if (groupThemes.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-(--fg)/35">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {groupThemes.map(renderOption)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
