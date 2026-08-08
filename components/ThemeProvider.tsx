"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeName = string;

export interface ThemeOption {
  name: ThemeName;
  label: string;
  desc: string;
  dot: string;
  bg: string;
  group: "Custom" | "daisyUI";
}

export const THEMES: ThemeOption[] = [
  { name: "midnight", label: "Midnight", desc: "Classic dark purple", dot: "#7c5cff", bg: "linear-gradient(135deg,#7c5cff,#3d8bff)", group: "Custom" },
  { name: "pearl", label: "Pearl", desc: "Clean bright surface", dot: "#6a3dff", bg: "linear-gradient(135deg,#eef0f6,#ffffff)", group: "Custom" },
  { name: "aurora", label: "Aurora", desc: "Fresh teal dark", dot: "#2dd4bf", bg: "linear-gradient(135deg,#2dd4bf,#04120f)", group: "Custom" },
  { name: "light", label: "Light", desc: "daisyUI light", dot: "#570df8", bg: "linear-gradient(135deg,#570df8,#fdf6e3)", group: "daisyUI" },
  { name: "dark", label: "Dark", desc: "daisyUI dark", dot: "#641ae6", bg: "linear-gradient(135deg,#641ae6,#1d232a)", group: "daisyUI" },
  { name: "cupcake", label: "Cupcake", desc: "Soft pastel", dot: "#65c3c8", bg: "linear-gradient(135deg,#65c3c8,#fbf7f4)", group: "daisyUI" },
  { name: "bumblebee", label: "Bumblebee", desc: "Warm yellow", dot: "#e0a82e", bg: "linear-gradient(135deg,#e0a82e,#fdf9f1)", group: "daisyUI" },
  { name: "emerald", label: "Emerald", desc: "Fresh green", dot: "#34d399", bg: "linear-gradient(135deg,#34d399,#f5fbf7)", group: "daisyUI" },
  { name: "corporate", label: "Corporate", desc: "Business blue", dot: "#4b6bfb", bg: "linear-gradient(135deg,#4b6bfb,#f9fafb)", group: "daisyUI" },
  { name: "synthwave", label: "Synthwave", desc: "Retro neon", dot: "#ef8f2b", bg: "linear-gradient(135deg,#ef8f2b,#2a0e2e)", group: "daisyUI" },
  { name: "retro", label: "Retro", desc: "70s mustard", dot: "#ef9995", bg: "linear-gradient(135deg,#ef9995,#f4e4ba)", group: "daisyUI" },
  { name: "cyberpunk", label: "Cyberpunk", desc: "Loud neon", dot: "#ff7598", bg: "linear-gradient(135deg,#ff7598,#fff0d9)", group: "daisyUI" },
  { name: "valentine", label: "Valentine", desc: "Sweet pink", dot: "#e96d7b", bg: "linear-gradient(135deg,#e96d7b,#f0d6e8)", group: "daisyUI" },
  { name: "halloween", label: "Halloween", desc: "Spooky orange", dot: "#f28c18", bg: "linear-gradient(135deg,#f28c18,#181a2b)", group: "daisyUI" },
  { name: "garden", label: "Garden", desc: "Botanical", dot: "#d1475e", bg: "linear-gradient(135deg,#d1475e,#e9e7e4)", group: "daisyUI" },
  { name: "forest", label: "Forest", desc: "Deep green", dot: "#1eb854", bg: "linear-gradient(135deg,#1eb854,#161d21)", group: "daisyUI" },
  { name: "aqua", label: "Aqua", desc: "Cool cyan", dot: "#09ecf3", bg: "linear-gradient(135deg,#09ecf3,#16191c)", group: "daisyUI" },
  { name: "lofi", label: "Lofi", desc: "Minimal mono", dot: "#0d0d0d", bg: "linear-gradient(135deg,#0d0d0d,#f5f5f4)", group: "daisyUI" },
  { name: "pastel", label: "Pastel", desc: "Gentle tones", dot: "#d1c1d7", bg: "linear-gradient(135deg,#d1c1d7,#eef4f6)", group: "daisyUI" },
  { name: "fantasy", label: "Fantasy", desc: "Bright story", dot: "#37cdbe", bg: "linear-gradient(135deg,#37cdbe,#f2e9e3)", group: "daisyUI" },
  { name: "wireframe", label: "Wireframe", desc: "Blueprint gray", dot: "#b8b8b8", bg: "linear-gradient(135deg,#b8b8b8,#f2f2f2)", group: "daisyUI" },
  { name: "black", label: "Black", desc: "Pure black", dot: "#343232", bg: "linear-gradient(135deg,#343232,#1c1917)", group: "daisyUI" },
  { name: "luxury", label: "Luxury", desc: "Golden dark", dot: "#ffffff", bg: "linear-gradient(135deg,#ffffff,#0a0909)", group: "daisyUI" },
  { name: "dracula", label: "Dracula", desc: "Vampire violet", dot: "#ff79c6", bg: "linear-gradient(135deg,#ff79c6,#282a36)", group: "daisyUI" },
  { name: "cmyk", label: "CMYK", desc: "Print primaries", dot: "#45aeee", bg: "linear-gradient(135deg,#45aeee,#f2f6f9)", group: "daisyUI" },
  { name: "autumn", label: "Autumn", desc: "Fall reds", dot: "#8c0327", bg: "linear-gradient(135deg,#8c0327,#f1f0ee)", group: "daisyUI" },
  { name: "business", label: "Business", desc: "Corporate navy", dot: "#1c4e80", bg: "linear-gradient(135deg,#1c4e80,#e9eaed)", group: "daisyUI" },
  { name: "acid", label: "Acid", desc: "Electric magenta", dot: "#ff00f4", bg: "linear-gradient(135deg,#ff00f4,#fafaf3)", group: "daisyUI" },
  { name: "lemonade", label: "Lemonade", desc: "Citrus green", dot: "#519903", bg: "linear-gradient(135deg,#519903,#fdfcf0)", group: "daisyUI" },
  { name: "night", label: "Night", desc: "Midnight blue", dot: "#38bdf8", bg: "linear-gradient(135deg,#38bdf8,#111827)", group: "daisyUI" },
  { name: "coffee", label: "Coffee", desc: "Roasty brown", dot: "#db924b", bg: "linear-gradient(135deg,#db924b,#2a2624)", group: "daisyUI" },
  { name: "winter", label: "Winter", desc: "Ice blue", dot: "#0166b8", bg: "linear-gradient(135deg,#0166b8,#eaf3fa)", group: "daisyUI" },
  { name: "dim", label: "Dim", desc: "Subtle dark", dot: "#ff6d3d", bg: "linear-gradient(135deg,#ff6d3d,#212b2b)", group: "daisyUI" },
  { name: "nord", label: "Nord", desc: "Arctic calm", dot: "#88c0d0", bg: "linear-gradient(135deg,#88c0d0,#eef3f6)", group: "daisyUI" },
  { name: "sunset", label: "Sunset", desc: "Warm dusk", dot: "#ff8b4a", bg: "linear-gradient(135deg,#ff8b4a,#2b2027)", group: "daisyUI" },
  { name: "caramellatte", label: "Caramel Latte", desc: "Creamy brown", dot: "#000000", bg: "linear-gradient(135deg,#000000,#f0ede7)", group: "daisyUI" },
  { name: "abyss", label: "Abyss", desc: "Deep sea neon", dot: "#3ddc97", bg: "linear-gradient(135deg,#3ddc97,#051c16)", group: "daisyUI" },
  { name: "silk", label: "Silk", desc: "Calm purple", dot: "#2c2c3a", bg: "linear-gradient(135deg,#2c2c3a,#f3e8f0)", group: "daisyUI" },
];

export const DEFAULT_THEME: ThemeName = "midnight";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
});

export function useTheme() {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "videology-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      const migrated = saved === "light" ? "pearl" : saved;
      if (migrated && THEMES.some((t) => t.name === migrated)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved theme from localStorage after mount
        setThemeState(migrated);
      }
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themeSwitching = "true";
    const id = window.setTimeout(() => {
      delete root.dataset.themeSwitching;
    }, 350);
    return () => window.clearTimeout(id);
  }, [theme]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
