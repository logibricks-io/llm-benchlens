/**
 * Minimal i18n: one context, one hook, two packs.
 *
 * Deliberately not react-i18next. We need exactly one thing — swap a key for a
 * string in one of two languages — and hand-rolling it buys two properties the
 * library cannot give us: `t` is a plain typed object so key access is
 * autocompleted and typo-checked at compile time, and there is no async
 * loading state to design around.
 *
 * Default is English per requirement; the choice persists in localStorage and
 * also drives <html lang> for correct font fallback and screen-reader voice.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type Dict } from "./en";
import { zh } from "./zh";

export type Lang = "en" | "zh";

const PACKS: Record<Lang, Dict> = { en, zh };
/* Namespaced with a dot to match `benchlens.theme`; the earlier
   `benchlens-lang` spelling is still read so a stored choice survives. */
const STORAGE_KEY = "benchlens.lang";
const LEGACY_STORAGE_KEY = "benchlens-lang";

type I18nValue = {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /**
   * Every pack, not just the active one. The command palette searches across
   * languages so a bilingual user can type "矩阵" with the English UI on.
   */
  allDicts: Dict[];
};

const ALL_DICTS: Dict[] = [en, zh];

const I18nContext = createContext<I18nValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  /*
   * An explicit ?lang= wins over the stored choice. That makes a specific
   * rendering shareable ("here is the English view of this benchmark") and lets
   * a fresh browser context land in the right language without first having to
   * write to localStorage and navigate — which is exactly what made the
   * screenshot harness unreliable.
   */
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param === "zh" || param === "en") return param;
  const stored =
    window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  return stored === "zh" || stored === "en" ? stored : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Private browsing can reject writes; language just won't persist.
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "zh" : "en");
  }, [lang, setLang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, t: PACKS[lang], setLang, toggleLang, allDicts: ALL_DICTS }),
    [lang, setLang, toggleLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Shorthand for the common case of only needing the dictionary. */
export function useT(): Dict {
  return useI18n().t;
}

export { en, zh };
export type { Dict };
