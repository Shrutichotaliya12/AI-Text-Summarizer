import React, { createContext } from "react";

export interface ThemeContextProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export * from "./TranslationContext";
export * from "./ToastContext";
