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

/**
 * Built-in multi-card combos. Team Sirius's default turns (29, 35, 43, 47, 52, 55, 58) fully overlap with Heirs to the Throne's (35, 43, 52, 58), so running both
 * unmodified would have one card win the shared turn every time and the other silently fall behind. This combo keeps Team Sirius's turns as-is and shifts
 * Heirs to the Throne's four turns one turn earlier (34, 42, 51, 57) - close enough to preserve the intended pacing but clear of every Sirius turn - so both
 * chains can actually progress in the same career. Its Pure Passion turn (60) is untouched since Sirius has none.
 */
export const DATING_SCHEDULE_COMBOS: Record<string, DatingScheduleCombo> = {
    siriusAndThrone: {
        label: "Team Sirius + Heirs to the Throne",
        build: () => [
            createDatingCardSchedule("siriusSenior"),
            { ...createDatingCardSchedule("throneSenior"), preset: DATING_SCHEDULE_CUSTOM, recreationTurns: [34, 42, 51, 57] },
        ],
    },
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
