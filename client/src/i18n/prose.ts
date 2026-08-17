import { useI18n } from "./index";

/**
 * Picks the language variant of a benchmark's prose fields.
 *
 * These three fields are *content*, not UI copy — each of the 95 benchmarks has
 * its own caveat, scenario note and description — so they live in the database
 * with an English column alongside the Chinese one rather than in the dictionary.
 *
 * Falls back to the Chinese text when a translation is missing, on the grounds
 * that showing the reader something true in the wrong language beats showing
 * them nothing.
 */
export function useProse() {
  const { lang } = useI18n();
  return function prose(
    row: {
      scenarioMapping?: string | null;
      interpretationCaveat?: string | null;
      notes?: string | null;
      scenarioMappingEn?: string | null;
      interpretationCaveatEn?: string | null;
      notesEn?: string | null;
    } | null
    | undefined,
    field: "scenarioMapping" | "interpretationCaveat" | "notes",
  ): string | null {
    if (!row) return null;
    if (lang === "en") {
      const en = row[`${field}En` as const];
      if (en) return en;
    }
    return row[field] ?? null;
  };
}
