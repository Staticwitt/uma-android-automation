import type { Settings } from "../context/BotStateContext"
import { excludeTraineeFromSupportList, substituteTraineeInOwnedDeck } from "./parentFarmingSupportBorrow"
import { findSupportBorrowPreset } from "./supportBorrowPresets"
import { parseOwnedSupportCards } from "./recommendSupportDeck"

/** Racing flags for hands-off career selection (equip → borrow → parents → start). */
export const PARENT_FARMING_CAREER_AUTOMATION_FLAGS: Pick<
    Settings["racing"],
    "enableAutoEquipOwnedSupportDeck" | "enableAutoBorrowSupportCard" | "enableAutoSelectLegacyParents" | "enableAutoStartCareer"
> = {
    enableAutoEquipOwnedSupportDeck: true,
    enableAutoBorrowSupportCard: true,
    enableAutoSelectLegacyParents: true,
    enableAutoStartCareer: true,
}

export type CareerAutomationStepStatus = "ready" | "warning" | "off"

export interface CareerAutomationStep {
    id: string
    label: string
    status: CareerAutomationStepStatus
    detail: string
}

const parseStringList = (json: string | undefined): string[] => {
    try {
        const parsed = JSON.parse(json || "[]")
        return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : []
    } catch {
        return []
    }
}

export const isFullCareerAutomationEnabled = (settings: Settings): boolean => {
    const { racing } = settings
    return (
        racing.enableAutoEquipOwnedSupportDeck &&
        racing.enableAutoBorrowSupportCard &&
        racing.enableAutoSelectLegacyParents &&
        racing.enableAutoStartCareer
    )
}

/** Ordered checklist for career-selection automation UX. */
export const getCareerAutomationSteps = (settings: Settings): CareerAutomationStep[] => {
    const { racing } = settings
    const ownedDeck = parseOwnedSupportCards(racing.supportDeckOwnedCards)
    const borrowList = parseStringList(racing.supportBorrowPreferredCards)
    const hasSetup = Boolean(racing.parentFarmingBundleKey || racing.parentFarmingGoalPresetKey)

    const steps: CareerAutomationStep[] = [
        {
            id: "setup",
            label: "Character setup",
            status: hasSetup ? "ready" : "warning",
            detail: hasSetup ? "Preset or bundle applied" : "Pick a character setup or goal preset first",
        },
        {
            id: "owned-deck",
            label: "Owned support slots",
            status: ownedDeck.length >= 4 ? "ready" : ownedDeck.length > 0 ? "warning" : "warning",
            detail:
                ownedDeck.length >= 4
                    ? ownedDeck.slice(0, 4).join(" · ")
                    : ownedDeck.length > 0
                      ? `${ownedDeck.length}/4 slots saved — apply full deck from recommendations`
                      : "Apply full deck or add owned inventory for auto-equip",
        },
        {
            id: "auto-equip",
            label: "Auto-equip owned deck",
            status: !racing.enableAutoEquipOwnedSupportDeck ? "off" : ownedDeck.length === 0 ? "warning" : "ready",
            detail: racing.enableAutoEquipOwnedSupportDeck
                ? ownedDeck.length === 0
                    ? "On, but no owned slots saved yet"
                    : "Equips saved slots at career selection"
                : "Off — equip owned supports manually",
        },
        {
            id: "auto-borrow",
            label: "Auto-borrow friend support",
            status: !racing.enableAutoBorrowSupportCard ? "off" : borrowList.length === 0 ? "warning" : "ready",
            detail: racing.enableAutoBorrowSupportCard
                ? borrowList.length > 0
                    ? `Priority: ${borrowList.slice(0, 3).join(" → ")}${borrowList.length > 3 ? " …" : ""}`
                    : "On, but borrow list is empty"
                : "Off",
        },
        {
            id: "legacy-parents",
            label: "Auto-select parent pair",
            status: racing.enableAutoSelectLegacyParents ? "ready" : "off",
            detail: racing.enableAutoSelectLegacyParents
                ? parseStringList(racing.legacyParentPreferredPair).length > 0
                    ? "OCR preferred pair, else factor scoring"
                    : racing.legacyParentSelectionStrategy !== "Default"
                      ? `Factor scoring (${racing.legacyParentSelectionStrategy}) or Auto-Select`
                      : "In-game Auto-Select"
                : "Off",
        },
        {
            id: "auto-start",
            label: "Auto-start career",
            status: racing.enableAutoStartCareer ? "ready" : "off",
            detail: racing.enableAutoStartCareer ? "Taps Start Career on final confirmation" : "Off — tap Start Career yourself",
        },
    ]

    if (racing.enableParentFarmingMultiRun) {
        const count = racing.parentFarmingMultiRunCount
        let detail = count <= 0 ? "Runs until you stop the bot" : `${count} career${count === 1 ? "" : "s"} per bot session`
        if (racing.enableParentFarmingStopOnQualityTarget) {
            detail += ` · stop at quality ≥ ${racing.parentFarmingQualityTargetScore}`
        }
        steps.push({
            id: "multi-run",
            label: "Multi-run session",
            status: "ready",
            detail,
        })
    }

    return steps
}

/** True when the user can start the bot on career selection with minimal manual steps. */
export const isCareerSelectionReady = (settings: Settings): boolean => {
    if (!settings.racing.enableParentFarmingMode) return false
    const steps = getCareerAutomationSteps(settings)
    const setup = steps.find((step) => step.id === "setup")
    if (setup?.status === "warning") return false
    const hasBorrowOrOwned =
        parseOwnedSupportCards(settings.racing.supportDeckOwnedCards).length > 0 ||
        parseStringList(settings.racing.supportBorrowPreferredCards).length > 0
    return hasBorrowOrOwned && isFullCareerAutomationEnabled(settings)
}

/** One-line summary for chips and navigation subtitles. */
export const formatCareerAutomationSummary = (settings: Settings): string => {
    if (!settings.racing.enableParentFarmingMode) return "Off"
    if (isCareerSelectionReady(settings)) {
        return settings.racing.enableParentFarmingMultiRun ? "Full automation · multi-run" : "Full automation · ready"
    }
    const enabledCount = [
        settings.racing.enableAutoEquipOwnedSupportDeck,
        settings.racing.enableAutoBorrowSupportCard,
        settings.racing.enableAutoSelectLegacyParents,
        settings.racing.enableAutoStartCareer,
    ].filter(Boolean).length
    if (enabledCount === 0) return "On — enable career automation"
    return `On · ${enabledCount}/4 automation steps`
}

/** Applies saved deck fields plus full career automation toggles (Apply full deck). */
export const buildFullDeckApplyRacingPatch = (
    racing: Settings["racing"],
    ownedCards: string[],
    borrowOrder: string[],
    characterName: string,
    aptitudesJson?: string,
): Settings["racing"] => {
    const alternates = borrowOrder.length > 0 ? borrowOrder : findSupportBorrowPreset(racing.parentFarmingGoalPresetKey || "g1-fans")
    const safeOwned = substituteTraineeInOwnedDeck(ownedCards, characterName, alternates)
    const safeBorrow = excludeTraineeFromSupportList(borrowOrder, characterName, alternates)
    return {
        ...racing,
        ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
        supportBorrowPreferredCards: JSON.stringify(safeBorrow),
        supportDeckOwnedCards: JSON.stringify(safeOwned),
        ownedSupportCards: JSON.stringify(safeOwned),
        smartRaceSolverCharacterPreset: characterName,
        ...(aptitudesJson ? { smartRaceSolverAptitudes: aptitudesJson } : {}),
    }
}
