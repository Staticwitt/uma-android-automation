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
import { ParentFarmingSetupTabs } from "../../components/ParentFarmingSetupTabs"
import type { ParentFarmingCharacterBundle } from "../../lib/parentFarmingCharacterBundles"
import { buildAllowedEpithetNamesForParentBundle, aptitudesFromCharacterPreset, findCharacterPresetEntry } from "../../lib/parentFarmingCharacterBundles"
import { findParentFarmingGoalPreset, type ParentFarmingGoalPreset } from "../../lib/parentFarmingGoalPresets"
import {
    applyParentFarmingGoalPreset,
    PARENT_FARMING_DEFAULT_GOAL_PRESET_KEY,
    enableParentFarmingCharacterBundle,
} from "../../lib/parentFarmingResolver"
import { detectParentFarmingDrift } from "../../lib/parentFarmingDrift"
import { parseSupportBorrowOverrides } from "../../lib/parentFarmingSupportBorrow"
import { applyParentFarmingPreset, disableParentFarmingMode } from "../../lib/parentFarmingPreset"
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
import { GlassSurface } from "../../components/ui/glass-surface"
import { SheetModal } from "../../components/ui/sheet-modal"
import { useModalShellStyles } from "../../components/ui/modal-shell-styles"
import { recommendSupportDeckForCharacter, parseOwnedSupportCards, formatSupportDeckClipboard } from "../../lib/recommendSupportDeck"
import { copyToClipboard } from "../../lib/utils"
import { SPARK_SELECTION_STRATEGIES } from "../../lib/sparkSelection"
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

    const racingSettings = { ...defaultSettings.racing, ...racing }
    const {
        enableParentFarmingMode,
        enableParentRunSummary,
        sparkSelectionStrategy,
        enableAutoBorrowSupportCard,
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

    const supportBorrowOverrides = useMemo(
        () => parseSupportBorrowOverrides(parentFarmingSupportBorrowOverrides),
        [parentFarmingSupportBorrowOverrides],
    )

    const parentFarmingDriftWarnings = useMemo(() => detectParentFarmingDrift(settings), [settings])

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
                return {
                    ...prev,
                    racing: {
                        ...prev.racing,
                        supportBorrowPreferredCards: JSON.stringify(borrowOrder),
                        supportDeckOwnedCards: JSON.stringify(ownedCards),
                        ownedSupportCards: JSON.stringify(ownedCards),
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

    const updateRacingSetting = useCallback(
        (key: keyof Settings["racing"], value: unknown) => {
            updateRacing({ [key]: value } as Partial<Settings["racing"]>)
        },
        [updateRacing],
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
                                    Enable the mode, then choose a character setup (recommended) or goal preset. Start the bot on career selection for auto-borrow support cards.
                                </InfoContainer>
                            )}
                            <ParentFarmingActivePresetChip settings={settings} />
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
                                        id="enable-auto-borrow-support-card"
                                        title="Auto-Borrow Support Card"
                                        description="Borrow a friend support at career selection before training."
                                    >
                                        <Row
                                            title="Auto-borrow support"
                                            description={
                                                supportBorrowNames.length > 0
                                                    ? `Priority: ${supportBorrowNames.slice(0, 3).join(" → ")}${supportBorrowNames.length > 3 ? " …" : ""}`
                                                    : "Apply a setup to load a support priority list."
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
                                                            <Text style={{ ...TYPE.caption, color: colors.brand, fontWeight: "600" }}>Apply full deck</Text>
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
