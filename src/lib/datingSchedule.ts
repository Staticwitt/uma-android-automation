import { formatCareerTurn } from "./solver/constants"

/** A named dating-schedule preset that fills the recreation calendar in one tap. */
export interface DatingSchedulePreset {
    /** Display label shown in the preset selector and the settings banner. */
    label: string
    /** Career turns (1-72) pinned for regular recreation outings - one per outing in the chain except the held final. */
    recreationTurns: number[]
    /** Career turn pinned for the single final outing that triggers Pure Passion. */
    purePassionTurn: number
    /** Length of the card's recreation chain - drives the hold-final counter so the last outing is saved for the Pure Passion date. */
    totalOutings: number
}

/** Preset key meaning the user hand-edited the calendar, so no built-in preset turns apply. */
export const DATING_SCHEDULE_CUSTOM = "custom"

/**
 * Built-in dating-schedule presets, keyed by a stable id stored in settings. Each preset is card-specific. The Heirs to the Throne preset holds its final outing
 * for a Pure Passion turn late in the Senior year so the ~3-turn buff lands on Senior summer camp (the timing uma.guide recommends). The Team Sirius preset pins
 * every recreation date and sets no Pure Passion turn, since Pure Passion summer-timing applies only to Heirs to the Throne. Each preset sets `totalOutings` to match its card.
 */
export const DATING_SCHEDULE_PRESETS: Record<string, DatingSchedulePreset> = {
    siriusSenior: {
        label: "Team Sirius",
        recreationTurns: [29, 35, 43, 47, 52, 55, 58],
        purePassionTurn: -1,
        totalOutings: 7,
    },
    throneSenior: {
        label: "Heirs to the Throne - Senior Summer",
        recreationTurns: [35, 43, 52, 58],
        purePassionTurn: 60,
        totalOutings: 4,
    },
}

/**
 * A single support card's dating schedule: which card it applies to (matched by OCR name against the "Choose Recreation Partner"
 * dialog) plus its own pinned turns/Pure Passion turn/outing count. Multiple entries let the bot run separate schedules for
 * separate cards' recreation chains within the same career.
 */
export interface DatingCardSchedule {
    /** Support card name to match (fuzzy, case-insensitive) against each row in the partner dialog. Empty matches any row that no other configured card claimed - the single-card fallback behavior. */
    cardName: string
    /** Selected preset key, or DATING_SCHEDULE_CUSTOM if hand-edited. */
    preset: string
    /** Career turns (1-72) pinned for this card's regular recreation outings. */
    recreationTurns: number[]
    /** Career turn pinned for this card's final outing / Pure Passion activation, or a non-positive value when unset. */
    purePassionTurn: number
    /** Length of this card's recreation chain. */
    totalOutings: number
}

/**
 * Builds a new card schedule seeded from a preset (or blank custom defaults), for the "add card" action in Settings.
 * @param preset The preset key to seed turns from, or DATING_SCHEDULE_CUSTOM for a blank calendar.
 * @param cardName The support card name to match this schedule to. Defaults to blank (matches any unclaimed row).
 * @returns A new DatingCardSchedule.
 */
export const createDatingCardSchedule = (preset: string = "siriusSenior", cardName: string = ""): DatingCardSchedule => {
    const base = DATING_SCHEDULE_PRESETS[preset]
    return {
        cardName,
        preset,
        recreationTurns: base ? [...base.recreationTurns] : [],
        purePassionTurn: base ? base.purePassionTurn : -1,
        totalOutings: base ? base.totalOutings : 1,
    }
}

/** A named combo that adds several pre-staggered cards in one tap, for running multiple recreation chains without their pinned turns colliding. */
export interface DatingScheduleCombo {
    /** Display label shown next to the "Add" button. */
    label: string
    /** Builds the combo's card schedules, each with a blank card name for the user to fill in. */
    build: () => DatingCardSchedule[]
}

/** Builds a single-outing, no-Pure-Passion card entry for `siriusThroneFullRoster` below. */
const singleOutingCard = (cardName: string, turn: number): DatingCardSchedule => ({
    cardName,
    preset: DATING_SCHEDULE_CUSTOM,
    recreationTurns: [turn],
    purePassionTurn: -1,
    totalOutings: 1,
})

