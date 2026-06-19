import { useMemo, useContext, useRef, useCallback, useState, useEffect } from "react"
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, InteractionManager } from "react-native"
import { useNavigation } from "@react-navigation/native"
import Ionicons from "@react-native-vector-icons/ionicons"
import { Cpu, ChevronRight } from "lucide-react-native"
import { useTheme } from "../../context/ThemeContext"
import { BotMetaContext, GeneralMiscContext, RacingContext, defaultSettings, Settings, useSettingsSnapshot } from "../../context/BotStateContext"
import {
    assessParentFarmingPreviewFeasibility,
    formatPreviewFeasibilitySummary,
} from "../../lib/parentFarmingPreviewFeasibility"
import { applyCharacterBundleToSettings } from "../../components/ParentFarmingBundleGrid"
import { ParentFarmingBundleSupportSheet, saveBundleSupportBorrowOverride } from "../../components/ParentFarmingBundleSupportSheet"
import { CharacterSupportFinderSheet } from "../../components/CharacterSupportFinderSheet"
import { OwnedSupportInventorySheet } from "../../components/OwnedSupportInventorySheet"
import { CharacterSupportRecommendationView } from "../../components/CharacterSupportRecommendationView"
import { ParentFarmingGoalPresetGrid } from "../../components/ParentFarmingGoalPresetGrid"
import { ParentFarmingActivePresetChip } from "../../components/ParentFarmingActivePresetChip"
import { ParentFarmingCareerAutomationCard } from "../../components/ParentFarmingCareerAutomationCard"
import { ParentFarmingGoalProgressCard } from "../../components/ParentFarmingGoalProgressCard"
import { ParentFarmingSetupTabs } from "../../components/ParentFarmingSetupTabs"
import { ParentRunArchiveSheet } from "../../components/ParentRunArchiveSheet"
import { ParentFarmingGoalQueueEditor } from "../../components/ParentFarmingGoalQueueEditor"
import { ParentFarmingAnalyticsSheet } from "../../components/ParentFarmingAnalyticsSheet"
import { ParentFarmingAutoPreviewCard } from "../../components/ParentFarmingAutoPreviewCard"
import { ParentFarmingRecommendationsCard } from "../../components/ParentFarmingRecommendationsCard"
import { ParentFarmingBreedingPlanEditor } from "../../components/ParentFarmingBreedingPlanEditor"
import type { ParentFarmingCharacterBundle } from "../../lib/parentFarmingCharacterBundles"
import { buildAllowedEpithetNamesForParentBundle, aptitudesFromCharacterPreset, findCharacterPresetEntry, findParentFarmingCharacterBundle } from "../../lib/parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset, type ParentFarmingGoalPreset } from "../../lib/parentFarmingGoalPresets"
import {
    applyParentFarmingGoalPreset,
    PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY,
    enableParentFarmingCharacterBundle,
} from "../../lib/parentFarmingResolver"
import { detectParentFarmingDrift } from "../../lib/parentFarmingDrift"
import { assessParentFarmingFeasibility, formatFeasibilityIssues } from "../../lib/parentFarmingFeasibility"
import {
    PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
    buildFullDeckApplyRacingPatch,
} from "../../lib/parentFarmingCareerAutomation"
import { parseSupportBorrowOverrides } from "../../lib/parentFarmingSupportBorrow"
import { applyParentFarmingPreset, disableParentFarmingMode, refreshParentFarmingSettings } from "../../lib/parentFarmingPreset"
import { applyParentFarmingFullUnattended } from "../../lib/parentFarmingFullUnattended"
import {
    hasParentFarmingTargetEpithetDrift,
    hasParentFarmingTargetWeightDrift,
    hasParentFarmingTrainingDrift,
    hasParentFarmingForcedEpithetDrift,
    hasParentFarmingSparkStrategyDrift,
    hasParentFarmingSolverWeightDrift,
    hasParentFarmingEpithetTierDrift,
    hasParentFarmingLegacyStrategyDrift,
    hasParentFarmingQualityTargetDrift,
} from "../../lib/parentFarmingDrift"
import { recommendLegacyParents, formatLegacyParentRecommendation } from "../../lib/legacyParentRecommendations"
import { SearchPageProvider } from "../../context/SearchPageContext"
import CustomSelect from "../../components/CustomSelect"
import CustomSlider from "../../components/CustomSlider"
import { DomainHeader } from "../../components/ui/domain-header"
import { Callout } from "../../components/ui/callout"
import { SettingRow } from "../../components/ui/setting-row"
import TabStrip, { type TabStripItem } from "../../components/ui/tab-strip"
import SearchableItem from "../../components/SearchableItem"
import { usePerformanceLogging } from "../../hooks/usePerformanceLogging"
import { Row } from "../../components/ui/row"
import { Section } from "../../components/ui/section"
import { Switch } from "../../components/ui/switch"
import { Input } from "../../components/ui/input"
import { GlassSurface } from "../../components/ui/glass-surface"
import { SheetModal } from "../../components/ui/sheet-modal"
import { useModalShellStyles } from "../../components/ui/modal-shell-styles"
import { recommendSupportDeckForCharacter, parseOwnedSupportCards, formatSupportDeckClipboard } from "../../lib/recommendSupportDeck"
import { copyToClipboard } from "../../lib/utils"
import { SPARK_SELECTION_STRATEGIES } from "../../lib/sparkSelection"
import {
    applyCharacterBundleWithOwnedDeck,
    buildParentFarmingGoalQueueResolved,
    parseParentFarmingGoalQueue,
    serializeParentFarmingGoalQueueResolved,
    type ParentFarmingGoalQueueItem,
} from "../../lib/parentFarmingGoalQueue"
import { LEGACY_PARENT_SELECTION_STRATEGIES } from "../../lib/legacyParentSelection"
import { TYPE } from "../../lib/type"
import { SPACING } from "../../lib/spacing"
import { RADII } from "../../lib/radii"

type ParentFarmingSectionTab = "all" | "setup" | "automation" | "tune"

const PARENT_FARMING_SECTION_TABS: TabStripItem[] = [
    { key: "all", label: "All" },
    { key: "setup", label: "Setup" },
    { key: "automation", label: "Automation" },
    { key: "tune", label: "Tune" },
]

/**
 * Dedicated parent-farming setup: presets, inheritance sparks, supports, and solver shortcuts.
 */
