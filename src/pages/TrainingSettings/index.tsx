import React, { useMemo, useContext, useEffect, useState, useRef, useCallback } from "react"
import { View, Text, ScrollView, StyleSheet, Pressable, InteractionManager, LayoutAnimation } from "react-native"
import { SheetModal } from "../../components/ui/sheet-modal"
import { ModalCheckRow, ModalFooterChip } from "../../components/ui/modal-list"
import { useModalShellStyles } from "../../components/ui/modal-shell-styles"
import { useTheme } from "../../context/ThemeContext"
import { useToast } from "../../context/ToastContext"
import { TrainingContext, GeneralMiscContext, BotMetaContext, defaultSettings, Settings, useSettingsSnapshot } from "../../context/BotStateContext"
import { ParentFarmingActivePresetChip } from "../../components/ParentFarmingActivePresetChip"
import { detectParentFarmingDrift } from "../../lib/parentFarmingDrift"
import { SPACING } from "../../lib/spacing"
import CustomSlider from "../../components/CustomSlider"
import DraggablePriorityList from "../../components/DraggablePriorityList"
import CustomSelect from "../../components/CustomSelect"
import ProfileSelector from "../../components/ProfileSelector"
import { useSettings } from "../../context/SettingsContext"
import { useProfileManager } from "../../hooks/useProfileManager"
import { applyMigrations } from "../../hooks/useSettingsManager"
import { databaseManager } from "../../lib/database"
import { DomainHeader } from "../../components/ui/domain-header"
import TabStrip, { type TabStripItem } from "../../components/ui/tab-strip"
import { SearchPageProvider } from "../../context/SearchPageContext"
import SearchableItem from "../../components/SearchableItem"
import { usePerformanceLogging } from "../../hooks/usePerformanceLogging"
import { shallowArrayEqual } from "../../lib/utils"
import { Callout } from "../../components/ui/callout"
import { SettingRow } from "../../components/ui/setting-row"
import { Row } from "../../components/ui/row"
import { Section } from "../../components/ui/section"
import { Switch } from "../../components/ui/switch"
import { TYPE } from "../../lib/type"
import { RADII } from "../../lib/radii"
import { MOTION } from "../../lib/motion"
import { ROW_PADDING_Y } from "../../lib/density"
import Ionicons from "@react-native-vector-icons/ionicons"
import { TrainingScoringSandbox } from "../../components/TrainingScoringSandbox"
import { TrainingScoringAdvanced } from "../../components/TrainingScoringAdvanced"
import { StickySandboxButton } from "../../components/TrainingScoringAdvanced/StickySandboxButton"
import { AutoTuneSuggestionsSheet } from "../../components/AutoTuneSuggestionsSheet"
import { MetaInsightsSheet } from "../../components/MetaInsightsSheet"
import { GlassFab } from "../../components/ui/glass-fab"
import { Wand2, TrendingUp } from "lucide-react-native"

type TrainingSectionTab = "all" | "priorities" | "behavior" | "scoring" | "targets"

const TRAINING_SECTION_TABS: TabStripItem[] = [
    { key: "all", label: "All" },
    { key: "priorities", label: "Priorities" },
    { key: "behavior", label: "Behavior" },
    { key: "scoring", label: "Scoring" },
    { key: "targets", label: "Targets" },
]

/**
 * The Training Settings page.
 * Provides configuration for stat prioritization, blacklists, failure chance thresholds, risky training, distance overrides,
 * stat target sliders per distance, and profile management (creation, switching, and overwriting).
 */