/**
 * Built-in multi-card combos. Team Sirius's default turns (29, 35, 43, 47, 52, 55, 58) fully overlap with Heirs to the Throne's (35, 43, 52, 58), so running both
 * unmodified would have one card win the shared turn every time and the other silently fall behind. `siriusAndThrone` keeps Team Sirius's turns as-is and shifts
 * Heirs to the Throne's four turns one turn earlier (34, 42, 51, 57) - close enough to preserve the intended pacing but clear of every Sirius turn - so both
 * chains can actually progress in the same career. Its Pure Passion turn (60) is untouched since Sirius has none.
 *
 * `siriusThroneFullRoster` is a specific 11-card deck/turn plan (9 single-outing cards, plus "Team Sirius" and "The Throne's Assemblage" as their own named
 * cards each with a held Pure Passion outing) matching one particular Trackblazer schedule. Every pinned turn across all 11 cards is distinct.
 */
export const DATING_SCHEDULE_COMBOS: Record<string, DatingScheduleCombo> = {
    siriusAndThrone: {
        label: "Team Sirius + Heirs to the Throne (staggered)",
        build: () => [
            createDatingCardSchedule("siriusSenior"),
            { ...createDatingCardSchedule("throneSenior"), preset: DATING_SCHEDULE_CUSTOM, recreationTurns: [34, 42, 51, 57] },
        ],
    },
    siriusThroneFullRoster: {
        label: "Full Sirius/Throne Roster (11 cards)",
        build: () => [
            singleOutingCard("Silence Suzuka", 18),
            singleOutingCard("Narita Brian", 22),
            singleOutingCard("Symboli Rudolf", 26),
            singleOutingCard("Rice Shower", 28),
            singleOutingCard("Special Week", 32),
            singleOutingCard("Tokai Teio", 36),
            singleOutingCard("Mejiro McQueen", 43),
            singleOutingCard("Tsurumaru Tsuyoshi", 47),
            singleOutingCard("Winning Ticket", 55),
            { cardName: "Team Sirius", preset: DATING_SCHEDULE_CUSTOM, recreationTurns: [], purePassionTurn: 58, totalOutings: 1 },
            { cardName: "The Throne's Assemblage", preset: DATING_SCHEDULE_CUSTOM, recreationTurns: [51], purePassionTurn: 59, totalOutings: 2 },
        ],
    },
}

/**
 * Parses and sanitizes a JSON-imported dating card list (from the Settings "Import Cards" button) into valid `DatingCardSchedule`s. A hand-edited or
 * malformed file must never corrupt `general.datingCards`, so every field falls back to a safe default and entries that aren't objects at all are
 * dropped rather than throwing.
 *
 * @param raw The parsed JSON value - expected to be an array of card-like objects, but any shape is accepted defensively.
 * @returns The sanitized card list. Empty when `raw` isn't an array or contains no usable entries - callers should treat that as an import failure.
 */
export const parseDatingCardsImport = (raw: unknown): DatingCardSchedule[] => {
    if (!Array.isArray(raw)) return []
    return raw
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => {
            const recreationTurns = Array.isArray(item.recreationTurns)
                ? Array.from(new Set(item.recreationTurns.filter((turn): turn is number => typeof turn === "number" && Number.isInteger(turn) && turn >= 1 && turn <= 72))).sort((a, b) => a - b)
                : []
            const purePassionTurn = typeof item.purePassionTurn === "number" && Number.isInteger(item.purePassionTurn) ? item.purePassionTurn : -1
            const totalOutings = typeof item.totalOutings === "number" && Number.isInteger(item.totalOutings) && item.totalOutings > 0 ? item.totalOutings : Math.max(1, recreationTurns.length + 1)
            const preset = typeof item.preset === "string" && item.preset.length > 0 ? item.preset : DATING_SCHEDULE_CUSTOM
            const cardName = typeof item.cardName === "string" ? item.cardName : ""
            return { cardName, preset, recreationTurns, purePassionTurn, totalOutings }
        })
}

/**
 * Formats a single card schedule for the settings log banner.
 * @param card The card schedule to summarize.
 * @returns A one-line summary, e.g. `"Kitasan Black (Team Sirius | Recreation: ... | Pure Passion: none | Outings: 7)"`.
 */
export const formatDatingCardSummary = (card: DatingCardSchedule): string => {
    const label = DATING_SCHEDULE_PRESETS[card.preset]?.label ?? "Custom"
    const name = card.cardName.trim() || "any card"
    const recreation = card.recreationTurns.map(formatCareerTurn).join(", ") || "none"
    const purePassion = card.purePassionTurn > 0 ? formatCareerTurn(card.purePassionTurn) : "none"
    return `${name} (${label} | Recreation: ${recreation} | Pure Passion: ${purePassion} | Outings: ${card.totalOutings})`
}
