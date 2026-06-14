import type { Settings } from "../context/BotStateContext"
import {
    aptitudesFromCharacterPreset,
    buildAllowedEpithetNamesForParentBundle,
    findCharacterPresetEntry,
    findParentFarmingCharacterBundle,
    type ParentFarmingCharacterBundle,
} from "./parentFarmingCharacterBundles"
import {
    applyParentFarmingGoalPresetToRacing,
    applyParentFarmingGoalPresetToTraining,
    findParentFarmingGoalPreset,
    type ParentFarmingGoalPreset,
    type ParentFarmingGoalPresetApplyOptions,
} from "./parentFarmingGoalPresets"
import {
    buildParentFarmingRacingSettings,
    buildParentFarmingTrainingSettings,
    PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY,
    PARENT_FARMING_GOAL_RACING_BASE,
    PARENT_FARMING_RESOLVER_REVISION,
} from "./parentFarmingConstants"

export { PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY, PARENT_FARMING_RESOLVER_REVISION } from "./parentFarmingConstants"

export interface ResolveParentFarmingOptions {
    /** Epithet names allowed for the active scenario + character when merging targets. */
    allowedEpithetNames?: Set<string>
    /** When false, goal epithets replace existing targets (bundles). When true, merge with manual picks. */
    mergeEpithets?: boolean
}

const defaultAllowedEpithetNames = (settings: Settings): Set<string> =>
    buildAllowedEpithetNamesForParentBundle(
        settings.general?.scenario || "Trackblazer",
        settings.racing.smartRaceSolverCharacterPreset || "Special Week",
    )

/**
 * Applies parent-farming general, skills, racing, and training slices from stored preset keys.
 * When mode is on but no goal key is stored, uses [PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY].
 */
export const resolveParentFarmingSettings = (settings: Settings, options?: ResolveParentFarmingOptions): Settings => {
    if (!settings.racing.enableParentFarmingMode) {
        return settings
    }

    const bundle = settings.racing.parentFarmingBundleKey
        ? findParentFarmingCharacterBundle(settings.racing.parentFarmingBundleKey)
        : undefined
    const goalKey =
        settings.racing.parentFarmingGoalPresetKey || bundle?.goalPresetKey || PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY
    const goalPreset = findParentFarmingGoalPreset(goalKey)

    const general = {
        ...settings.general,
        enableStopBeforeFinals: false,
    }
    const skills = {
        ...settings.skills,
        enableSkillPointCheck: false,
    }

    if (!goalPreset) {
        return {
            ...settings,
            general,
            skills,
            racing: {
                ...settings.racing,
                ...buildParentFarmingRacingSettings(settings.racing),
                parentFarmingResolverRevision: PARENT_FARMING_RESOLVER_REVISION,
            },
            training: {
                ...settings.training,
                ...buildParentFarmingTrainingSettings(settings.training),
            },
        }
    }

    const mergeEpithets = options?.mergeEpithets ?? !bundle
    let racingSeed: Settings["racing"] = { ...settings.racing }

    if (bundle) {
        const characterPreset = findCharacterPresetEntry(bundle.characterName)
        if (characterPreset) {
            racingSeed = {
                ...racingSeed,
                smartRaceSolverCharacterPreset: characterPreset.name,
                smartRaceSolverAptitudes: JSON.stringify(aptitudesFromCharacterPreset(characterPreset)),
                smartRaceSolverManualLocks: "{}",
            }
        }
    }

    const allowedNames =
        options?.allowedEpithetNames ??
        (bundle
            ? buildAllowedEpithetNamesForParentBundle(settings.general?.scenario || "Trackblazer", bundle.characterName)
            : defaultAllowedEpithetNames(settings))

    const goalRacing = applyParentFarmingGoalPresetToRacing(racingSeed, goalPreset, allowedNames, { mergeEpithets })

    let smartRaceSolverWeights = goalRacing.smartRaceSolverWeights
    if (bundle?.weightOverrides && smartRaceSolverWeights) {
        try {
            const parsed = JSON.parse(smartRaceSolverWeights)
            smartRaceSolverWeights = JSON.stringify({ ...parsed, ...bundle.weightOverrides })
        } catch {
            // Keep goal preset weights if parsing fails.
        }
    }

    const trainingPartial: Partial<Settings["training"]> = {
        ...applyParentFarmingGoalPresetToTraining(settings.training, goalPreset),
        ...(bundle?.trainingOverrides ?? {}),
    }

    return {
        ...settings,
        general,
        skills,
        racing: {
            ...racingSeed,
            ...PARENT_FARMING_GOAL_RACING_BASE,
            ...goalRacing,
            smartRaceSolverWeights: smartRaceSolverWeights ?? goalRacing.smartRaceSolverWeights,
            enableParentFarmingMode: true,
            parentFarmingGoalPresetKey: goalPreset.key,
            parentFarmingGoalPresetLabel: goalPreset.label,
            parentFarmingBundleKey: bundle?.key ?? "",
            parentFarmingBundleLabel: bundle?.label ?? "",
            parentFarmingResolverRevision: PARENT_FARMING_RESOLVER_REVISION,
        },
        training: {
            ...settings.training,
            ...trainingPartial,
        },
    }
}

