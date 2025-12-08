import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ColorTheme = "light" | "mocha" | "overkast" | "true-night" | "gilded-meadow";
export type GrainIntensity = "off" | "low" | "medium" | "high";
export type WindowTheme = "neomorphic" | "tactical";

export interface ThemeTokens {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
  shadowDark: string;
  shadowLight: string;
  highlight: string;
  muted: string;
}

interface ThemeContextValue {
  colorTheme: ColorTheme;
  windowTheme: WindowTheme;
  grainIntensity: GrainIntensity;
  tokens: ThemeTokens;
  setColorTheme: (theme: ColorTheme) => void;
  setWindowTheme: (theme: WindowTheme) => void;
  setGrainIntensity: (grain: GrainIntensity) => void;
}

const STORAGE_KEYS = {
  colorTheme: "color-theme",
  windowTheme: "window-theme",
  grainIntensity: "grain-intensity",
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const colorThemes: Record<
  ColorTheme,
  { bg: string; text: string; accent: string; darkShadow: string; lightShadow: string; bright: string }
> = {
  light: {
    bg: "#EBECF0",
    text: "#6C7587",
    accent: "#8992A5",
    darkShadow: "#d1d9e6",
    lightShadow: "#FFFFFF",
    bright: "#a8b2c7",
  },
  mocha: {
    bg: "#1c1917",
    text: "#fafaf9",
    accent: "#a8a29e",
    darkShadow: "#0a0908",
    lightShadow: "rgba(255,255,255,0.05)",
    bright: "#c4bfbb",
  },
  overkast: {
    bg: "#B8B8B8",
    text: "#3A3A3A",
    accent: "#5A5A5A",
    darkShadow: "#9A9A9A",
    lightShadow: "#D6D6D6",
    bright: "#7A7A7A",
  },
  "true-night": {
    bg: "#1a1a1a",
    text: "#bfbfbf",
    accent: "#a6a6a6",
    darkShadow: "#0d0d0d",
    lightShadow: "rgba(255,255,255,0.04)",
    bright: "#c2c2c2",
  },
  "gilded-meadow": {
    bg: "#f6f6bd",
    text: "#5f5f26",
    accent: "#abab72",
    darkShadow: "#d0d097",
    lightShadow: "#ffffe3",
    bright: "#d0d097",
  },
};

const tacticalTokens: ThemeTokens = {
  background: "#0a0f1e",
  surface: "#0f1528",
  textPrimary: "#f5f6ff",
  textSecondary: "#9cb3ff",
  accent: "#5c93ff",
  border: "#1f2435",
  shadowDark: "#070a12",
  shadowLight: "#1c2540",
  highlight: "#c4cff6",
  muted: "#7b89b4",
};

const computeTokens = (colorTheme: ColorTheme, windowTheme: WindowTheme): ThemeTokens => {
  if (windowTheme === "tactical") {
    return tacticalTokens;
  }

  const base = colorThemes[colorTheme];
  return {
    background: base.bg,
    surface: base.bg,
    textPrimary: base.text,
    textSecondary: base.bright,
    accent: base.accent,
    border: base.darkShadow,
    shadowDark: base.darkShadow,
    shadowLight: base.lightShadow,
    highlight: base.bright,
    muted: base.accent,
  };
};

const persistValue = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[ThemeContext] failed to persist ${key}`);
  }
};

const isColorTheme = (value: string): value is ColorTheme =>
  ["light", "mocha", "overkast", "true-night", "gilded-meadow"].includes(value);

const isWindowTheme = (value: string): value is WindowTheme =>
  ["neomorphic", "tactical"].includes(value);

const isGrainIntensity = (value: string): value is GrainIntensity =>
  ["off", "low", "medium", "high"].includes(value);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[ThemeProvider] Component initializing');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("light");
  const [windowTheme, setWindowThemeState] = useState<WindowTheme>("neomorphic");
  const [grainIntensity, setGrainIntensityState] = useState<GrainIntensity>("medium");

  useEffect(() => {
    console.log('[ThemeProvider] useEffect triggered - loading theme settings');
    let mounted = true;

    const loadSettings = async () => {
      try {
        console.log('[ThemeProvider] Fetching theme settings from AsyncStorage');
        const [storedColor, storedWindow, storedGrain] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.colorTheme),
          AsyncStorage.getItem(STORAGE_KEYS.windowTheme),
          AsyncStorage.getItem(STORAGE_KEYS.grainIntensity),
        ]);

        console.log('[ThemeProvider] Loaded settings:', { storedColor, storedWindow, storedGrain });

        if (mounted && storedColor && isColorTheme(storedColor)) {
          setColorThemeState(storedColor);
        }
        if (mounted && storedWindow && isWindowTheme(storedWindow)) {
          setWindowThemeState(storedWindow);
        }
        if (mounted && storedGrain && isGrainIntensity(storedGrain)) {
          setGrainIntensityState(storedGrain);
        }
        console.log('[ThemeProvider] Theme settings applied successfully');
      } catch (error) {
        console.warn("[ThemeContext] failed to load theme settings", error);
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    persistValue(STORAGE_KEYS.colorTheme, theme);
  }, []);

  const setWindowTheme = useCallback((theme: WindowTheme) => {
    setWindowThemeState(theme);
    persistValue(STORAGE_KEYS.windowTheme, theme);
  }, []);

  const setGrainIntensity = useCallback((grain: GrainIntensity) => {
    setGrainIntensityState(grain);
    persistValue(STORAGE_KEYS.grainIntensity, grain);
  }, []);

  const tokens = useMemo(() => computeTokens(colorTheme, windowTheme), [colorTheme, windowTheme]);

  const value = useMemo(
    () => ({
      colorTheme,
      windowTheme,
      grainIntensity,
      tokens,
      setColorTheme,
      setWindowTheme,
      setGrainIntensity,
    }),
    [colorTheme, windowTheme, grainIntensity, tokens, setColorTheme, setWindowTheme, setGrainIntensity]
  );

  console.log('[ThemeProvider] Rendering with theme:', colorTheme, 'window:', windowTheme);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
