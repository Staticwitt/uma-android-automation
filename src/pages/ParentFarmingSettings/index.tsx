import { useMemo, useContext, useRef, useCallback, useState } from "react"
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native"
import { useNavigation } from "@react-navigation/native"
import Ionicons from "@react-native-vector-icons/ionicons"
import { Cpu, ChevronRight } from "lucide-react-native"
import { useTheme } from "../../context/ThemeContext"
import { BotMetaContext, GeneralMiscContext, RacingContext, defaultSettings, Settings, useSettingsSnapshot } from "../../context/BotStateContext"
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
import type { ParentFarmingCharacterBundle } from "../../lib/parentFarmingCharacterBundles"
import { buildAllowedEpithetNamesForParentBundle, aptitudesFromCharacterPreset, findCharacterPresetEntry, findParentFarmingCharacterBundle } from "../../lib/parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset, type ParentFarmingGoalPreset } from "../../lib/parentFarmingGoalPresets"
import {
    applyParentFarmingGoalPreset,
    PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY,
    enableParentFarmingCharacterBundle,
} from "../../lib/parentFarmingResolver"
import { detectParentFarmingDrift } from "../../lib/parentFarmingDrift"
import {
    PARENT_FARMING_CAREER_AUTOMATION_FLAGS,
    buildFullDeckApplyRacingPatch,
} from "../../lib/parentFarmingCareerAutomation"
import { parseSupportBorrowOverrides } from "../../lib/parentFarmingSupportBorrow"
import { applyParentFarmingPreset, disableParentFarmingMode, refreshParentFarmingSettings } from "../../lib/parentFarmingPreset"
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
import PageHeader from "../../components/PageHeader"
import InfoContainer from "../../components/InfoContainer"
import WarningContainer from "../../components/WarningContainer"
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
import { LEGACY_PARENT_SELECTION_STRATEGIES } from "../../lib/legacyParentSelection"
import { TYPE } from "../../lib/type"
import { SPACING } from "../../lib/spacing"
import { RADII } from "../../lib/radii"

/**
 * Dedicated parent-farming setup: presets, inheritance sparks, supports, and solver shortcuts.
 */
