import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Refined teal color scheme for nutrition app (using emerald names)
const tintColorLight = "#009EAD"; // from your teal accent (#009EAD)
const tintColorDark = "#05A9B8"; // from your teal bg (#05A9B8)

export const Colors = {
  light: {
    destructive: "#FF3B30", // from ERROR red (#FF3B30)
    // Core text and backgrounds
    text: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
    background: "#FFFFFF", // WHITE (#FFFFFF)
    tint: tintColorLight,

    // Icons and interactive elements
    icon: "#6E6E73", // ICON (#6E6E73)
    tabIconDefault: "#8E8E93", // TEXT_SECONDARY (#8E8E93)
    tabIconSelected: tintColorLight,
    tabInactive: "#D1D1D6", // DIVIDER (#D1D1D6)

    // Borders and surfaces
    border: "#D1D1D6", // DIVIDER (#D1D1D6)
    card: "#F9F9F9", // CARD (#F9F9F9)
    surface: "#FFFFFF", // WHITE (#FFFFFF)
    surfaceVariant: "#F9F9F9", // CARD (#F9F9F9) as variant
    onSurface: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
    onSurfaceVariant: "#6E6E73", // ICON (#6E6E73)
    outline: "#D1D1D6", // DIVIDER (#D1D1D6)

    // Brand colors
    primary: tintColorLight, // TEAL_ACCENT (#009EAD)
    primaryContainer: "#05A9B8", // TEAL_BG (#05A9B8)
    onPrimary: "#FFFFFF", // WHITE (#FFFFFF)
    onPrimaryContainer: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
    primaryLight: "#34C759", // SUCCESS (#34C759)
    success: "#34C759", // SUCCESS (#34C759)
    disabled: "#D1D1D6", // DIVIDER (#D1D1D6)

    // Emerald variations (using teal values)
    emerald: "#009EAD", // TEAL_ACCENT (#009EAD)
    emerald50: "#F9F9F9", // CARD (#F9F9F9)
    emerald100: "#05A9B8", // TEAL_BG (#05A9B8)
    emerald200: "#34C759", // SUCCESS (#34C759)
    emerald500: "#009EAD", // TEAL_ACCENT (#009EAD)
    emerald600: "#05A9B8", // TEAL_BG (#05A9B8)
    emerald700: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)

    // Secondary text
    textSecondary: "#8E8E93", // TEXT_SECONDARY (#8E8E93)
    textTertiary: "#6E6E73", // ICON (#6E6E73)
    subtext: "#8E8E93", // TEXT_SECONDARY (#8E8E93)
    muted: "#D1D1D6", // DIVIDER (#D1D1D6)

    // Special elements
    shadow: "#000000", // Black shadow
    glass: "rgba(255, 255, 255, 0.85)",
    glassStroke: "rgba(255, 255, 255, 0.3)",
    backdrop: "rgba(0, 0, 0, 0.05)",

    // Status colors
    error: "#FF3B30", // ERROR (#FF3B30)
    warning: "#FF9F0A", // WARNING (#FF9F0A)
    info: "#009EAD", // TEAL_ACCENT (#009EAD)
  },

  dark: {
    destructive: "#FF453A",
    // Core text and backgrounds
    text: "#FFFFFF", // WHITE
    background: "#001A22", // VERY DARK TEAL (slightly tinted)
    tint: tintColorDark,

    // Icons and interactive elements
    icon: "#AEAEB2",
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColorDark,
    tabInactive: "#3A3A3C",

    // Borders and surfaces
    border: "#3A3A3C",
    card: "#2C2C2E", // dark teal card
    surface: "#2C2C2E", // dark teal surface
    surfaceVariant: "#3A3A3C", // dark teal variant
    onSurface: "#FFFFFF",
    onSurfaceVariant: "#AEAEB2",
    outline: "#3A3A3C",

    // Brand colors
    primary: tintColorDark,
    primaryContainer: "#044E57", // dark teal
    onPrimary: "#FFFFFF",
    onPrimaryContainer: "#2C2C2E",
    primaryLight: "#30D158",
    success: "#30D158",
    disabled: "#3A3A3C",

    // Emerald variations (teal colors stay)
    emerald: "#05A9B8",
    emerald50: "#2C2C2E",
    emerald100: "#044E57",
    emerald200: "#30D158",
    emerald500: "#05A9B8",
    emerald600: "#009EAD",
    emerald700: "#6E6E73",

    // Secondary text
    textSecondary: "#AEAEB2",
    textTertiary: "#8E8E93",
    subtext: "#8E8E93",
    muted: "#6E6E73",

    // Special elements
    shadow: "#000000",
    glass: "rgba(44, 44, 46, 0.85)",
    glassStroke: "rgba(58, 58, 60, 0.3)",
    backdrop: "rgba(0, 0, 0, 0.3)",

    // Status colors
    error: "#FF453A",
    warning: "#FF9F0A",
    info: "#05A9B8",
  },
};

export const EmeraldSpectrum = {
  // Teal-based color spectrum (keeping emerald names for compatibility)
  emerald50: "#F9F9F9", // CARD (#F9F9F9)
  emerald100: "#05A9B8", // TEAL_BG (#05A9B8)
  emerald200: "#34C759", // SUCCESS (#34C759)
  emerald300: "#009EAD", // TEAL_ACCENT (#009EAD)
  emerald400: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
  emerald500: "#009EAD", // TEAL_ACCENT (#009EAD)
  emerald600: "#05A9B8", // TEAL_BG (#05A9B8)
  emerald700: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
  emerald800: "#044E57", // darker teal (#044E57)
  emerald900: "#2C2C2E", // dark card (#2C2C2E)
  emerald950: "#000000", // black for deep accents

  // Semantic mappings (still using emerald names for compatibility)
  fresh: "#009EAD", // TEAL_ACCENT (#009EAD)
  healthy: "#05A9B8", // TEAL_BG (#05A9B8)
  natural: "#34C759", // SUCCESS (#34C759)
  organic: "#F9F9F9", // CARD (#F9F9F9)
  growth: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
  vitality: "#009EAD", // TEAL_ACCENT (#009EAD)

  // Additional mappings
  nutrition: "#009EAD", // TEAL_ACCENT (#009EAD)
  supplement: "#05A9B8", // TEAL_BG (#05A9B8)
  goal: "#2B2B2B", // TEXT_PRIMARY (#2B2B2B)
  progress: "#34C759", // SUCCESS (#34C759)
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof Colors.light | typeof Colors.dark;
  theme: "light" | "dark";
  emeraldSpectrum: typeof EmeraldSpectrum;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === "dark");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme_preference");
      if (savedTheme !== null) {
        setIsDark(savedTheme === "dark");
      } else {
        // Use system preference if no saved preference
        setIsDark(systemColorScheme === "dark");
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
      // Fallback to system preference on error
      setIsDark(systemColorScheme === "dark");
    } finally {
      setIsLoaded(true);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem(
        "theme_preference",
        newTheme ? "dark" : "light"
      );
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const colors = isDark ? Colors.dark : Colors.light;
  const theme = isDark ? "dark" : "light";

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        colors,
        theme,
        emeraldSpectrum: EmeraldSpectrum,
        isLoaded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
