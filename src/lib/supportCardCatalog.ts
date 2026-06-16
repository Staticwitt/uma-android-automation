/**
 * Support card type labels for deck recommendations.
 * Types mirror in-game support roles (Speed / Stamina / Power / Guts / Wit / Groupe).
 * Names must match keys in `src/data/supports.json`.
 *
 * Primary source: `supportCardTypes.json` (auto-generated from GameTora manifest).
 * Run `python scripts/data-scraper/manifest_scraper.py` or the full scraper to refresh.
 */
import generatedTypes from "../data/supportCardTypes.json"

export type SupportCardType = "Speed" | "Stamina" | "Power" | "Guts" | "Wit" | "Groupe"

export interface SupportCardMeta {
    name: string
    type: SupportCardType
}

/** Hand-maintained overrides when manifest type differs from in-app OCR expectations. */
const CATALOG_OVERRIDES: Record<string, SupportCardMeta> = {}

export const SUPPORT_CARD_CATALOG: Record<string, SupportCardMeta> = {
    ...(generatedTypes as Record<string, SupportCardMeta>),
    ...CATALOG_OVERRIDES,
}

export const supportCardType = (name: string): SupportCardType | undefined => SUPPORT_CARD_CATALOG[name]?.type