const ParentFarmingSettings = () => {
    usePerformanceLogging("ParentFarmingSettings")
    const { colors } = useTheme()
    const modalShellStyles = useModalShellStyles()
    const navigation = useNavigation()
    const { setSettings } = useContext(BotMetaContext)
    const { general } = useContext(GeneralMiscContext)
    const { racing, updateRacing } = useContext(RacingContext)
    const settings = useSettingsSnapshot()
    const scrollViewRef = useRef<ScrollView>(null)

    const [goalPickerOpen, setGoalPickerOpen] = useState(false)
    const [bundleSupportSheetOpen, setBundleSupportSheetOpen] = useState(false)
    const [bundleSupportEditing, setBundleSupportEditing] = useState<ParentFarmingCharacterBundle | null>(null)
    const [supportFinderOpen, setSupportFinderOpen] = useState(false)
    const [ownedInventoryOpen, setOwnedInventoryOpen] = useState(false)
    const [archiveOpen, setArchiveOpen] = useState(false)

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
                setSettings((prev) => disableParentFarmingMode(prev))
                return
            }
            if (parentFarmingGoalPresetKey || parentFarmingBundleKey) {
                setSettings((prev) => applyParentFarmingPreset(prev))
            } else {
                setGoalPickerOpen(true)
            }
        },
        [setSettings, parentFarmingGoalPresetKey, parentFarmingBundleKey],
    )

    const applyCharacterBundle = useCallback(
        (bundle: ParentFarmingCharacterBundle) => {
            setSettings((prev) => applyCharacterBundleToSettings(prev, bundle))
        },
        [setSettings],
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
            updateRacing({ [key]: value } as Partial<Settings["racing"]>)
        },
        [updateRacing],
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
                <PageHeader title="Parent Farming" />
                <ScrollView
                    ref={scrollViewRef}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xl }}
                >
                    <View className="m-1">
                        <Section label="Mode">
                            <SearchableItem
                                id="enable-parent-farming-mode"
                                title="Enable Parent Farming Mode"
                                description="Smart Race Solver, fan-weighted epithets, inheritance spark picking, and relaxed stat targets."
                            >
                                <Row
                                    title="Parent Farming Mode"
                                    description="Turn on after picking a character setup or goal preset below."
                                    right={<Switch checked={enableParentFarmingMode} onCheckedChange={setParentFarmingMode} />}
                                />
                            </SearchableItem>
                            {!enableParentFarmingMode && (
                                <InfoContainer style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}>
                                    Enable the mode, then choose a character setup (recommended) or goal preset. Start the bot on career selection for auto-equip, auto-borrow, legacy parent auto-select, and optional auto-start.
                                </InfoContainer>
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
                                <WarningContainer style={{ marginHorizontal: SPACING.md, marginBottom: SPACING.md }}>
                                    {parentFarmingDriftWarnings.join("\n\n")}
                                </WarningContainer>
                            )}
                        </Section>

                        {enableParentFarmingMode && (
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

                                <Section label="Career selection">
                                    <SearchableItem
                                        id="enable-auto-equip-owned-support-deck"
                                        title="Auto-equip owned support deck"
                                        description="Equip four saved owned slots at career selection before borrowing a friend card."
                                    >
                                        <Row
                                            title="Auto-equip owned supports"
                                            description={
                                                parseOwnedSupportCards(supportDeckOwnedCards).length > 0
                                                    ? `Slots: ${parseOwnedSupportCards(supportDeckOwnedCards).join(" · ")}`
                                                    : "Apply full deck below to save owned support slots."
                                            }
                                            right={
                                                <Switch
                                                    checked={enableAutoEquipOwnedSupportDeck}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableAutoEquipOwnedSupportDeck", checked)}
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                    <SearchableItem
                                        id="enable-auto-borrow-support-card"
                                        title="Auto-Borrow Support Card"
                                        description="Borrow a friend support at career selection before training."
                                    >
                                        <Row
                                            title="Auto-borrow support"
                                            description={
                                                supportBorrowNames.length > 0
                                                    ? `Priority: ${supportBorrowNames.slice(0, 3).join(" → ")}${supportBorrowNames.length > 3 ? " …" : ""}`
                                                    : "Apply a setup or full deck to load a borrow list."
                                            }
                                            right={
                                                <Switch
                                                    checked={enableAutoBorrowSupportCard}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableAutoBorrowSupportCard", checked)}
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                    <SearchableItem
                                        id="enable-auto-select-legacy-parents"
                                        title="Auto-select legacy parents"
                                        description="Use in-game Auto-Select or OCR a preferred parent pair at career selection."
                                    >
                                        <Row
                                            title="Auto-select parent pair"
                                            description={
                                                legacyParentNames.some((name) => name.length > 0)
                                                    ? `Preferred: ${legacyParentNames.filter(Boolean).join(" · ")} (OCR); otherwise in-game Auto-Select`
                                                    : "Uses the game's Auto-Select when no preferred names are set."
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
                                    </SearchableItem>
                                    <SearchableItem
                                        id="enable-auto-start-career"
                                        title="Auto-start career"
                                        description="Tap Start Career on final confirmation after supports and parents are set."
                                    >
                                        <Row
                                            title="Auto-start career"
                                            description="Skips the manual Start Career tap on final confirmation."
                                            right={
                                                <Switch
                                                    checked={enableAutoStartCareer}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableAutoStartCareer", checked)}
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                    <SearchableItem
                                        id="enable-parent-farming-multi-run"
                                        title="Multi-run parent farming"
                                        description="After each career ends, return to career selection and start another run in the same bot session."
                                    >
                                        <Row
                                            title="Multi-run loop"
                                            description={
                                                enableParentFarmingMultiRun
                                                    ? parentFarmingMultiRunCount <= 0
                                                        ? "Runs until you stop the bot manually."
                                                        : `Target: ${parentFarmingMultiRunCount} career${parentFarmingMultiRunCount === 1 ? "" : "s"} per session.`
                                                    : "Single career per bot start (default)."
                                            }
                                            right={
                                                <Switch
                                                    checked={enableParentFarmingMultiRun}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingMultiRun", checked)}
                                                />
                                            }
                                        />
                                    </SearchableItem>
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
                                            <SearchableItem
                                                id="enable-parent-farming-stop-on-quality"
                                                title="Stop on quality target"
                                                description="End the multi-run session early when a run reaches the quality score target."
                                            >
                                                <Row
                                                    title="Stop on quality target"
                                                    description={
                                                        enableParentFarmingStopOnQualityTarget
                                                            ? `Stops when parent quality ≥ ${parentFarmingQualityTargetScore} (A grade by default).`
                                                            : "Runs until career count or manual stop."
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
                                            </SearchableItem>
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
                                            <SearchableItem
                                                id="enable-parent-farming-keep-best-run"
                                                title="Keep best run summary"
                                                description="Log the highest-quality run when the multi-run session completes."
                                            >
                                                <Row
                                                    title="Track session best"
                                                    description="Logs best quality grade and score when multi-run finishes."
                                                    right={
                                                        <Switch
                                                            checked={enableParentFarmingKeepBestRun}
                                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingKeepBestRun", checked)}
                                                        />
                                                    }
                                                />
                                            </SearchableItem>
                                            <SearchableItem
                                                id="enable-parent-farming-borrow-rotation"
                                                title="Rotate borrow priority"
                                                description="Shift friend borrow priority each run in a multi-run session."
                                            >
                                                <Row
                                                    title="Rotate borrow each run"
                                                    description="Uses the next support in your borrow list on each career restart."
                                                    right={
                                                        <Switch
                                                            checked={enableParentFarmingBorrowRotation}
                                                            onCheckedChange={(checked) => updateRacingSetting("enableParentFarmingBorrowRotation", checked)}
                                                        />
                                                    }
                                                />
                                            </SearchableItem>
                                            <SearchableItem
                                                id="enable-parent-farming-stop-on-forced-fail"
                                                title="Stop on forced epithet fail"
                                                description="Stop multi-run when a forced epithet route is missed or becomes unreachable."
                                            >
                                                <Row
                                                    title="Forced epithet fail-fast"
                                                    description="Stops the session when a must-complete epithet fails or dies mid-career."
                                                    right={
                                                        <Switch
                                                            checked={enableParentFarmingStopOnForcedEpithetFail}
                                                            onCheckedChange={(checked) =>
                                                                updateRacingSetting("enableParentFarmingStopOnForcedEpithetFail", checked)
                                                            }
                                                        />
                                                    }
                                                />
                                            </SearchableItem>
                                        </View>
                                    )}
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
                                    <SearchableItem id="enable-parent-run-summary" title="Parent run summary" description="End-of-career summary in logs and Discord.">
                                        <Row
                                            title="Run summary at career end"
                                            description="Fans, stats, epithets, and spark picks."
                                            right={
                                                <Switch
                                                    checked={enableParentRunSummary}
                                                    onCheckedChange={(checked) => updateRacingSetting("enableParentRunSummary", checked)}
                                                />
                                            }
                                        />
                                    </SearchableItem>
                                    <SearchableItem
                                        id="parent-run-archive"
                                        title="Parent run history"
                                        description="Save completed parent runs on-device and compare fans and epithets across runs."
                                    >
                                        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.md }}>
                                            <Row
                                                title="Save run history"
                                                description="Stored locally when a parent-farming career ends."
                                                right={
                                                    <Switch
                                                        checked={enableParentRunArchive}
                                                        onCheckedChange={(checked) => updateRacingSetting("enableParentRunArchive", checked)}
                                                    />
                                                }
                                            />
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
                                </Section>

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
                                        <WarningContainer style={{ marginHorizontal: SPACING.md }}>
                                            Disable Force Racing and in-game race agenda in Racing settings to use the solver.
                                        </WarningContainer>
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