/** Enables parent farming and resolves slices from stored keys or the default goal preset. */
export const enableParentFarmingMode = (settings: Settings, options?: ResolveParentFarmingOptions): Settings =>
    resolveParentFarmingSettings(
        {
            ...settings,
            racing: {
                ...settings.racing,
                enableParentFarmingMode: true,
            },
        },
        options,
    )

/** Applies a goal preset by storing its key and re-resolving all parent-farming slices. */
export const enableParentFarmingGoalPreset = (
    settings: Settings,
    goalPresetKey: string,
    options?: ResolveParentFarmingOptions,
): Settings => {
    const preset = findParentFarmingGoalPreset(goalPresetKey)
    if (!preset) return settings

    return resolveParentFarmingSettings(
        {
            ...settings,
            racing: {
                ...settings.racing,
                enableParentFarmingMode: true,
                parentFarmingGoalPresetKey: preset.key,
                parentFarmingGoalPresetLabel: preset.label,
                parentFarmingBundleKey: "",
                parentFarmingBundleLabel: "",
            },
        },
        { ...options, mergeEpithets: options?.mergeEpithets ?? true },
    )
}

/** Applies a character bundle by storing its keys and re-resolving all parent-farming slices. */
export const enableParentFarmingCharacterBundle = (settings: Settings, bundleKey: string): Settings => {
    const bundle = findParentFarmingCharacterBundle(bundleKey)
    if (!bundle) return settings

    const goalPreset = findParentFarmingGoalPreset(bundle.goalPresetKey)
    if (!goalPreset) return settings

    return resolveParentFarmingSettings(
        {
            ...settings,
            racing: {
                ...settings.racing,
                enableParentFarmingMode: true,
                parentFarmingBundleKey: bundle.key,
                parentFarmingBundleLabel: bundle.label,
                parentFarmingGoalPresetKey: goalPreset.key,
                parentFarmingGoalPresetLabel: goalPreset.label,
            },
        },
        { mergeEpithets: false },
    )
}

/** Applies racing and training from a goal preset object (UI grid handlers). */
export const applyParentFarmingGoalPreset = (
    settings: Settings,
    preset: ParentFarmingGoalPreset,
    allowedNames?: Set<string>,
    options?: ParentFarmingGoalPresetApplyOptions,
): Settings =>
    enableParentFarmingGoalPreset(settings, preset.key, {
        allowedEpithetNames: allowedNames,
        mergeEpithets: options?.mergeEpithets ?? true,
    })

/** Applies a one-tap character + goal bundle. */
export const applyParentFarmingCharacterBundle = (settings: Settings, bundle: ParentFarmingCharacterBundle): Settings =>
    enableParentFarmingCharacterBundle(settings, bundle.key)