const ParentFarmingSettings = () => {
    usePerformanceLogging("ParentFarmingSettings")
    const { colors } = useTheme()
    const modalShellStyles = useModalShellStyles()
    const navigation = useNavigation()
    const { setSettings } = useContext(BotMetaContext)
    const { general, updateGeneral } = useContext(GeneralMiscContext)
    const { racing, updateRacing } = useContext(RacingContext)
    const settings = useSettingsSnapshot()
    const scrollViewRef = useRef<ScrollView>(null)

    const [goalPickerOpen, setGoalPickerOpen] = useState(false)
    const [bundleSupportSheetOpen, setBundleSupportSheetOpen] = useState(false)
    const [bundleSupportEditing, setBundleSupportEditing] = useState<ParentFarmingCharacterBundle | null>(null)
    const [supportFinderOpen, setSupportFinderOpen] = useState(false)
    const [ownedInventoryOpen, setOwnedInventoryOpen] = useState(false)
    const [archiveOpen, setArchiveOpen] = useState(false)
    const [analyticsOpen, setAnalyticsOpen] = useState(false)
    const [previewRunning, setPreviewRunning] = useState(false)
    const [activeSection, setActiveSection] = useState<ParentFarmingSectionTab>("all")
    const showSection = useCallback((key: ParentFarmingSectionTab) => activeSection === "all" || activeSection === key, [activeSection])
    const [showHeavySections, setShowHeavySections] = useState(false)

    useEffect(() => {
        const handle = InteractionManager.runAfterInteractions(() => {
            setShowHeavySections(true)
        })
        return () => handle.cancel()
    }, [])

    const racingSettings = { ...defaultSettings.racing, ...racing }
    const {
        enableParentFarmingMode,
        enableParentRunSummary,
        enableParentRunArchive,
        sparkSelectionStrategy,
        enableAutoBorrowSupportCard,
        enableAutoEquipOwnedSupportDeck,
        enableAutoStartCareer,
        enableParentFarmingMultiRun,
        parentFarmingMultiRunCount,
        enableParentFarmingStopOnQualityTarget,
        parentFarmingQualityTargetScore,
        enableParentFarmingKeepBestRun,
        enableParentFarmingStopOnForcedEpithetFail,
        enableParentFarmingBorrowRotation,
        enableParentFarmingResumeSession,
        enableParentFarmingNavFallbackTrainee,
        enableParentFarmingFullUnattended,
        enableParentFarmingLockPreset,
        enableParentFarmingAutoDowngradeForcedEpithets,
        enableParentFarmingAdaptiveMultiRun,
        enableParentFarmingGoalQueue,
        parentFarmingGoalQueue,
        enableParentFarmingAutoApplyOwnedDeck,
        enableParentFarmingLiveMessageLog,
        enableParentFarmingAutoFeasibilityPreview,
        enableParentFarmingGameDataFactorOcr,
        enableParentFarmingHarvestReport,
        enableParentFarmingTrainingOptimizer,
        enableParentFarmingRespectSolverTraining,
        enableParentFarmingRecoveryCoach,
        enableParentFarmingBorrowIntelligence,
        enableParentFarmingAutoScenario,
        enableParentFarmingBreedingPlan,
        parentFarmingBreedingPlan,
        parentFarmingTargetFactorSkills,
        enableAutoSelectLegacyParents,
        legacyParentPreferredPair,
        legacyParentSelectionStrategy,
        supportBorrowPreferredCards,
        ownedSupportCards,
        supportDeckOwnedCards,
        enableFarmingFans,
        enableForceRacing,
        enableUserInGameRaceAgenda,
        parentFarmingGoalPresetKey,
        parentFarmingBundleKey,
        parentFarmingSupportBorrowOverrides,
        smartRaceSolverCharacterPreset,
        smartRaceSolverWeights,
    } = racingSettings

    const solverWeights = useMemo(() => {
        try {
            return JSON.parse(smartRaceSolverWeights || "{}") as Record<string, number>
        } catch {
            return {} as Record<string, number>
        }
    }, [smartRaceSolverWeights])

    const minimumFanTarget = typeof solverWeights.minimumFanTarget === "number" ? solverWeights.minimumFanTarget : 0

    const supportBorrowNames = useMemo(() => {
        try {
            const parsed = JSON.parse(supportBorrowPreferredCards || "[]")
            return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === "string") : []
        } catch {
            return []
        }
    }, [supportBorrowPreferredCards])

    const legacyParentNames = useMemo(() => {
        try {
            const parsed = JSON.parse(legacyParentPreferredPair || "[]")
            if (!Array.isArray(parsed)) return ["", ""]
            const names = parsed.filter((name): name is string => typeof name === "string")
            return [names[0] ?? "", names[1] ?? ""]
        } catch {
            return ["", ""]
        }
    }, [legacyParentPreferredPair])

    const supportBorrowOverrides = useMemo(
        () => parseSupportBorrowOverrides(parentFarmingSupportBorrowOverrides),
        [parentFarmingSupportBorrowOverrides],
    )

    const parentFarmingTraineeName = useMemo(() => {
        if (parentFarmingBundleKey) {
            const bundleTrainee = findParentFarmingCharacterBundle(parentFarmingBundleKey)?.characterName
            if (bundleTrainee) return bundleTrainee
        }
        return smartRaceSolverCharacterPreset || ""
    }, [parentFarmingBundleKey, smartRaceSolverCharacterPreset])

    const legacyParentRecommendation = useMemo(
        () => recommendLegacyParents(parentFarmingGoalPresetKey, legacyParentSelectionStrategy, parentFarmingTraineeName),
        [parentFarmingGoalPresetKey, legacyParentSelectionStrategy, parentFarmingTraineeName],
    )

    const parentFarmingDriftWarnings = useMemo(() => detectParentFarmingDrift(settings), [settings])
    const parentFarmingFeasibilityWarnings = useMemo(
        () => formatFeasibilityIssues(assessParentFarmingFeasibility(settings)),
        [settings],
    )

    const showPresetReSync = useMemo(
        () =>
            enableParentFarmingMode &&
            (hasParentFarmingTargetEpithetDrift(settings) ||
                hasParentFarmingTargetWeightDrift(settings) ||
                hasParentFarmingTrainingDrift(settings) ||
                hasParentFarmingForcedEpithetDrift(settings) ||
                hasParentFarmingSparkStrategyDrift(settings) ||
                hasParentFarmingSolverWeightDrift(settings) ||
                hasParentFarmingEpithetTierDrift(settings) ||
                hasParentFarmingLegacyStrategyDrift(settings) ||
                hasParentFarmingQualityTargetDrift(settings)),
        [enableParentFarmingMode, settings],
    )

    const reSyncFromPreset = useCallback(() => {
        setSettings((prev) => refreshParentFarmingSettings(prev))
    }, [setSettings])

    const openSmartRaceSolver = useCallback(() => {
        navigation.navigate("SmartRaceSolverSettings" as never)
    }, [navigation])

    const allowedEpithetNames = useMemo(
        () => buildAllowedEpithetNamesForParentBundle(general?.scenario || "Trackblazer", smartRaceSolverCharacterPreset || "Special Week"),
        [general?.scenario, smartRaceSolverCharacterPreset],
    )

    const applyGoalPreset = useCallback(
        (preset: ParentFarmingGoalPreset) => {
            setSettings((prev) => applyParentFarmingGoalPreset(prev, preset, allowedEpithetNames))
        },
        [allowedEpithetNames, setSettings],
    )

    const applyGoalPresetFromPicker = useCallback(
        (preset: ParentFarmingGoalPreset) => {
            applyGoalPreset(preset)
            setGoalPickerOpen(false)
        },
        [applyGoalPreset],
    )

    const applyDefaultGoalPreset = useCallback(() => {
        const preset = findParentFarmingGoalPreset(PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY)
        if (preset) applyGoalPresetFromPicker(preset)
    }, [applyGoalPresetFromPicker])

    const setParentFarmingMode = useCallback(
        (checked: boolean) => {
            if (!checked) {
                setGoalPickerOpen(false)
                if (settings.racing.parentFarmingSettingsSnapshot) {
                    Alert.alert("Exit parent farming?", "Keep your current settings or revert to the pre-preset snapshot.", [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Keep settings",
                            onPress: () => setSettings((prev) => disableParentFarmingMode(prev)),
                        },
                        {
                            text: "Revert settings",
                            style: "destructive",
                            onPress: () => setSettings((prev) => disableParentFarmingMode(prev, { revert: true })),
                        },
                    ])
                    return
                }
                setSettings((prev) => disableParentFarmingMode(prev))
                return
            }
            if (parentFarmingGoalPresetKey || parentFarmingBundleKey) {
                setSettings((prev) => applyParentFarmingPreset(prev))
            } else {
                setGoalPickerOpen(true)
            }
        },
        [setSettings, parentFarmingGoalPresetKey, parentFarmingBundleKey, settings.racing.parentFarmingSettingsSnapshot],
    )

    const goalQueueItems = useMemo(() => parseParentFarmingGoalQueue(parentFarmingGoalQueue), [parentFarmingGoalQueue])

    const updateGoalQueue = useCallback(
        (items: ParentFarmingGoalQueueItem[]) => {
            setSettings((prev) => {
                const resolved = buildParentFarmingGoalQueueResolved(prev, items)
                return {
                    ...prev,
                    racing: {
                        ...prev.racing,
                        parentFarmingGoalQueue: JSON.stringify(items),
                        parentFarmingGoalQueueResolved: serializeParentFarmingGoalQueueResolved(resolved),
                    },
                }
            })
        },
        [setSettings],
    )

    const applyCharacterBundle = useCallback(
        (bundle: ParentFarmingCharacterBundle) => {
            setSettings((prev) => {
                const withBundle = applyCharacterBundleToSettings(prev, bundle)
                if (!enableParentFarmingAutoApplyOwnedDeck) return withBundle
                return applyCharacterBundleWithOwnedDeck(withBundle, bundle.key, { autoApplyOwnedDeck: true })
            })
        },
        [setSettings, enableParentFarmingAutoApplyOwnedDeck],
    )

    const openBundleSupportEditor = useCallback((bundle: ParentFarmingCharacterBundle) => {
        setBundleSupportEditing(bundle)
        setBundleSupportSheetOpen(true)
    }, [])

    const saveBundleSupportCards = useCallback(
        (bundleKey: string, cards: string[]) => {
            setSettings((prev) => {
                const overridesJson = saveBundleSupportBorrowOverride(prev.racing.parentFarmingSupportBorrowOverrides, bundleKey, cards)
                const withOverrides = {
                    ...prev,
                    racing: { ...prev.racing, parentFarmingSupportBorrowOverrides: overridesJson },
                }
                if (withOverrides.racing.parentFarmingBundleKey === bundleKey) {
                    return enableParentFarmingCharacterBundle(withOverrides, bundleKey)
                }
                return withOverrides
            })
        },
        [setSettings],
    )

    const ownedInventory = useMemo(() => parseOwnedSupportCards(ownedSupportCards), [ownedSupportCards])

    const activeCharacterSupportRecommendation = useMemo(
        () =>
            smartRaceSolverCharacterPreset
                ? recommendSupportDeckForCharacter(smartRaceSolverCharacterPreset, { ownedInventory })
                : null,
        [smartRaceSolverCharacterPreset, ownedInventory],
    )

    const applyFriendBorrowFromRecommendation = useCallback(
        (characterName: string, borrowOrder: string[]) => {
            setSettings((prev) => {
                const preset = findCharacterPresetEntry(characterName)
                return {
                    ...prev,
                    racing: {
                        ...prev.racing,
                        supportBorrowPreferredCards: JSON.stringify(borrowOrder),
                        smartRaceSolverCharacterPreset: characterName,
                        enableAutoBorrowSupportCard: true,
                        ...(preset
                            ? { smartRaceSolverAptitudes: JSON.stringify(aptitudesFromCharacterPreset(preset)) }
                            : {}),
                    },
                }
            })
        },
        [setSettings],
    )

    const applyFullDeckFromRecommendation = useCallback(
        (characterName: string, ownedCards: string[], borrowOrder: string[]) => {
            setSettings((prev) => {
                const preset = findCharacterPresetEntry(characterName)
                const aptitudesJson = preset ? JSON.stringify(aptitudesFromCharacterPreset(preset)) : undefined
                return {
                    ...prev,
                    racing: buildFullDeckApplyRacingPatch(prev.racing, ownedCards, borrowOrder, characterName, aptitudesJson),
                }
            })
        },
        [setSettings],
    )

    const enableFullCareerAutomation = useCallback(() => {
        updateRacing((prev) => ({ ...prev, ...PARENT_FARMING_CAREER_AUTOMATION_FLAGS }))
    }, [updateRacing])

    const updateRacingSetting = useCallback(
        (key: keyof Settings["racing"], value: unknown) => {
            if (key === "enableParentFarmingFullUnattended") {
                setSettings((prev) => {
                    const next = { ...prev, racing: { ...prev.racing, enableParentFarmingFullUnattended: Boolean(value) } }
                    return Boolean(value) ? applyParentFarmingFullUnattended(next) : next
                })
                return
            }
            updateRacing({ [key]: value } as Partial<Settings["racing"]>)
        },
        [updateRacing, setSettings],
    )

    const applyLegacyParentRecommendation = useCallback(() => {
        updateRacingSetting(
            "legacyParentPreferredPair",
            JSON.stringify([legacyParentRecommendation.parentOne, legacyParentRecommendation.parentTwo]),
        )
    }, [legacyParentRecommendation, updateRacingSetting])

    const updateLegacyParentName = useCallback(
        (index: number, value: string) => {
            const next = [...legacyParentNames]
            next[index] = value
            updateRacingSetting("legacyParentPreferredPair", JSON.stringify([next[0].trim(), next[1].trim()]))
        },
        [legacyParentNames, updateRacingSetting],
    )

    const saveOwnedInventory = useCallback(
        (cards: string[]) => {
            updateRacingSetting("ownedSupportCards", JSON.stringify(cards))
        },
        [updateRacingSetting],
    )

    const updateSolverWeight = useCallback(
        (key: string, value: number) => {
            updateRacing((prev) => {
                try {
                    const parsed = JSON.parse(prev.smartRaceSolverWeights || "{}")
                    return { ...prev, smartRaceSolverWeights: JSON.stringify({ ...parsed, [key]: value }) }
                } catch {
                    return prev
                }
            })
        },
        [updateRacing],
    )

    const solverNavDisabled = enableForceRacing || enableUserInGameRaceAgenda
    const activeScenario = general?.scenario || "Trackblazer"
    const needsTrackblazerNudge = enableParentFarmingMode && activeScenario !== "Trackblazer"

    const runPreviewCheck = useCallback(async () => {
        setPreviewRunning(true)
        try {
            const result = await assessParentFarmingPreviewFeasibility(settings)
            const summary = formatPreviewFeasibilitySummary(result)
            const detail =
                result.issues.length > 0
                    ? `\n\n${formatFeasibilityIssues(result.issues).join("\n")}`
                    : "\n\nNo static or solver issues detected."
            Alert.alert("Solver preview check", `${summary}${detail}`)
        } catch (error) {
            Alert.alert("Solver preview check", error instanceof Error ? error.message : String(error))
        } finally {
            setPreviewRunning(false)
        }
    }, [settings])

    const applyTrackblazerScenario = useCallback(() => {
        updateGeneral({ scenario: "Trackblazer" })
    }, [updateGeneral])

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    flex: 1,
                    margin: 10,
                    backgroundColor: colors.bg,
                },
            }),
        [colors],
    )

    return (
        <View style={styles.root}>
            <SearchPageProvider page="ParentFarmingSettings" scrollViewRef={scrollViewRef}>
                <DomainHeader breadcrumb="Gameplay" title="Parent Farming" subtitle="Goal presets, inheritance sparks, and character setups." />
                <ScrollView
                    ref={scrollViewRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xl }}
                >
                    <View className="m-1">
                        <Section label="Mode">
                            <SettingRow
                                id="enable-parent-farming-mode"
                                title="Parent Farming Mode"
                                description="Turn on after picking a character setup or goal preset below."
                                right={<Switch checked={enableParentFarmingMode} onCheckedChange={setParentFarmingMode} />}
                            />
                            {!enableParentFarmingMode && (
                                <Callout variant="info" style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}>
                                    Enable the mode, then choose a character setup (recommended) or goal preset. Start the bot on career selection for auto-equip, auto-borrow, legacy parent auto-select, and optional auto-start.
                                </Callout>
                            )}
                            <ParentFarmingActivePresetChip settings={settings} />
                            {enableParentFarmingMode && (
                                <ParentFarmingCareerAutomationCard settings={settings} onEnableFullAutomation={enableFullCareerAutomation} />
                            )}
                            {enableParentFarmingMode && (
                                <ParentFarmingGoalProgressCard
                                    settings={settings}
                                    onOpenSolver={openSmartRaceSolver}
                                    onReSyncPreset={reSyncFromPreset}
                                    showReSync={showPresetReSync}
                                />
                            )}
                            {parentFarmingDriftWarnings.length > 0 && (
                                <Callout variant="warning" style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}>
                                    {parentFarmingDriftWarnings.join("\n\n")}
                                    {showPresetReSync && (
                                        <Pressable
                                            onPress={reSyncFromPreset}
                                            style={{ marginTop: SPACING.sm, alignSelf: "flex-start" }}
                                            accessibilityRole="button"
                                        >
                                            <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Re-sync from preset</Text>
                                        </Pressable>
                                    )}
                                </Callout>
                            )}
                            {parentFarmingFeasibilityWarnings.length > 0 && (
                                <Callout variant="warning" style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}>
                                    {parentFarmingFeasibilityWarnings.join("\n\n")}
                                    {needsTrackblazerNudge && (
                                        <Pressable
                                            onPress={applyTrackblazerScenario}
                                            style={{ marginTop: SPACING.sm, alignSelf: "flex-start" }}
                                            accessibilityRole="button"
                                        >
                                            <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Switch to Trackblazer</Text>
                                        </Pressable>
                                    )}
                                </Callout>
                            )}
                        </Section>

                        {enableParentFarmingMode && showHeavySections && (
                            <View style={{ marginBottom: SPACING.md, paddingHorizontal: SPACING.xs }}>
                                <TabStrip items={PARENT_FARMING_SECTION_TABS} activeKey={activeSection} onChange={(key) => setActiveSection(key as ParentFarmingSectionTab)} />
                            </View>
                        )}

                        {enableParentFarmingMode && showSection("automation") && (
                            <Section label="Reliability">
                                <SettingRow
                                    id="enable-parent-farming-full-unattended"
                                    title="Full unattended"
                                    searchTitle="Full unattended preset"
                                    description="Enables career-complete skill spending and carat-funded race retry (max 2 per career)."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingFullUnattended}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingFullUnattended", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-auto-downgrade-forced"
                                    title="Auto-downgrade forced epithets"
                                    searchTitle="Auto-downgrade infeasible forced epithets"
                                    description="Moves forced epithets without matchers or wrong scenario into targets at preset resolve time."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingAutoDowngradeForcedEpithets}
                                            onCheckedChange={(checked) =>
                                                updateRacingSetting("enableParentFarmingAutoDowngradeForcedEpithets", checked)
                                            }
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-adaptive-multi-run"
                                    title="Adaptive multi-run"
                                    description="After a forced epithet miss, downgrades that epithet to target-only on the next career."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingAdaptiveMultiRun}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingAdaptiveMultiRun", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-auto-apply-owned-deck"
                                    title="Auto-apply owned deck on bundle"
                                    description="When you tap a character bundle, equips your saved owned support slots if four or more are configured."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingAutoApplyOwnedDeck}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingAutoApplyOwnedDeck", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-live-message-log"
                                    title="Live progress in message log"
                                    description="Throttled turn-by-turn parent farming updates in the in-app message log."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingLiveMessageLog}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingLiveMessageLog", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-auto-feasibility-preview"
                                    title="Auto feasibility preview"
                                    description="Shows a live solver feasibility summary when your parent setup changes."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingAutoFeasibilityPreview}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingAutoFeasibilityPreview", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-lock-preset"
                                    title="Lock preset"
                                    description="When on, conflicting racing toggles re-sync from the active preset instead of clearing parent mode."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingLockPreset}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingLockPreset", checked)}
                                        />
                                    }
                                />
                                <SearchableItem
                                    id="parent-farming-preview-feasibility"
                                    title="Run solver preview check"
                                    description="Validates the parent-farming setup with a live Smart Race Solver preview before starting the bot."
                                >
                                    <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
                                        <Pressable
                                            onPress={runPreviewCheck}
                                            disabled={previewRunning}
                                            style={{
                                                padding: SPACING.md,
                                                borderRadius: RADII.md,
                                                borderWidth: 1,
                                                borderColor: colors.brandBorder,
                                                backgroundColor: colors.brandSubtle,
                                                opacity: previewRunning ? 0.6 : 1,
                                            }}
                                            android_ripple={{ color: colors.ripple, foreground: true }}
                                            accessibilityRole="button"
                                        >
                                            <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>
                                                {previewRunning ? "Running preview…" : "Run solver preview check"}
                                            </Text>
                                            <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs }}>
                                                Combines static feasibility checks with a full 72-turn solver schedule preview.
                                            </Text>
                                        </Pressable>
                                    </View>
                                </SearchableItem>
                                <ParentFarmingAutoPreviewCard
                                    settings={settings}
                                    enabled={enableParentFarmingAutoFeasibilityPreview}
                                />
                                <SettingRow
                                    id="enable-parent-farming-game-data-factor-ocr"
                                    title="Game-data factor OCR"
                                    description="Score inheritance sparks and legacy parents against the bundled skills database, not keywords alone."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingGameDataFactorOcr}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingGameDataFactorOcr", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-harvest-report"
                                    title="Parent harvest report"
                                    description="OCR inherited skills at career end and log a keep vs reroll verdict."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingHarvestReport}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingHarvestReport", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-training-optimizer"
                                    title="Training + race optimizer"
                                    description="Boost training priority for weak aptitudes needed by the active parent bundle."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingTrainingOptimizer}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingTrainingOptimizer", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-respect-solver-training"
                                    title="Respect solver training calls"
                                    description="When the Smart Race Solver says train instead of race, skip the fan-farming interval fallback instead of racing anyway. Trades fan progress for more consistent spark training."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingRespectSolverTraining}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingRespectSolverTraining", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-recovery-coach"
                                    title="Recovery coach"
                                    description="Warn when epithets go dead with suggested next steps (message log + Discord)."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingRecoveryCoach}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingRecoveryCoach", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-borrow-intelligence"
                                    title="Live borrow intelligence"
                                    description="Scroll the friend borrow list when visible slots fail OCR."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingBorrowIntelligence}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingBorrowIntelligence", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-auto-scenario"
                                    title="Auto-sync scenario"
                                    description="Set Trackblazer / URA Finale / Unity Cup from the active goal preset when the bot starts."
                                    right={
                                        <Switch
                                            checked={enableParentFarmingAutoScenario}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingAutoScenario", checked)}
                                        />
                                    }
                                />
                            </Section>
                        )}

                        {enableParentFarmingMode && showSection("setup") && (
                            <>
                                <Section label="Choose setup">
                                    <View style={{ padding: SPACING.md }}>
                                        <ParentFarmingSetupTabs
                                            scenario={general?.scenario || "Trackblazer"}
                                            allowedEpithetNames={allowedEpithetNames}
                                            supportBorrowOverrides={supportBorrowOverrides}
                                            onApplyGoal={applyGoalPreset}
                                            onApplyBundle={applyCharacterBundle}
                                            onEditBundleSupports={openBundleSupportEditor}
                                        />
                                    </View>
                                </Section>

                                <Section label="Inheritance & supports">
                                    <SearchableItem id="spark-selection-strategy" title="Spark selection" description="How the bot picks one of three inheritance sparks.">
                                        <Row
                                            title="Spark selection"
                                            description="Goal presets set this automatically (e.g. Skill Hint → skill hints)."
                                            right={
                                                <CustomSelect
                                                    searchId="spark-selection-strategy"
                                                    searchTitle="Spark Selection Strategy"
                                                    searchDescription="How the bot picks inheritance sparks before confirming inheritance."
                                                    width={150}
                                                    options={SPARK_SELECTION_STRATEGIES.map((option) => ({
                                                        value: option.value,
                                                        label: option.shortLabel,
                                                    }))}
                                                    value={sparkSelectionStrategy || "Default"}
                                                    onValueChange={(value) => updateRacingSetting("sparkSelectionStrategy", value)}
                                                    placeholder="Default"
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                    <SearchableItem
                                        id="character-support-finder"
                                        title="Support deck finder"
                                        description="Recommended four-support deck and friend borrow for any trainee."
                                    >
                                        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md }}>
                                            <Pressable
                                                onPress={() => setSupportFinderOpen(true)}
                                                style={{
                                                    padding: SPACING.md,
                                                    borderRadius: RADII.md,
                                                    borderWidth: 1,
                                                    borderColor: colors.borderHair,
                                                    backgroundColor: colors.surface,
                                                }}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                accessibilityRole="button"
                                            >
                                                <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>Find best supports for any Uma</Text>
                                                <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs }}>
                                                    Search all characters — not only the preset bundles above.
                                                </Text>
                                            </Pressable>
                                            {activeCharacterSupportRecommendation && (
                                                <View>
                                                    <Text style={{ ...TYPE.caption, color: colors.textMuted, marginBottom: SPACING.sm }}>
                                                        Current character preset ({smartRaceSolverCharacterPreset})
                                                    </Text>
                                                    <CharacterSupportRecommendationView recommendation={activeCharacterSupportRecommendation} />
                                                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.sm }}>
                                                        <Pressable
                                                            onPress={() =>
                                                                applyFullDeckFromRecommendation(
                                                                    activeCharacterSupportRecommendation.characterName,
                                                                    activeCharacterSupportRecommendation.ownedCards,
                                                                    activeCharacterSupportRecommendation.friendBorrowOrder,
                                                                )
                                                            }
                                                            style={{
                                                                paddingVertical: SPACING.sm,
                                                                paddingHorizontal: SPACING.md,
                                                                borderRadius: RADII.md,
                                                                backgroundColor: colors.brandSubtle,
                                                                borderWidth: 1,
                                                                borderColor: colors.brandBorder,
                                                            }}
                                                        >
                                                            <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Apply full deck + automation</Text>
                                                        </Pressable>
                                                    <Pressable
                                                        onPress={() =>
                                                            applyFriendBorrowFromRecommendation(
                                                                activeCharacterSupportRecommendation.characterName,
                                                                activeCharacterSupportRecommendation.friendBorrowOrder,
                                                            )
                                                        }
                                                        style={{
                                                            paddingVertical: SPACING.sm,
                                                            paddingHorizontal: SPACING.md,
                                                            borderRadius: RADII.md,
                                                            borderWidth: 1,
                                                            borderColor: colors.borderHair,
                                                        }}
                                                    >
                                                        <Text style={{ ...TYPE.caption, color: colors.text }}>Apply friend borrow</Text>
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => copyToClipboard(formatSupportDeckClipboard(activeCharacterSupportRecommendation))}
                                                            style={{
                                                                paddingVertical: SPACING.sm,
                                                                paddingHorizontal: SPACING.md,
                                                                borderRadius: RADII.md,
                                                                borderWidth: 1,
                                                                borderColor: colors.borderHair,
                                                            }}
                                                        >
                                                            <Text style={{ ...TYPE.caption, color: colors.text }}>Copy deck</Text>
                                                        </Pressable>
                                                    </View>
                                                    {supportDeckOwnedCards && parseOwnedSupportCards(supportDeckOwnedCards).length > 0 && (
                                                        <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs }}>
                                                            Saved owned slots: {parseOwnedSupportCards(supportDeckOwnedCards).join(" · ")}
                                                        </Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </SearchableItem>
                                    <SettingRow
                                        id="enable-parent-run-summary"
                                        title="Run summary at career end"
                                        searchTitle="Parent run summary"
                                        description="Fans, stats, epithets, and spark picks."
                                        right={
                                            <Switch
                                                checked={enableParentRunSummary}
                                                onCheckedChange={(checked) => updateRacingSetting("enableParentRunSummary", checked)}
                                            />
                                        }
                                    />
                                    <SettingRow
                                        id="parent-run-archive"
                                        title="Save run history"
                                        searchTitle="Parent run history"
                                        searchDescription="Save completed parent runs on-device and compare fans and epithets across runs."
                                        description="Stored locally when a parent-farming career ends."
                                        right={
                                            <Switch
                                                checked={enableParentRunArchive}
                                                onCheckedChange={(checked) => updateRacingSetting("enableParentRunArchive", checked)}
                                            />
                                        }
                                    />
                                    <SearchableItem
                                        id="parent-run-archive-browse"
                                        title="Browse parent run history"
                                        description="Compare fans and epithets vs your previous runs for the same character."
                                        parentId="parent-run-archive"
                                    >
                                        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
                                            <Pressable
                                                onPress={() => setArchiveOpen(true)}
                                                style={{
                                                    padding: SPACING.md,
                                                    borderRadius: RADII.md,
                                                    borderWidth: 1,
                                                    borderColor: colors.borderHair,
                                                    backgroundColor: colors.surface,
                                                }}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                accessibilityRole="button"
                                            >
                                                <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>Browse parent run history</Text>
                                                <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs }}>
                                                    Compare fans and epithets vs your previous runs for the same character.
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </SearchableItem>
                                    <SearchableItem
                                        id="parent-farming-analytics"
                                        title="Cross-profile analytics"
                                        description="Quality trends and run counts grouped by profile and character."
                                        parentId="parent-run-archive"
                                    >
                                        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
                                            <Pressable
                                                onPress={() => setAnalyticsOpen(true)}
                                                style={{
                                                    padding: SPACING.md,
                                                    borderRadius: RADII.md,
                                                    borderWidth: 1,
                                                    borderColor: colors.borderHair,
                                                    backgroundColor: colors.surface,
                                                }}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                accessibilityRole="button"
                                            >
                                                <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>Open analytics dashboard</Text>
                                                <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.xs }}>
                                                    Compare runs across profiles and characters from archived parent history.
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </SearchableItem>
                                    <SearchableItem
                                        id="parent-farming-recommendations"
                                        title="Outcome recommendations"
                                        description="Tips from archived run history — bundle switches, forced epithet misses, fan floors."
                                        parentId="parent-run-archive"
                                    >
                                        <ParentFarmingRecommendationsCard settings={settings} />
                                    </SearchableItem>
                                </Section>

                                <Section label="Generation farm">
                                    <SettingRow
                                        id="enable-parent-farming-breeding-plan"
                                        title="Multi-generation breeding plan"
                                        description="Chain parent runs toward inherited factor skills. Start the bot on career selection — settings advance automatically between careers."
                                        right={
                                            <Switch
                                                checked={enableParentFarmingBreedingPlan}
                                                onCheckedChange={(checked) => {
                                                    updateRacingSetting("enableParentFarmingBreedingPlan", checked)
                                                    if (checked) {
                                                        updateRacingSetting("enableParentFarmingMultiRun", true)
                                                    }
                                                }}
                                            />
                                        }
                                    />
                                    {enableParentFarmingBreedingPlan && (
                                        <SearchableItem
                                            id="parent-farming-breeding-plan"
                                            title="Breeding generations"
                                            description="Each generation picks a bundle/preset, target factor skills, and optional previous-gen legacy parent."
                                        >
                                            <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
                                                <ParentFarmingBreedingPlanEditor
                                                    json={parentFarmingBreedingPlan}
                                                    onChange={(value) => updateRacingSetting("parentFarmingBreedingPlan", value)}
                                                />
                                            </View>
                                        </SearchableItem>
                                    )}
                                </Section>
                            </>
                        )}

                        {enableParentFarmingMode && showSection("automation") && (
                            <Section label="Career selection">
                                <SettingRow
                                    id="enable-auto-equip-owned-support-deck"
                                    title="Auto-equip owned supports"
                                    searchTitle="Auto-equip owned support deck"
                                    description={
                                        parseOwnedSupportCards(supportDeckOwnedCards).length > 0
                                            ? `Slots: ${parseOwnedSupportCards(supportDeckOwnedCards).join(" · ")}`
                                            : "Equip four saved owned slots at career selection before borrowing a friend card."
                                    }
                                    right={
                                        <Switch
                                            checked={enableAutoEquipOwnedSupportDeck}
                                            onCheckedChange={(checked) => updateRacingSetting("enableAutoEquipOwnedSupportDeck", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-auto-borrow-support-card"
                                    title="Auto-borrow support"
                                    searchTitle="Auto-Borrow Support Card"
                                    description={
                                        supportBorrowNames.length > 0
                                            ? `Priority: ${supportBorrowNames.slice(0, 3).join(" → ")}${supportBorrowNames.length > 3 ? " …" : ""}`
                                            : "Borrow a friend support at career selection before training."
                                    }
                                    right={
                                        <Switch
                                            checked={enableAutoBorrowSupportCard}
                                            onCheckedChange={(checked) => updateRacingSetting("enableAutoBorrowSupportCard", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-auto-select-legacy-parents"
                                    title="Auto-select parent pair"
                                    searchTitle="Auto-select legacy parents"
                                    description={
                                        legacyParentNames.some((name) => name.length > 0)
                                            ? `Preferred: ${legacyParentNames.filter(Boolean).join(" · ")} (OCR); otherwise in-game Auto-Select`
                                            : "Use in-game Auto-Select or OCR a preferred parent pair at career selection."
                                    }
                                    right={
                                        <Switch
                                            checked={enableAutoSelectLegacyParents}
                                            onCheckedChange={(checked) => updateRacingSetting("enableAutoSelectLegacyParents", checked)}
                                        />
                                    }
                                />
                                {enableAutoSelectLegacyParents && (
                                    <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm }}>
                                        <Row
                                            title="Factor-aware selection"
                                            description={
                                                legacyParentNames.some((name) => name.length > 0)
                                                    ? "Skipped when preferred names are set."
                                                    : legacyParentSelectionStrategy === "Default"
                                                      ? "Uses in-game Auto-Select only."
                                                      : `OCR-scores parent cards for ${LEGACY_PARENT_SELECTION_STRATEGIES.find((option) => option.value === legacyParentSelectionStrategy)?.shortLabel ?? legacyParentSelectionStrategy}.`
                                            }
                                            right={
                                                <CustomSelect
                                                    searchId="legacy-parent-selection-strategy"
                                                    searchTitle="Legacy parent selection"
                                                    searchDescription="How the bot picks a parent pair when no preferred names are configured."
                                                    width={150}
                                                    options={LEGACY_PARENT_SELECTION_STRATEGIES.map((option) => ({
                                                        value: option.value,
                                                        label: option.shortLabel,
                                                    }))}
                                                    value={legacyParentSelectionStrategy || "Default"}
                                                    onValueChange={(value) => updateRacingSetting("legacyParentSelectionStrategy", value)}
                                                    placeholder="Default"
                                                />
                                            }
                                        />
                                        <Text style={{ ...TYPE.caption, color: colors.textMuted }}>
                                            Optional preferred parent pair (leave blank for factor scoring or Auto-Select):
                                        </Text>
                                        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                                            <Input
                                                value={legacyParentNames[0]}
                                                onChangeText={(value) => updateLegacyParentName(0, value)}
                                                placeholder="Parent 1"
                                                style={{ flex: 1 }}
                                            />
                                            <Input
                                                value={legacyParentNames[1]}
                                                onChangeText={(value) => updateLegacyParentName(1, value)}
                                                placeholder="Parent 2"
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                        <Text style={{ ...TYPE.caption, color: colors.textMuted }}>
                                            Suggested: {formatLegacyParentRecommendation(legacyParentRecommendation)}
                                        </Text>
                                        <Pressable
                                            onPress={applyLegacyParentRecommendation}
                                            style={{
                                                alignSelf: "flex-start",
                                                paddingVertical: SPACING.sm,
                                                paddingHorizontal: SPACING.md,
                                                borderRadius: RADII.md,
                                                borderWidth: 1,
                                                borderColor: colors.brandBorder,
                                                backgroundColor: colors.brandSubtle,
                                            }}
                                            accessibilityRole="button"
                                        >
                                            <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Apply suggested pair</Text>
                                        </Pressable>
                                    </View>
                                )}
                                <SettingRow
                                    id="enable-auto-start-career"
                                    title="Auto-start career"
                                    description="Tap Start Career on final confirmation after supports and parents are set."
                                    right={
                                        <Switch
                                            checked={enableAutoStartCareer}
                                            onCheckedChange={(checked) => updateRacingSetting("enableAutoStartCareer", checked)}
                                        />
                                    }
                                />
                                <SettingRow
                                    id="enable-parent-farming-multi-run"
                                    title="Multi-run loop"
                                    searchTitle="Multi-run parent farming"
                                    description={
                                        enableParentFarmingMultiRun
                                            ? parentFarmingMultiRunCount <= 0
                                                ? "Runs until you stop the bot manually."
                                                : `Target: ${parentFarmingMultiRunCount} career${parentFarmingMultiRunCount === 1 ? "" : "s"} per session.`
                                            : "After each career ends, return to career selection and start another run in the same bot session."
                                    }
                                    right={
                                        <Switch
                                            checked={enableParentFarmingMultiRun}
                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingMultiRun", checked)}
                                        />
                                    }
                                />
                                {enableParentFarmingMultiRun && (
                                    <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md }}>
                                        <CustomSlider
                                            searchId="parent-farming-multi-run-count"
                                            searchTitle="Careers per session"
                                            searchDescription="Number of parent runs before the bot stops. Set to 0 for unlimited until manually stopped."
                                            label="Careers per session (0 = unlimited)"
                                            min={0}
                                            max={20}
                                            step={1}
                                            value={parentFarmingMultiRunCount}
                                            placeholder={defaultSettings.racing.parentFarmingMultiRunCount}
                                            onValueChange={(value) => updateRacingSetting("parentFarmingMultiRunCount", value)}
                                            showValue
                                            showLabels
                                            description="Each career sends its own run summary when multi-run is enabled."
                                        />
                                        <SettingRow
                                            id="enable-parent-farming-goal-queue"
                                            title="Multi-goal queue"
                                            description="Cycle through different bundles or presets each career instead of repeating the same setup."
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingGoalQueue}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingGoalQueue", checked)}
                                                />
                                            }
                                        />
                                        {enableParentFarmingGoalQueue && (
                                            <SearchableItem
                                                id="parent-farming-goal-queue"
                                                title="Goal queue"
                                                description="Ordered list of character bundles and goal presets for mixed overnight farming. Loops back to the top once the multi-run count exceeds the queue length."
                                            >
                                                <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md }}>
                                                    <ParentFarmingGoalQueueEditor items={goalQueueItems} onChange={updateGoalQueue} />
                                                </View>
                                            </SearchableItem>
                                        )}
                                        <SettingRow
                                            id="enable-parent-farming-stop-on-quality"
                                            title="Stop on quality target"
                                            description={
                                                enableParentFarmingStopOnQualityTarget
                                                    ? `Stops when parent quality ≥ ${parentFarmingQualityTargetScore} (A grade by default).`
                                                    : "End the multi-run session early when a run reaches the quality score target."
                                            }
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingStopOnQualityTarget}
                                                    onCheckedChange={(checked) =>
                                                        updateRacingSetting("enableParentFarmingStopOnQualityTarget", checked)
                                                    }
                                                />
                                            }
                                        />
                                        {enableParentFarmingStopOnQualityTarget && (
                                            <CustomSlider
                                                searchId="parent-farming-quality-target-score"
                                                searchTitle="Quality target score"
                                                searchDescription="Minimum parent quality score (0–100) to stop multi-run early."
                                                label="Quality target (0–100)"
                                                min={60}
                                                max={95}
                                                step={5}
                                                value={parentFarmingQualityTargetScore}
                                                placeholder={defaultSettings.racing.parentFarmingQualityTargetScore}
                                                onValueChange={(value) => updateRacingSetting("parentFarmingQualityTargetScore", value)}
                                                showValue
                                                showLabels
                                                description="S = 90+, A = 80+, B = 70+. Compare scores in run archive."
                                            />
                                        )}
                                        <SettingRow
                                            id="enable-parent-farming-keep-best-run"
                                            title="Track session best"
                                            searchTitle="Keep best run summary"
                                            description="Log the highest-quality run when the multi-run session completes."
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingKeepBestRun}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingKeepBestRun", checked)}
                                                />
                                            }
                                        />
                                        <SettingRow
                                            id="enable-parent-farming-borrow-rotation"
                                            title="Rotate borrow each run"
                                            searchTitle="Rotate borrow priority"
                                            description="Shift friend borrow priority each run in a multi-run session."
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingBorrowRotation}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingBorrowRotation", checked)}
                                                />
                                            }
                                        />
                                        <SettingRow
                                            id="enable-parent-farming-stop-on-forced-fail"
                                            title="Forced epithet fail-fast"
                                            searchTitle="Stop on forced epithet fail"
                                            description="Stop multi-run when a forced epithet route is missed or becomes unreachable."
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingStopOnForcedEpithetFail}
                                                    onCheckedChange={(checked) =>
                                                        updateRacingSetting("enableParentFarmingStopOnForcedEpithetFail", checked)
                                                    }
                                                />
                                            }
                                        />
                                        <SettingRow
                                            id="enable-parent-farming-resume-session"
                                            title="Resume after bot restart"
                                            searchTitle="Resume multi-run session"
                                            description="Pick up at the last completed generation if the bot restarts mid breeding-plan, as long as the plan hasn't changed."
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingResumeSession}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingResumeSession", checked)}
                                                />
                                            }
                                        />
                                        <SettingRow
                                            id="enable-parent-farming-nav-fallback-trainee"
                                            title="Fall back to previous trainee"
                                            searchTitle="Generation farm navigation fallback"
                                            description="If generation-farm auto-navigation can't find the next trainee, continue with the previous generation's trainee instead of stopping the session."
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingNavFallbackTrainee}
                                                    onCheckedChange={(checked) =>
                                                        updateRacingSetting("enableParentFarmingNavFallbackTrainee", checked)
                                                    }
                                                />
                                            }
                                        />
                                    </View>
                                )}
                            </Section>
                        )}

                        {enableParentFarmingMode && showSection("tune") && (
                            <>
                                <Section label="Fan target">
                                    <View style={{ padding: SPACING.md }}>
                                        <CustomSlider
                                            searchId="minimum-fan-target"
                                            value={minimumFanTarget}
                                            placeholder={0}
                                            onValueChange={(value) => updateSolverWeight("minimumFanTarget", value)}
                                            min={0}
                                            max={300000}
                                            step={5000}
                                            label="Solver fan floor"
                                            showValue
                                            showLabels
                                            description="When fans reach this target, the solver prefers training over fan races. 0 = no floor."
                                        />
                                        {!enableFarmingFans && (
                                            <Text style={{ ...TYPE.caption, color: colors.textMuted, marginTop: SPACING.sm }}>
                                                Fan farming is off in Racing settings — floor only affects solver scoring when fan weight is active.
                                            </Text>
                                        )}
                                    </View>
                                </Section>

                                <Section label="Fine-tune">
                                    <Pressable
                                        onPress={() => navigation.navigate("SmartRaceSolverSettings" as never)}
                                        android_ripple={{ color: colors.ripple, foreground: true }}
                                        accessibilityRole="button"
                                        disabled={solverNavDisabled}
                                        style={{ opacity: solverNavDisabled ? 0.5 : 1, marginHorizontal: SPACING.md, marginBottom: SPACING.md }}
                                    >
                                        <GlassSurface style={{ borderRadius: RADII.lg }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md }}>
                                                <View
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 999,
                                                        backgroundColor: colors.brandSubtle,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <Cpu size={18} color={colors.brand} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "600" }}>Smart Race Solver</Text>
                                                    <Text style={{ ...TYPE.caption, color: colors.textMuted }}>Epithets, aptitudes, manual race locks</Text>
                                                </View>
                                                <ChevronRight size={16} color={colors.brand} />
                                            </View>
                                        </GlassSurface>
                                    </Pressable>
                                    {solverNavDisabled && (
                                        <Callout variant="warning" style={{ marginHorizontal: SPACING.md }}>
                                            Disable Force Racing and in-game race agenda in Racing settings to use the solver.
                                        </Callout>
                                    )}
                                </Section>
                            </>
                        )}
                    </View>
                </ScrollView>

                <SheetModal
                    visible={goalPickerOpen}
                    onRequestClose={() => setGoalPickerOpen(false)}
                    header={
                        <View style={modalShellStyles.modalHeaderRow}>
                            <Text style={modalShellStyles.modalTitleMono}>CHOOSE PARENT GOAL</Text>
                            <Pressable
                                style={modalShellStyles.modalCloseChip}
                                onPress={() => setGoalPickerOpen(false)}
                                android_ripple={{ color: colors.ripple, foreground: true }}
                                accessibilityLabel="Close"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </Pressable>
                        </View>
                    }
                    footer={null}
                >
                    <View style={{ padding: SPACING.md }}>
                        <Text style={{ ...TYPE.caption, color: colors.textMuted, lineHeight: 18, marginBottom: SPACING.sm }}>
                            Pick a goal to enable parent farming. You can switch to a full character setup later.
                        </Text>
                        <Pressable
                            onPress={applyDefaultGoalPreset}
                            style={{
                                padding: SPACING.md,
                                marginBottom: SPACING.sm,
                                borderRadius: RADII.md,
                                borderWidth: 1,
                                borderColor: colors.borderHair,
                                backgroundColor: colors.surface,
                            }}
                            android_ripple={{ color: colors.ripple, foreground: true }}
                            accessibilityRole="button"
                        >
                            <Text style={{ ...TYPE.body, color: colors.brand, fontWeight: "700" }}>Quick start — G1 / Fan Parent</Text>
                        </Pressable>
                        <ParentFarmingGoalPresetGrid allowedEpithetNames={allowedEpithetNames} onApply={applyGoalPresetFromPicker} hideIntro />
                    </View>
                </SheetModal>

                <CharacterSupportFinderSheet
                    visible={supportFinderOpen}
                    initialCharacterName={smartRaceSolverCharacterPreset}
                    ownedInventory={ownedInventory}
                    onClose={() => setSupportFinderOpen(false)}
                    onApplyFriendBorrow={applyFriendBorrowFromRecommendation}
                    onApplyFullDeck={applyFullDeckFromRecommendation}
                    onEditOwnedInventory={() => setOwnedInventoryOpen(true)}
                />
                <OwnedSupportInventorySheet
                    visible={ownedInventoryOpen}
                    ownedCards={ownedInventory}
                    onClose={() => setOwnedInventoryOpen(false)}
                    onSave={saveOwnedInventory}
                />
                <ParentRunArchiveSheet visible={archiveOpen} onClose={() => setArchiveOpen(false)} />
                <ParentFarmingAnalyticsSheet visible={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
                <ParentFarmingBundleSupportSheet
                    visible={bundleSupportSheetOpen}
                    bundle={bundleSupportEditing}
                    overrides={supportBorrowOverrides}
                    onClose={() => setBundleSupportSheetOpen(false)}
                    onSave={saveBundleSupportCards}
                />
            </SearchPageProvider>
        </View>
    )
}

export default ParentFarmingSettings
