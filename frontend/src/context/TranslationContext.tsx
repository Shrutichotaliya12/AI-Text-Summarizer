import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import gu from "@/locales/gu.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import mr from "@/locales/mr.json";
import ta from "@/locales/ta.json";
import te from "@/locales/te.json";
import kn from "@/locales/kn.json";
import ml from "@/locales/ml.json";
import pa from "@/locales/pa.json";
import zh from "@/locales/zh.json";
import ja from "@/locales/ja.json";
import ar from "@/locales/ar.json";
import ru from "@/locales/ru.json";

export type LanguageCode = "en" | "hi" | "gu" | "de" | "fr" | "es" | "mr" | "ta" | "te" | "kn" | "ml" | "pa" | "zh" | "ja" | "ar" | "ru";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  hi: "हिन्दी (Hindi)",
  gu: "ગુજરાતી (Gujarati)",
  de: "Deutsch (German)",
  fr: "Français (French)",
  es: "Español (Spanish)",
  mr: "मराठी (Marathi)",
  ta: "தமிழ் (Tamil)",
  te: "తెలుగు (Telugu)",
  kn: "ಕನ್ನಡ (Kannada)",
  ml: "മലയാളം (Malayalam)",
  pa: "ਪੰਜਾਬੀ (Punjabi)",
  zh: "中文 (Chinese)",
  ja: "日本語 (Japanese)",
  ar: "العربية (Arabic)",
  ru: "Русский (Russian)"
};

const dictionaries: Record<LanguageCode, Record<string, string>> = { en, hi, gu, de, fr, es, mr, ta, te, kn, ml, pa, zh, ja, ar, ru };

interface TranslationContextType {
  locale: LanguageCode;
  setLocale: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<LanguageCode>(() => {
    // Restore from localStorage on first mount
    const saved = localStorage.getItem("language") as LanguageCode;
    return saved && dictionaries[saved] ? saved : "en";
  });

  // Sync HTML lang attribute on mount and change
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((lang: LanguageCode) => {
    localStorage.setItem("language", lang);
    setLocaleState(lang);
  }, []);

  const t = useCallback((key: string): string => {
    return dictionaries[locale]?.[key] || dictionaries.en[key] || key;
  }, [locale]);

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
};