const TrainingSettings = () => {
    usePerformanceLogging("TrainingSettings")
    const { colors } = useTheme()
    const modalShellStyles = useModalShellStyles()
    const { training, trainingStatTarget, updateTraining, updateTrainingStatTarget: updateStatTargetSlice } = useContext(TrainingContext)
    const { misc, updateMisc } = useContext(GeneralMiscContext)
    const { setSettings } = useContext(BotMetaContext)
    const settings = useSettingsSnapshot()
    const scrollViewRef = useRef<ScrollView>(null)
    const { saveSettingsImmediate } = useSettings()
    const { currentProfileName } = useProfileManager()
    const [blacklistModalVisible, setBlacklistModalVisible] = useState(false)
    const [blacklistUraFinaleModalVisible, setBlacklistUraFinaleModalVisible] = useState(false)
    const [blacklistUnityCupModalVisible, setBlacklistUnityCupModalVisible] = useState(false)
    const [blacklistTrackblazerModalVisible, setBlacklistTrackblazerModalVisible] = useState(false)
    const [prioritizationModalVisible, setPrioritizationModalVisible] = useState(false)
    const [eventChoicePrioritizationModalVisible, setEventChoicePrioritizationModalVisible] = useState(false)
    const [summerTrainingPrioritizationModalVisible, setSummerTrainingPrioritizationModalVisible] = useState(false)
    const [distanceOpen, setDistanceOpen] = useState<{ sprint: boolean; mile: boolean; medium: boolean; long: boolean }>({
        sprint: false,
        mile: false,
        medium: false,
        long: false,
    })
    const toggleDistance = useCallback((key: "sprint" | "mile" | "medium" | "long") => {
        LayoutAnimation.configureNext(LayoutAnimation.create(MOTION.duration.base, "easeInEaseOut", "opacity"))
        setDistanceOpen((prev) => ({ ...prev, [key]: !prev[key] }))
    }, [])
    const applyDistancePreset = useCallback(
        (distance: "Sprint" | "Mile" | "Medium" | "Long", preset: "defaults" | "allmax") => {
            const p = `training${distance}StatTarget` as const
            const d = defaultSettings.trainingStatTarget
            const val = (key: keyof typeof d) => (preset === "defaults" ? (d[key] as number) : 1600)
            updateStatTargetSlice({
                [`${p}_speedStatTarget`]: val(`${p}_speedStatTarget` as keyof typeof d),
                [`${p}_staminaStatTarget`]: val(`${p}_staminaStatTarget` as keyof typeof d),
                [`${p}_powerStatTarget`]: val(`${p}_powerStatTarget` as keyof typeof d),
                [`${p}_gutsStatTarget`]: val(`${p}_gutsStatTarget` as keyof typeof d),
                [`${p}_witStatTarget`]: val(`${p}_witStatTarget` as keyof typeof d),
            } as any)
        },
        [updateStatTargetSlice]
    )
    const { showToast, showError } = useToast()
    const [scoringSandboxOpen, setScoringSandboxOpen] = useState(false)
    const [autoTuneOpen, setAutoTuneOpen] = useState(false)
    const [metaInsightsOpen, setMetaInsightsOpen] = useState(false)
    const [advancedExpanded, setAdvancedExpanded] = useState(false)
    const [activeSection, setActiveSection] = useState<TrainingSectionTab>("all")
    const showSection = useCallback((key: TrainingSectionTab) => activeSection === "all" || activeSection === key, [activeSection])

    // Initialize local state from settings, with fallback to defaults.
    const [statPrioritizationItems, setStatPrioritizationItems] = useState<string[]>(() =>
        training?.statPrioritization !== undefined ? training.statPrioritization : defaultSettings.training.statPrioritization
    )
    const [eventChoiceStatPriorityItems, setEventChoiceStatPriorityItems] = useState<string[]>(() =>
        training?.eventChoiceStatPriority !== undefined ? training.eventChoiceStatPriority : defaultSettings.training.eventChoiceStatPriority
    )
    const [summerTrainingStatPriorityItems, setSummerTrainingStatPriorityItems] = useState<string[]>(() =>
        training?.summerTrainingStatPriority !== undefined ? training.summerTrainingStatPriority : defaultSettings.training.summerTrainingStatPriority
    )
    const [blacklistItems, setBlacklistItems] = useState<string[]>(() => (training?.trainingBlacklist !== undefined ? training.trainingBlacklist : defaultSettings.training.trainingBlacklist))
    // Use a ref to track if the initial mount sync has been done to avoid redundant updates.
    const isMounted = useRef(false)

    // Two-phase mount. First paint renders the page header + profile selector (~100 ms baseline)
    // so the user sees the page immediately; the heavy body — stat selectors, ~20 stat target
    // sliders, and the rest of the checkbox grid — commits one tick later, after the navigator
    // animation has painted. Mirrors the deferral pattern that cut the Settings hub first_commit
    // by 27 % and is needed here because TrainingSettings's first_commit was ~485 ms (over the
    // 350 ms budget) on the harness.
    const [showHeavySections, setShowHeavySections] = useState(false)
    useEffect(() => {
        const handle = InteractionManager.runAfterInteractions(() => {
            setShowHeavySections(true)
        })
        return () => handle.cancel()
    }, [])

    // Merge current training settings with defaults to handle missing properties.
    // Include local state values to ensure blacklist and prioritization are current.
    const trainingSettings = useMemo(
        () => ({
            ...defaultSettings.training,
            ...training,
            trainingBlacklist: blacklistItems,
            statPrioritization: statPrioritizationItems,
            eventChoiceStatPriority: eventChoiceStatPriorityItems,
            summerTrainingStatPriority: summerTrainingStatPriorityItems,
        }),
        [training, blacklistItems, statPrioritizationItems, eventChoiceStatPriorityItems, summerTrainingStatPriorityItems]
    )

    const trainingStatTargetSettings = useMemo(() => ({ ...defaultSettings.trainingStatTarget, ...trainingStatTarget }), [trainingStatTarget])

    const parentFarmingDriftWarnings = useMemo(() => detectParentFarmingDrift(settings), [settings])

    const {
        maximumFailureChance,
        disableTrainingOnMaxedStat,
        enableRainbowTrainingBonus,
        enablePrioritizeNearMaxFriendship,
        enableBondEfficiencyCapping,
        preferredDistanceOverride,
        mustRestBeforeSummer,
        enableEnergyBanking,
        energyBankingThreshold,
        energyBankingLookaheadTurns,
        minimumMoodForTraining,
        enableRiskyTraining,
        riskyTrainingMinStatGain,
        riskyTrainingMaxFailureChance,
        trainWitDuringFinale,
        enablePrioritizeSkillHints,
        enableTrainingLevelWeighting,
        disableStatTargets,
        enableRunningStyleStaminaAdjustment,
        enableGoalRaceStatBias,
        goalRaceStatBiasLookaheadTurns,
        enableTrainingAnalysisValidation,
        enableYoloStatDetection,
        enableUnityCupTrainOnlyMode,
        preferEliteTeamOpponent,
        sparkTraitMaxRerolls,
        sparkTraitMinStars,
        manualStatCap,
    } = trainingSettings

    const blacklistUraFinaleItems = trainingSettings["trainingBlacklist_URA Finale"] ?? defaultSettings.training["trainingBlacklist_URA Finale"]
    const blacklistUnityCupItems = trainingSettings["trainingBlacklist_Unity Cup"] ?? defaultSettings.training["trainingBlacklist_Unity Cup"]
    const blacklistTrackblazerItems = trainingSettings["trainingBlacklist_Trackblazer"] ?? defaultSettings.training["trainingBlacklist_Trackblazer"]

    // Update global settings when local state changes, but skip the initial mount check.
    // We also verify that the values are actually different before triggering an update.
    useEffect(() => {
        if (isMounted.current) {
            if (!shallowArrayEqual(training?.statPrioritization, statPrioritizationItems)) {
                updateTrainingSetting("statPrioritization", statPrioritizationItems)
            }
        }
    }, [statPrioritizationItems])

    useEffect(() => {
        if (isMounted.current) {
            if (!shallowArrayEqual(training?.eventChoiceStatPriority, eventChoiceStatPriorityItems)) {
                updateTrainingSetting("eventChoiceStatPriority", eventChoiceStatPriorityItems)
            }
        }
    }, [eventChoiceStatPriorityItems])

    useEffect(() => {
        if (isMounted.current) {
            if (!shallowArrayEqual(training?.summerTrainingStatPriority, summerTrainingStatPriorityItems)) {
                updateTrainingSetting("summerTrainingStatPriority", summerTrainingStatPriorityItems)
            }
        }
    }, [summerTrainingStatPriorityItems])

    useEffect(() => {
        if (isMounted.current) {
            if (!shallowArrayEqual(training?.trainingBlacklist, blacklistItems)) {
                updateTrainingSetting("trainingBlacklist", blacklistItems)
            }
        }
    }, [blacklistItems])

    // Mark as mounted after the first render.
    useEffect(() => {
        isMounted.current = true
    }, [])

    // Sync local state when settings change (e.g., when switching profiles).
    useEffect(() => {
        const newVal = training?.trainingBlacklist
        if (newVal !== undefined && !shallowArrayEqual(newVal, blacklistItems)) {
            setBlacklistItems(newVal)
        }
    }, [training?.trainingBlacklist])

    useEffect(() => {
        const newVal = training?.statPrioritization
        if (newVal !== undefined && !shallowArrayEqual(newVal, statPrioritizationItems)) {
            setStatPrioritizationItems(newVal)
        }
    }, [training?.statPrioritization])

    useEffect(() => {
        const newVal = training?.eventChoiceStatPriority
        if (newVal !== undefined && !shallowArrayEqual(newVal, eventChoiceStatPriorityItems)) {
            setEventChoiceStatPriorityItems(newVal)
        }
    }, [training?.eventChoiceStatPriority])

    useEffect(() => {
        const newVal = training?.summerTrainingStatPriority
        if (newVal !== undefined && !shallowArrayEqual(newVal, summerTrainingStatPriorityItems)) {
            setSummerTrainingStatPriorityItems(newVal)
        }
    }, [training?.summerTrainingStatPriority])

    // Sync currentProfileName from profile manager to settings context.
    // This is now purely for the BotStateContext as the ProfileContext is the source of truth for the UI.
    useEffect(() => {
        const syncProfileName = async () => {
            const profileName = currentProfileName || ""
            if (misc.currentProfileName !== profileName) {
                updateMisc({ currentProfileName: profileName })
            }
        }
        syncProfileName()
    }, [currentProfileName])

    /**
     * Update a training setting in the global bot state.
     * @param key The key of the training setting to update.
     * @param value The value to set the setting to.
     */
    const updateTrainingSetting = useCallback(
        (key: keyof Settings["training"], value: any) => {
            updateTraining({ [key]: value } as Partial<Settings["training"]>)
        },
        [updateTraining]
    )

    /**
     * Overwrite the current settings with settings from a selected profile.
     * Applies migrations to the profile settings and merges them into the global state.
     * @param profileSettings The partial settings object from the profile.
     */
    const handleOverwriteSettings = async (profileSettings: Partial<Settings>) => {
        // Get the current profile name directly from the database to ensure we have the latest value.
        const dbProfileName = await databaseManager.getCurrentProfileName()

        // Apply settings using a functional update to avoid stale closure issues.
        let finalUpdatedSettings: Settings | null = null
        setSettings((prev) => {
            // Merge profile settings with current settings to create a complete Settings object for migration.
            const mergedSettings = {
                ...prev,
                ...profileSettings,
            } as Settings

            // Apply migrations to the merged settings.
            const { settings: migratedSettings } = applyMigrations(mergedSettings, profileSettings)

            // Create the updated settings object with the migrated profile settings.
            const updatedSettings = {
                ...migratedSettings,
                misc: {
                    ...prev.misc,
                    ...migratedSettings.misc,
                    currentProfileName: dbProfileName || "",
                },
            }
            finalUpdatedSettings = updatedSettings
            return updatedSettings
        })

        // Save settings immediately with the updated settings.
        if (finalUpdatedSettings) {
            await saveSettingsImmediate(finalUpdatedSettings)
        }
    }

    /**
     * Update a training stat target setting in the global bot state.
     * Wraps the slice updater so call sites can pass `(key, value)` rather than a partial object.
     * @param key The key of the stat target setting to update.
     * @param value The value to set the target to.
     */
    const updateTrainingStatTarget = useCallback(
        (key: keyof Settings["trainingStatTarget"], value: any) => {
            updateStatTargetSlice({ [key]: value } as Partial<Settings["trainingStatTarget"]>)
        },
        [updateStatTargetSlice]
    )

    const styles = useMemo(
        () =>
            StyleSheet.create({
                root: {
                    flex: 1,
                    flexDirection: "column",
                    justifyContent: "center",
                    margin: 10,
                    backgroundColor: colors.bg,
                },
                section: {
                    marginBottom: 24,
                },
                row: {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                },
                label: {
                    fontSize: 16,
                    color: colors.text,
                    flex: 1,
                },
                pressableText: {
                    fontSize: 16,
                    color: colors.brand,
                    textDecorationLine: "underline",
                },
                modalFooterRow: { flexDirection: "row", gap: SPACING.sm },
                selectorRow: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.sm,
                    paddingHorizontal: SPACING.md,
                    paddingVertical: SPACING.lg,
                },
                selectorMain: { flex: 1, gap: SPACING.sm },
                selectorTitle: { ...TYPE.body, color: colors.text, fontWeight: "600" as const },
                selectorDescription: { ...TYPE.caption, color: colors.textMuted, marginTop: 2 },
                selectorEmpty: { ...TYPE.caption, color: colors.textMuted, fontStyle: "italic" as const },
                selectorChips: {
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                },
                selectorChip: {
                    backgroundColor: colors.brandSubtle,
                    borderWidth: 1,
                    borderColor: colors.brandBorder,
                    borderRadius: RADII.pill,
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 2,
                },
                selectorChipText: { ...TYPE.caption, color: colors.brand, fontWeight: "600" as const },
                sliderShell: { padding: SPACING.md },
                metaText: { ...TYPE.caption, color: colors.textMuted, paddingHorizontal: SPACING.md, paddingTop: SPACING.xs, paddingBottom: SPACING.md },
                groupHeader: { padding: SPACING.md, paddingBottom: 0 },
                groupHeaderTitle: { ...TYPE.body, color: colors.text, fontWeight: "600" as const },
                groupHeaderDescription: { ...TYPE.caption, color: colors.textMuted, marginTop: 2 },
                distanceRow: {
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    paddingVertical: ROW_PADDING_Y,
                    paddingHorizontal: SPACING.lg,
                    gap: SPACING.md,
                },
                distanceRowTitle: { ...TYPE.body, color: colors.text, fontWeight: "500" as const, flex: 1 },
                distanceBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.sm },
            }),
        [colors]
    )

    /**
     * Toggle the selection of a stat within a specific list.
     * @param stat The stat to toggle.
     * @param list The current list of selected stats.
     * @param setList The state setter function to update the list.
     */
    const toggleStat = (stat: string, list: string[], setList: (value: string[]) => void) => {
        if (list.includes(stat)) {
            setList(list.filter((s) => s !== stat))
        } else {
            setList([...list, stat])
        }
    }

    /**
     * Clear all selected stats from a list.
     * @param setList The state setter function to update the list.
     */
    const clearAll = (setList: (value: string[]) => void) => {
        setList([])
    }

    /**
     * Select all available stats for a list.
     * Appends any missing items from the default stat list to the current selection.
     * @param setList The state setter function to update the list.
     * @param currentList The current list of selected stats.
     */
    const selectAll = (setList: (value: string[]) => void, currentList: string[]) => {
        // Add any missing items from default settings to the current list, preserving order.
        const missingItems = defaultSettings.training.statPrioritization.filter((stat) => !currentList.includes(stat))
        setList([...currentList, ...missingItems])
    }

    /**
     * Render a stat selector component with an interactive modal.
     * Supports both checkbox-based selection and priority-based ordering.
     * @param title The display title for the selector.
     * @param selectedStats The currently selected stats.
     * @param setSelectedStats The state setter for the selected stats.
     * @param modalVisible Whether the selection modal is currently visible.
     * @param setModalVisible The safe setter for the modal visibility state.
     * @param description An optional description for the selector.
     * @param mode The selection mode (checkbox or priority).
     * @param id The search ID for consistent search navigation.
     * @returns A React element containing the selector and its modal.
     */
    const renderStatSelector = (
        title: string,
        selectedStats: string[],
        setSelectedStats: (value: string[]) => void,
        modalVisible: boolean,
        setModalVisible: React.Dispatch<React.SetStateAction<boolean>>,
        description?: string,
        mode: "checkbox" | "priority" = "checkbox",
        id?: string
    ) => {
        const content = (
            <View>
                <Pressable style={styles.selectorRow} onPress={() => setModalVisible(true)} android_ripple={{ color: colors.ripple, foreground: true }}>
                    <View style={styles.selectorMain}>
                        <Text style={styles.selectorTitle}>{title}</Text>
                        {description ? <Text style={styles.selectorDescription}>{description}</Text> : null}
                        {selectedStats.length === 0 ? (
                            <Text style={styles.selectorEmpty}>None</Text>
                        ) : (
                            <View style={styles.selectorChips}>
                                {selectedStats.map((stat) => (
                                    <View key={stat} style={styles.selectorChip}>
                                        <Text style={styles.selectorChipText}>{stat}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>

                <SheetModal
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                    header={
                        <View style={modalShellStyles.modalHeaderRow}>
                            <Text style={modalShellStyles.modalTitleMono}>{title.toUpperCase()}</Text>
                            <Pressable
                                style={modalShellStyles.modalCloseChip}
                                onPress={() => setModalVisible(false)}
                                android_ripple={{ color: colors.ripple, foreground: true }}
                                accessibilityLabel="Close"
                            >
                                <Ionicons name="close" size={18} color={colors.text} />
                            </Pressable>
                        </View>
                    }
                    footer={
                        <View style={styles.modalFooterRow}>
                            <ModalFooterChip
                                label={mode === "priority" ? "Reset" : "Clear All"}
                                tone="danger"
                                onPress={() => {
                                    if (mode === "priority") {
                                        setSelectedStats(defaultSettings.training.statPrioritization)
                                        setModalVisible(false)
                                    } else {
                                        clearAll(setSelectedStats)
                                    }
                                }}
                            />
                            <ModalFooterChip
                                label="Select All"
                                onPress={() => {
                                    if (mode === "priority") {
                                        setSelectedStats(defaultSettings.training.statPrioritization)
                                        setModalVisible(false)
                                    } else {
                                        selectAll(setSelectedStats, selectedStats)
                                    }
                                }}
                            />
                        </View>
                    }
                >
                    {mode === "priority" ? (
                        <DraggablePriorityList
                            items={defaultSettings.training.statPrioritization.map((stat) => ({ id: stat, label: stat }))}
                            selectedItems={selectedStats}
                            onSelectionChange={setSelectedStats}
                            onOrderChange={(orderedItems) => setSelectedStats(orderedItems)}
                        />
                    ) : (
                        <View style={modalShellStyles.modalBodyList}>
                            {defaultSettings.training.statPrioritization.map((stat) => (
                                <ModalCheckRow key={stat} label={stat} checked={selectedStats.includes(stat)} onPress={() => toggleStat(stat, selectedStats, setSelectedStats)} />
                            ))}
                        </View>
                    )}
                </SheetModal>
            </View>
        )

        if (id) {
            return (
                <SearchableItem id={id} title={title} description={description}>
                    {content}
                </SearchableItem>
            )
        }

        return content
    }

    return (
        <View style={styles.root}>
            <SearchPageProvider page="TrainingSettings" scrollViewRef={scrollViewRef}>
                <DomainHeader breadcrumb="Gameplay" title="Training Settings" subtitle="Stat priorities, training behavior, scoring, and stat targets." />
                <ScrollView ref={scrollViewRef} nestedScrollEnabled={true} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="m-1">
                        <ParentFarmingActivePresetChip settings={settings} />
                        {parentFarmingDriftWarnings.length > 0 && (
                            <Callout variant="warning" style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}>
                                {parentFarmingDriftWarnings.join("\n\n")}
                            </Callout>
                        )}
                        <SearchableItem
                            id="training-settings-profile-selector"
                            title="Profile Selector"
                            description="Profiles constitute only the Training settings and stat targets."
                            style={{ marginBottom: 16 }}
                        >
                            <ProfileSelector
                                currentTrainingSettings={trainingSettings}
                                currentTrainingStatTargetSettings={trainingStatTargetSettings}
                                onOverwriteSettings={handleOverwriteSettings}
                                onNoChangesDetected={() => {
                                    showToast("Current Training settings are already the same.")
                                }}
                                onError={(message) => {
                                    showError(message)
                                }}
                            />
                        </SearchableItem>

                        {showHeavySections && (
                            <View style={{ marginBottom: SPACING.md }}>
                                <TabStrip items={TRAINING_SECTION_TABS} activeKey={activeSection} onChange={(key) => setActiveSection(key as TrainingSectionTab)} />
                            </View>
                        )}

                        {showHeavySections && showSection("priorities") && (
                            <>
                                <Section label="Priorities">
                                    {renderStatSelector(
                                        "Blacklist",
                                        blacklistItems,
                                        (value) => setBlacklistItems(value),
                                        blacklistModalVisible,
                                        setBlacklistModalVisible,
                                        "Select which stats to exclude from training. These stats will be skipped during training sessions.",
                                        "checkbox",
                                        "training-blacklist"
                                    )}

                                    {renderStatSelector(
                                        "Prioritization",
                                        statPrioritizationItems,
                                        (value) => setStatPrioritizationItems(value),
                                        prioritizationModalVisible,
                                        setPrioritizationModalVisible,
                                        "Select the priority order of the stats. The stats will be trained in the order they are selected. If none are selected, then the default order will be used.",
                                        "priority",
                                        "training-prioritization"
                                    )}

                                    {renderStatSelector(
                                        "Event Choice Prioritization",
                                        eventChoiceStatPriorityItems,
                                        (value) => setEventChoiceStatPriorityItems(value),
                                        eventChoicePrioritizationModalVisible,
                                        setEventChoicePrioritizationModalVisible,
                                        "Select the priority order of stats used when scoring in-game event choices. Events typically grant flat stat gains, so a different ordering than regular training may be optimal.",
                                        "priority",
                                        "event-choice-stat-priority"
                                    )}

                                    {renderStatSelector(
                                        "Summer Training Prioritization",
                                        summerTrainingStatPriorityItems,
                                        (value) => setSummerTrainingStatPriorityItems(value),
                                        summerTrainingPrioritizationModalVisible,
                                        setSummerTrainingPrioritizationModalVisible,
                                        "Select the priority order of stats used during Summer Training. Facility levels are maxed during summer, so a different ordering than regular training may be optimal.",
                                        "priority",
                                        "summer-training-stat-priority"
                                    )}
                                </Section>
                            </>
                        )}

                        {showHeavySections && showSection("behavior") && (
                            <>
                                <Section label="Behavior">
                                    <View style={styles.sliderShell}>
                                        <CustomSlider
                                            value={maximumFailureChance}
                                            placeholder={defaultSettings.training.maximumFailureChance}
                                            onValueChange={(value) => updateTrainingSetting("maximumFailureChance", value)}
                                            min={5}
                                            max={95}
                                            step={5}
                                            label="Set Maximum Failure Chance"
                                            labelUnit="%"
                                            showValue={true}
                                            showLabels={true}
                                            description="Set the maximum acceptable failure chance for training sessions. Training with higher failure rates will be avoided."
                                            searchId="maximum-failure-chance"
                                        />
                                    </View>

                                    <SettingRow
                                        id="disable-training-on-maxed-stats"
                                        title="Disable Training on Maxed Stats"
                                        description="When enabled, training will be skipped for stats that have reached their maximum value."
                                        right={<Switch checked={disableTrainingOnMaxedStat} onCheckedChange={(checked) => updateTrainingSetting("disableTrainingOnMaxedStat", checked)} />}
                                    />

                                    <SettingRow
                                        id="enable-riskier-training"
                                        title="Enable Riskier Training"
                                        description="When enabled, trainings with high main stat gains will use a separate, higher maximum failure chance threshold."
                                        right={<Switch checked={enableRiskyTraining} onCheckedChange={(checked) => updateTrainingSetting("enableRiskyTraining", checked)} />}
                                    />
                                    {enableRiskyTraining && (
                                        <View style={styles.sliderShell}>
                                            <CustomSlider
                                                value={riskyTrainingMinStatGain || defaultSettings.training.riskyTrainingMinStatGain}
                                                placeholder={defaultSettings.training.riskyTrainingMinStatGain}
                                                onValueChange={(value) => updateTrainingSetting("riskyTrainingMinStatGain", value)}
                                                min={20}
                                                max={100}
                                                step={5}
                                                label="Minimum Main Stat Gain Threshold"
                                                labelUnit=""
                                                showValue={true}
                                                showLabels={true}
                                                description="When a training's main stat gain meets or exceeds this value, it will be considered for risky training."
                                                searchId="risky-training-min-stat-gain"
                                                parentId="enable-riskier-training"
                                            />
                                        </View>
                                    )}
                                    {enableRiskyTraining && (
                                        <View style={styles.sliderShell}>
                                            <CustomSlider
                                                value={riskyTrainingMaxFailureChance || defaultSettings.training.riskyTrainingMaxFailureChance}
                                                placeholder={defaultSettings.training.riskyTrainingMaxFailureChance}
                                                onValueChange={(value) => updateTrainingSetting("riskyTrainingMaxFailureChance", value)}
                                                min={5}
                                                max={95}
                                                step={5}
                                                label="Risky Training Maximum Failure Chance"
                                                labelUnit="%"
                                                showValue={true}
                                                showLabels={true}
                                                description="Set the maximum acceptable failure chance for risky training sessions with high main stat gains."
                                                searchId="risky-training-max-failure-chance"
                                                parentId="enable-riskier-training"
                                            />
                                        </View>
                                    )}

                                    <SettingRow
                                        id="enable-prioritize-skill-hints"
                                        title="Prioritize Skill Hints"
                                        description="When enabled, the bot will prioritize acquiring skill hints, bypassing stat prioritization and blacklist, while still being constrained by the failure chance thresholds."
                                        right={<Switch checked={enablePrioritizeSkillHints} onCheckedChange={(checked) => updateTrainingSetting("enablePrioritizeSkillHints", checked)} />}
                                    />
                                    <SettingRow
                                        id="must-rest-before-summer"
                                        title="Must Rest before Summer"
                                        description="Optimizes June Late Phase in Classic and Senior Years for Summer Training. If Energy < 70%, it will Rest. If Energy >= 70% and Mood < Great, it will recover Mood. If Energy >= 70% and Mood is Great, it will train Wit."
                                        right={<Switch checked={mustRestBeforeSummer} onCheckedChange={(checked) => updateTrainingSetting("mustRestBeforeSummer", checked)} />}
                                    />
                                    <SettingRow
                                        id="train-wit-during-finale"
                                        title="Train Wit During Finale"
                                        description="When enabled, the bot will train Wit during URA finale turns (73, 74, 75) instead of recovering energy or mood, even if the failure chance is high."
                                        right={<Switch checked={trainWitDuringFinale} onCheckedChange={(checked) => updateTrainingSetting("trainWitDuringFinale", checked)} />}
                                    />
                                    <SettingRow
                                        id="enable-energy-banking"
                                        title="Energy Banking"
                                        description="When enabled, the bot will rest instead of training once energy drops below the threshold below, if the next mandatory race is within the lookahead window. Generalizes the Must Rest before Summer behavior to apply ahead of any mandatory race, not just before Summer Training."
                                        right={<Switch checked={enableEnergyBanking} onCheckedChange={(checked) => updateTrainingSetting("enableEnergyBanking", checked)} />}
                                    />
                                    {enableEnergyBanking && (
                                        <View style={styles.sliderShell}>
                                            <CustomSlider
                                                value={energyBankingThreshold || defaultSettings.training.energyBankingThreshold}
                                                placeholder={defaultSettings.training.energyBankingThreshold}
                                                onValueChange={(value) => updateTrainingSetting("energyBankingThreshold", value)}
                                                min={10}
                                                max={90}
                                                step={5}
                                                label="Energy Banking Threshold"
                                                labelUnit="%"
                                                showValue={true}
                                                showLabels={true}
                                                description="Energy banking only triggers when energy is below this percentage."
                                                searchId="energy-banking-threshold"
                                                parentId="enable-energy-banking"
                                            />
                                        </View>
                                    )}
                                    {enableEnergyBanking && (
                                        <View style={styles.sliderShell}>
                                            <CustomSlider
                                                value={energyBankingLookaheadTurns || defaultSettings.training.energyBankingLookaheadTurns}
                                                placeholder={defaultSettings.training.energyBankingLookaheadTurns}
                                                onValueChange={(value) => updateTrainingSetting("energyBankingLookaheadTurns", value)}
                                                min={1}
                                                max={5}
                                                step={1}
                                                label="Energy Banking Lookahead"
                                                labelUnit=" turns"
                                                showValue={true}
                                                showLabels={true}
                                                description="How many turns before the next mandatory race energy banking starts checking."
                                                searchId="energy-banking-lookahead-turns"
                                                parentId="enable-energy-banking"
                                            />
                                        </View>
                                    )}
                                    <SearchableItem
                                        id="minimum-mood-for-training"
                                        title="Minimum Mood for Training"
                                        description="The bot will train through any mood at or above this threshold without forcing a mood-recovery outing. Below this threshold, mood recovery is forced as usual."
                                    >
                                        <Row
                                            title="Minimum Mood for Training"
                                            description="The bot will train through any mood at or above this threshold without forcing a mood-recovery outing. Below this threshold, mood recovery is forced as usual."
                                            right={
                                                <CustomSelect
                                                    value={minimumMoodForTraining}
                                                    onValueChange={(value) => updateTrainingSetting("minimumMoodForTraining", value)}
                                                    options={[
                                                        { label: "Bad", value: "BAD" },
                                                        { label: "Normal", value: "NORMAL" },
                                                        { label: "Good", value: "GOOD" },
                                                        { label: "Great", value: "GREAT" },
                                                    ]}
                                                    placeholder="Select mood"
                                                    width={140}
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                </Section>

                                <Section label="URA Finale">
                                    {renderStatSelector(
                                        "Blacklist (URA Finale only)",
                                        blacklistUraFinaleItems,
                                        (value) => updateTrainingSetting("trainingBlacklist_URA Finale", value),
                                        blacklistUraFinaleModalVisible,
                                        setBlacklistUraFinaleModalVisible,
                                        "Stats to skip only when playing URA Finale. Overrides the global blacklist for this scenario. Leave empty to use the global blacklist.",
                                        "checkbox",
                                        "training-blacklist-ura-finale"
                                    )}
                                </Section>

                                <Section label="Unity Cup">
                                    <SearchableItem id="enable-unity-cup-train-only-mode">
                                        <SettingRow
                                            id="enable-unity-cup-train-only-mode"
                                            title="Train-Only Mode"
                                            description="When enabled, the bot will always choose to train instead of racing optional races during Unity Cup. Mandatory race days, scheduled races, fan/trophy requirements, and Unity Cup race events are still run normally."
                                            right={<Switch checked={enableUnityCupTrainOnlyMode} onCheckedChange={(checked) => updateTrainingSetting("enableUnityCupTrainOnlyMode", checked)} />}
                                        />
                                    </SearchableItem>
                                    <SearchableItem id="prefer-elite-team-opponent">
                                        <SettingRow
                                            id="prefer-elite-team-opponent"
                                            title="Prefer Elite Team Opponent"
                                            description="When enabled, deliberately seeks out and challenges the pink-highlighted 'Elite Team' opponent at the 4th Preseason race when one is offered (requires rank 10th+, Team Rank A+, and at least one Extreme Spirit Burst), instead of picking based on race-prediction favorability. Beating it unlocks a stronger Team Zenith in the Finals with better rewards."
                                            right={<Switch checked={preferEliteTeamOpponent} onCheckedChange={(checked) => updateTrainingSetting("preferEliteTeamOpponent", checked)} />}
                                        />
                                    </SearchableItem>
                                    {renderStatSelector(
                                        "Blacklist (Unity Cup only)",
                                        blacklistUnityCupItems,
                                        (value) => updateTrainingSetting("trainingBlacklist_Unity Cup", value),
                                        blacklistUnityCupModalVisible,
                                        setBlacklistUnityCupModalVisible,
                                        "Stats to skip only when playing Unity Cup. Overrides the global blacklist for this scenario. Leave empty to use the global blacklist.",
                                        "checkbox",
                                        "training-blacklist-unity-cup"
                                    )}
                                </Section>

                                <Section label="Trackblazer">
                                    {renderStatSelector(
                                        "Blacklist (Trackblazer only)",
                                        blacklistTrackblazerItems,
                                        (value) => updateTrainingSetting("trainingBlacklist_Trackblazer", value),
                                        blacklistTrackblazerModalVisible,
                                        setBlacklistTrackblazerModalVisible,
                                        "Stats to skip only when playing Trackblazer. Overrides the global blacklist for this scenario. Leave empty to use the global blacklist.",
                                        "checkbox",
                                        "training-blacklist-trackblazer"
                                    )}
                                </Section>

                                <Section label="Spark Traits">
                                    <View style={styles.sliderShell}>
                                        <CustomSlider
                                            value={sparkTraitMaxRerolls}
                                            placeholder={defaultSettings.training.sparkTraitMaxRerolls}
                                            onValueChange={(value) => updateTrainingSetting("sparkTraitMaxRerolls", value)}
                                            min={0}
                                            max={20}
                                            step={1}
                                            label="Max Rerolls per Spark"
                                            showValue={true}
                                            showLabels={true}
                                            description="Maximum number of times to reroll all spark traits on the Traits screen. Set to 0 to disable auto-reroll."
                                            searchId="spark-trait-max-rerolls"
                                        />
                                    </View>
                                    {sparkTraitMaxRerolls > 0 && (
                                        <View style={styles.sliderShell}>
                                            <CustomSlider
                                                value={sparkTraitMinStars}
                                                placeholder={defaultSettings.training.sparkTraitMinStars}
                                                onValueChange={(value) => updateTrainingSetting("sparkTraitMinStars", value)}
                                                min={0}
                                                max={10}
                                                step={1}
                                                label="Stop at Star Count"
                                                showValue={true}
                                                showLabels={true}
                                                description="Stop rerolling early once the total ★ count on the traits screen reaches this threshold. Set to 0 to always use the maximum rerolls."
                                                searchId="spark-trait-min-stars"
                                            />
                                        </View>
                                    )}
                                </Section>
                            </>
                        )}

                        {showHeavySections && showSection("scoring") && (
                            <>
                                <Section label="Scoring">
                                    <SettingRow
                                        id="enable-training-level-weighting"
                                        title="Weight Score by Training Level"
                                        description="When enabled (Year 2+), the bot reads each training's level (1-5) via OCR and boosts the score for trainings whose stat sits in the top 3 of your Stat Prioritization list. Helps the bot stick with stats you've invested in. OCR is skipped during Pre-Debut, Junior, and Summer."
                                        right={<Switch checked={enableTrainingLevelWeighting} onCheckedChange={(checked) => updateTrainingSetting("enableTrainingLevelWeighting", checked)} />}
                                    />
                                    <SettingRow
                                        id="enable-rainbow-training-bonus"
                                        title="Rainbow Training Bonus"
                                        searchTitle="Enable Rainbow Training Bonus"
                                        description="When enabled (Year 2+), rainbow trainings receive a significant bonus to their score, making them more likely to be selected. This is highly dependent on device configuration and may result in false positives."
                                        right={<Switch checked={enableRainbowTrainingBonus} onCheckedChange={(checked) => updateTrainingSetting("enableRainbowTrainingBonus", checked)} />}
                                    />
                                    <SettingRow
                                        id="enable-prioritize-near-max-friendship"
                                        title="Near-Max Friendship Boost"
                                        searchTitle="Prioritize Near-Max Friendship Bars"
                                        description="When enabled (Year 2+), trainings with multiple green/blue friendship bars close to maxing receive an anticipatory rainbow multiplier, helping the bot favor them so the bars cross into orange and unlock rainbow training on later turns. Does not stack with the actual rainbow bonus."
                                        right={
                                            <Switch
                                                checked={enablePrioritizeNearMaxFriendship}
                                                onCheckedChange={(checked) => updateTrainingSetting("enablePrioritizeNearMaxFriendship", checked)}
                                            />
                                        }
                                    />
                                    <SettingRow
                                        id="enable-bond-efficiency-capping"
                                        title="Bond Efficiency Capping"
                                        searchTitle="Enable Bond Efficiency Capping"
                                        description="When enabled, friendship bars that are already fully maxed (orange at 100% fill) are excluded from a training's relationship score, so bonding effort is redirected toward cards that still benefit from more bonding. Does not affect the rainbow bonus for an active rainbow training."
                                        right={
                                            <Switch
                                                checked={enableBondEfficiencyCapping}
                                                onCheckedChange={(checked) => updateTrainingSetting("enableBondEfficiencyCapping", checked)}
                                            />
                                        }
                                    />
                                </Section>

                                <TrainingScoringAdvanced onExpandedChange={setAdvancedExpanded} />
                            </>
                        )}

                        {showHeavySections && showSection("targets") && (
                            <>
                                <Section label="Detection">
                                    <SettingRow
                                        id="enable-training-analysis-validation"
                                        title="Training Analysis Validation"
                                        searchTitle="Enable Training Analysis Validation"
                                        description="When enabled, the bot will validate the current selected stat during training analysis. This helps prevent the bot from accidentally training a stat during analysis at the cost of a significant increase in scenario completion time."
                                        right={
                                            <Switch checked={enableTrainingAnalysisValidation} onCheckedChange={(checked) => updateTrainingSetting("enableTrainingAnalysisValidation", checked)} />
                                        }
                                    />
                                    <SettingRow
                                        id="enable-yolo-stat-detection"
                                        title="YOLO Stat Detection"
                                        searchTitle="Enable YOLO Stat Detection"
                                        description="When enabled, the bot will use a custom YOLOv8 model for high-precision stat gain detection. This replaces the standard OCR/Template matching for stat gains."
                                        right={<Switch checked={enableYoloStatDetection} onCheckedChange={(checked) => updateTrainingSetting("enableYoloStatDetection", checked)} />}
                                    />
                                </Section>
                                {enableTrainingAnalysisValidation && (
                                    <Callout variant="warning" style={{ marginTop: -SPACING.md, marginBottom: SPACING.lg }}>
                                        Warning: Enabling Training Analysis Validation prevents accidental trainings at the cost of significantly slower scenario completion.
                                    </Callout>
                                )}

                                <Section label="Distance">
                                    <SearchableItem
                                        id="preferred-distance-override"
                                        title="Preferred Distance Override"
                                        description="Set the preferred race distance for training targets. Auto picks based on character aptitudes."
                                    >
                                        <Row
                                            title="Preferred Distance"
                                            description="Set the preferred race distance for training targets. Auto picks based on character aptitudes."
                                            right={
                                                <CustomSelect
                                                    value={preferredDistanceOverride}
                                                    onValueChange={(value) => updateTrainingSetting("preferredDistanceOverride", value)}
                                                    options={[
                                                        { label: "Auto", value: "Auto" },
                                                        { label: "Sprint", value: "Sprint" },
                                                        { label: "Mile", value: "Mile" },
                                                        { label: "Medium", value: "Medium" },
                                                        { label: "Long", value: "Long" },
                                                    ]}
                                                    placeholder="Select distance"
                                                    width={140}
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                    <SettingRow
                                        id="enable-running-style-stamina-adjustment"
                                        title="Running Style Stamina Adjustment"
                                        description="Scale the stamina stat target by the trainee's running style: Front Runners need less stamina to hold the lead, End Closers more to close from the back. Applies on top of the built-in per-style stat bias. Off by default."
                                        right={
                                            <Switch checked={enableRunningStyleStaminaAdjustment} onCheckedChange={(checked) => updateTrainingSetting("enableRunningStyleStaminaAdjustment", checked)} />
                                        }
                                    />
                                    <SettingRow
                                        id="disable-stat-targets"
                                        title="Disable Stat Targets"
                                        description="When enabled, all per-distance stat targets below are ignored. Every stat is treated as having a target equal to the in-game stat cap, so the bot will keep pushing your top priority stats even after they would normally be considered 'done.' Useful when you want strict adherence to your Stat Prioritization list."
                                        right={<Switch checked={disableStatTargets} onCheckedChange={(checked) => updateTrainingSetting("disableStatTargets", checked)} />}
                                    />
                                    <View style={styles.sliderShell}>
                                        <CustomSlider
                                            searchId="manual-stat-cap"
                                            value={manualStatCap ?? 0}
                                            placeholder={0}
                                            onValueChange={(value) => updateTrainingSetting("manualStatCap", value)}
                                            min={0}
                                            max={2000}
                                            step={50}
                                            label="OCR Stat Cap Override"
                                            showValue={true}
                                            showLabels={true}
                                            description="Maximum stat value the OCR will accept as valid (0 = auto, 1800). Raise this if the bot rejects legitimate post-1200 stat reads after the July 2026 extended-cap update."
                                        />
                                    </View>
                                    <SettingRow
                                        id="enable-goal-race-stat-bias"
                                        title="Goal Race Stat Reallocation"
                                        searchTitle="Enable Goal Race Stat Reallocation"
                                        description="When enabled, if the next mandatory race is within the lookahead window below, stat targets are resolved using that race's actual distance instead of your preferred distance, so training leads into the goal race appropriately even when it differs from your long-term build. Off by default."
                                        right={<Switch checked={enableGoalRaceStatBias} onCheckedChange={(checked) => updateTrainingSetting("enableGoalRaceStatBias", checked)} />}
                                    />
                                    {enableGoalRaceStatBias && (
                                        <View style={styles.sliderShell}>
                                            <CustomSlider
                                                value={goalRaceStatBiasLookaheadTurns || defaultSettings.training.goalRaceStatBiasLookaheadTurns}
                                                placeholder={defaultSettings.training.goalRaceStatBiasLookaheadTurns}
                                                onValueChange={(value) => updateTrainingSetting("goalRaceStatBiasLookaheadTurns", value)}
                                                min={1}
                                                max={5}
                                                step={1}
                                                label="Goal Race Lookahead"
                                                labelUnit=" turns"
                                                showValue={true}
                                                showLabels={true}
                                                description="How many turns before the next mandatory race its distance starts being used for stat targets."
                                                searchId="goal-race-stat-bias-lookahead-turns"
                                                parentId="enable-goal-race-stat-bias"
                                            />
                                        </View>
                                    )}

                                    {/* Per-distance stat targets stay nested inside the Distance section so the whole distance domain reads as one block. */}
                                    <View style={disableStatTargets ? { opacity: 0.5 } : undefined} pointerEvents={disableStatTargets ? "none" : "auto"}>
                                        <SearchableItem id="stat-targets-by-distance" title="Stat Targets by Distance" description="Set target values for each stat based on race distance.">
                                            <View style={{ padding: SPACING.md, paddingBottom: 0 }}>
                                                <Text style={[TYPE.body, { color: colors.text, fontWeight: "600" as const }]}>Stat Targets by Distance</Text>
                                                <Text style={[TYPE.caption, { color: colors.textMuted, marginTop: 2 }]}>Set target values for each stat based on race distance.</Text>
                                            </View>
                                        </SearchableItem>

                                        {/* Distance Stat Targets - bare collapsible Sections so they sit inside the parent Distance card without nested borders. */}
                                        <View>
                                            <Pressable
                                                onPress={() => toggleDistance("sprint")}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                style={styles.distanceRow}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: distanceOpen.sprint }}
                                            >
                                                <Text style={styles.distanceRowTitle}>Sprint Distance</Text>
                                                <Ionicons name={distanceOpen.sprint ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                                            </Pressable>
                                            {distanceOpen.sprint && (
                                                <View style={styles.distanceBody}>
                                                    <View style={{ flexDirection: "row", gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: "wrap" }}>
                                                        {(["Reset Defaults", "All Max"] as const).map((label) => (
                                                            <Pressable
                                                                key={label}
                                                                onPress={() => applyDistancePreset("Sprint", label === "All Max" ? "allmax" : "defaults")}
                                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                                style={{ paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                                                            >
                                                                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{label}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </View>
                                                    <CustomSlider
                                                        value={trainingStatTargetSettings.trainingSprintStatTarget_speedStatTarget}
                                                        placeholder={defaultSettings.trainingStatTarget.trainingSprintStatTarget_speedStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingSprintStatTarget_speedStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Sprint Speed Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingSprintStatTarget_staminaStatTarget}
                                                        value={trainingStatTargetSettings.trainingSprintStatTarget_staminaStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingSprintStatTarget_staminaStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Sprint Stamina Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingSprintStatTarget_powerStatTarget}
                                                        value={trainingStatTargetSettings.trainingSprintStatTarget_powerStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingSprintStatTarget_powerStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Sprint Power Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingSprintStatTarget_gutsStatTarget}
                                                        value={trainingStatTargetSettings.trainingSprintStatTarget_gutsStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingSprintStatTarget_gutsStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Sprint Guts Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingSprintStatTarget_witStatTarget}
                                                        value={trainingStatTargetSettings.trainingSprintStatTarget_witStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingSprintStatTarget_witStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Sprint Wit Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        <View>
                                            <Pressable
                                                onPress={() => toggleDistance("mile")}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                style={styles.distanceRow}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: distanceOpen.mile }}
                                            >
                                                <Text style={styles.distanceRowTitle}>Mile Distance</Text>
                                                <Ionicons name={distanceOpen.mile ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                                            </Pressable>
                                            {distanceOpen.mile && (
                                                <View style={styles.distanceBody}>
                                                    <View style={{ flexDirection: "row", gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: "wrap" }}>
                                                        {(["Reset Defaults", "All Max"] as const).map((label) => (
                                                            <Pressable
                                                                key={label}
                                                                onPress={() => applyDistancePreset("Mile", label === "All Max" ? "allmax" : "defaults")}
                                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                                style={{ paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                                                            >
                                                                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{label}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </View>
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMileStatTarget_speedStatTarget}
                                                        value={trainingStatTargetSettings.trainingMileStatTarget_speedStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMileStatTarget_speedStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Mile Speed Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMileStatTarget_staminaStatTarget}
                                                        value={trainingStatTargetSettings.trainingMileStatTarget_staminaStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMileStatTarget_staminaStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Mile Stamina Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMileStatTarget_powerStatTarget}
                                                        value={trainingStatTargetSettings.trainingMileStatTarget_powerStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMileStatTarget_powerStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Mile Power Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMileStatTarget_gutsStatTarget}
                                                        value={trainingStatTargetSettings.trainingMileStatTarget_gutsStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMileStatTarget_gutsStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Mile Guts Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMileStatTarget_witStatTarget}
                                                        value={trainingStatTargetSettings.trainingMileStatTarget_witStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMileStatTarget_witStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Mile Wit Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        <View>
                                            <Pressable
                                                onPress={() => toggleDistance("medium")}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                style={styles.distanceRow}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: distanceOpen.medium }}
                                            >
                                                <Text style={styles.distanceRowTitle}>Medium Distance</Text>
                                                <Ionicons name={distanceOpen.medium ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                                            </Pressable>
                                            {distanceOpen.medium && (
                                                <View style={styles.distanceBody}>
                                                    <View style={{ flexDirection: "row", gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: "wrap" }}>
                                                        {(["Reset Defaults", "All Max"] as const).map((label) => (
                                                            <Pressable
                                                                key={label}
                                                                onPress={() => applyDistancePreset("Medium", label === "All Max" ? "allmax" : "defaults")}
                                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                                style={{ paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                                                            >
                                                                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{label}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </View>
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMediumStatTarget_speedStatTarget}
                                                        value={trainingStatTargetSettings.trainingMediumStatTarget_speedStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMediumStatTarget_speedStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Medium Speed Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMediumStatTarget_staminaStatTarget}
                                                        value={trainingStatTargetSettings.trainingMediumStatTarget_staminaStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMediumStatTarget_staminaStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Medium Stamina Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMediumStatTarget_powerStatTarget}
                                                        value={trainingStatTargetSettings.trainingMediumStatTarget_powerStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMediumStatTarget_powerStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Medium Power Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMediumStatTarget_gutsStatTarget}
                                                        value={trainingStatTargetSettings.trainingMediumStatTarget_gutsStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMediumStatTarget_gutsStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Medium Guts Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingMediumStatTarget_witStatTarget}
                                                        value={trainingStatTargetSettings.trainingMediumStatTarget_witStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingMediumStatTarget_witStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Medium Wit Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        <View>
                                            <Pressable
                                                onPress={() => toggleDistance("long")}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                style={styles.distanceRow}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: distanceOpen.long }}
                                            >
                                                <Text style={styles.distanceRowTitle}>Long Distance</Text>
                                                <Ionicons name={distanceOpen.long ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                                            </Pressable>
                                            {distanceOpen.long && (
                                                <View style={styles.distanceBody}>
                                                    <View style={{ flexDirection: "row", gap: SPACING.xs, marginBottom: SPACING.sm, flexWrap: "wrap" }}>
                                                        {(["Reset Defaults", "All Max"] as const).map((label) => (
                                                            <Pressable
                                                                key={label}
                                                                onPress={() => applyDistancePreset("Long", label === "All Max" ? "allmax" : "defaults")}
                                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                                style={{ paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                                                            >
                                                                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>{label}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </View>
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingLongStatTarget_speedStatTarget}
                                                        value={trainingStatTargetSettings.trainingLongStatTarget_speedStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingLongStatTarget_speedStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Long Speed Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingLongStatTarget_staminaStatTarget}
                                                        value={trainingStatTargetSettings.trainingLongStatTarget_staminaStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingLongStatTarget_staminaStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Long Stamina Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingLongStatTarget_powerStatTarget}
                                                        value={trainingStatTargetSettings.trainingLongStatTarget_powerStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingLongStatTarget_powerStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Long Power Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingLongStatTarget_gutsStatTarget}
                                                        value={trainingStatTargetSettings.trainingLongStatTarget_gutsStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingLongStatTarget_gutsStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Long Guts Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                    <CustomSlider
                                                        placeholder={defaultSettings.trainingStatTarget.trainingLongStatTarget_witStatTarget}
                                                        value={trainingStatTargetSettings.trainingLongStatTarget_witStatTarget}
                                                        onValueChange={(value) => updateTrainingStatTarget("trainingLongStatTarget_witStatTarget", value)}
                                                        min={100}
                                                        max={1600}
                                                        step={10}
                                                        label="Long Wit Target"
                                                        labelUnit=""
                                                        showValue={true}
                                                        showLabels={true}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </Section>

                                {/* Training Year Milestone Targets - intro + first slider live in one child wrapper so no divider/gap sits between them. */}
                                <Section label="Year Milestones">
                                    <View>
                                        <SearchableItem
                                            id="training-year-milestone-targets"
                                            title="Training Year Milestone Targets"
                                            description="Controls how aggressively the bot paces stat training during the Pre-Debut, Junior and Classic Years."
                                        >
                                            <View style={styles.groupHeader}>
                                                <Text style={styles.groupHeaderTitle}>Year Milestone Pacing</Text>
                                                <Text style={styles.groupHeaderDescription}>Controls how aggressively the bot paces stat training during the Pre-Debut, Junior and Classic Years.</Text>
                                            </View>
                                        </SearchableItem>
                                        <View style={[styles.sliderShell, { paddingTop: 0 }]}>
                                            <SearchableItem
                                                id="junior-milestone-percent"
                                                title="End of Junior Year Milestone"
                                                description="Percentage of the primary stat targets to aim for by the end of Junior Year."
                                            >
                                                <CustomSlider
                                                    value={trainingSettings.classicMilestonePercent}
                                                    placeholder={defaultSettings.training.classicMilestonePercent}
                                                    onValueChange={(value) => updateTrainingSetting("classicMilestonePercent", value)}
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    label="End of Junior Year Milestone"
                                                    labelUnit="%"
                                                    showValue={true}
                                                    showLabels={true}
                                                    description="Percentage of the primary stat targets to aim for by the end of Junior Year."
                                                />
                                            </SearchableItem>
                                        </View>
                                    </View>
                                    <View style={styles.sliderShell}>
                                        <SearchableItem
                                            id="classic-milestone-percent"
                                            title="End of Classic Year Milestone"
                                            description="Percentage of the primary stat targets to aim for by the end of Classic Year."
                                        >
                                            <CustomSlider
                                                value={trainingSettings.seniorMilestonePercent}
                                                placeholder={defaultSettings.training.seniorMilestonePercent}
                                                onValueChange={(value) => updateTrainingSetting("seniorMilestonePercent", value)}
                                                min={0}
                                                max={100}
                                                step={1}
                                                label="End of Classic Year Milestone"
                                                labelUnit="%"
                                                showValue={true}
                                                showLabels={true}
                                                description="Percentage of the primary stat targets to aim for by the end of Classic Year."
                                            />
                                        </SearchableItem>
                                    </View>
                                </Section>

                            </>
                        )}
                    </View>
                </ScrollView>
            </SearchPageProvider>
            {advancedExpanded && <StickySandboxButton onPress={() => setScoringSandboxOpen(true)} />}
            <TrainingScoringSandbox open={scoringSandboxOpen} onClose={() => setScoringSandboxOpen(false)} />
            <GlassFab
                onPress={() => setMetaInsightsOpen(true)}
                accessibilityLabel="Open cross-run insights"
                icon={<TrendingUp size={22} color={colors.brand} />}
                style={{ position: "absolute", left: SPACING.lg, bottom: SPACING.lg + 64 }}
            />
            <GlassFab
                onPress={() => setAutoTuneOpen(true)}
                accessibilityLabel="Open auto-tune suggestions"
                icon={<Wand2 size={22} color={colors.brand} />}
                style={{ position: "absolute", left: SPACING.lg, bottom: SPACING.lg }}
            />
            <AutoTuneSuggestionsSheet visible={autoTuneOpen} onClose={() => setAutoTuneOpen(false)} />
            <MetaInsightsSheet visible={metaInsightsOpen} onClose={() => setMetaInsightsOpen(false)} />
        </View>
    )
}

export default React.memo(TrainingSettings)
