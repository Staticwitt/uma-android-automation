import { useMemo, useContext, useEffect, useState, useRef, useCallback } from "react"
import { SearchPageProvider } from "../../context/SearchPageContext"
import { BotMetaContext, GeneralMiscContext } from "../../context/BotStateContext"
import { Dimensions, InteractionManager, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@react-native-vector-icons/ionicons"
import ThemeToggle from "../../components/ThemeToggle"
import { useTheme } from "../../context/ThemeContext"
import CustomSelect from "../../components/CustomSelect"
import CustomSlider from "../../components/CustomSlider"
import CustomButton from "../../components/CustomButton"
import { DomainHeader } from "../../components/ui/domain-header"
import { Callout } from "../../components/ui/callout"
import { SettingRow } from "../../components/ui/setting-row"
import { SettingsHubNav } from "../../components/settings/SettingsHubNav"
import { Section } from "../../components/ui/section"
import { Switch } from "../../components/ui/switch"
import { Row } from "../../components/ui/row"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog"
import SearchableItem from "../../components/SearchableItem"
import SeasonCalendar, { useSeasonCalendarStyles } from "../../components/SeasonCalendar"
import { Popover, PopoverContent, PopoverTrigger, usePopoverRootContext } from "../../components/ui/popover"
import { formatCareerTurn, turnDateLabel } from "../../lib/solver/constants"
import { DATING_SCHEDULE_CUSTOM, DATING_SCHEDULE_PRESETS, DATING_SCHEDULE_COMBOS, createDatingCardSchedule, parseDatingCardsImport, type DatingCardSchedule } from "../../lib/datingSchedule"
import { Input } from "../../components/ui/input"
import { useSettings } from "../../context/SettingsContext"
import { useSettingsFileManager } from "../../hooks/useSettingsFileManager"
import { usePerformanceLogging } from "../../hooks/usePerformanceLogging"
import { useToast } from "../../context/ToastContext"
import { TYPE } from "../../lib/type"
import { SPACING } from "../../lib/spacing"
import { RADII } from "../../lib/radii"
import { logErrorWithTimestamp } from "../../lib/logger"
import * as DocumentPicker from "expo-document-picker"
import { File } from "expo-file-system"

/** GitHub Actions page for the game-data scraper workflow; shows the "Run workflow" button for signed-in maintainers. */
const GAME_DATA_WORKFLOW_URL = "https://github.com/Staticwitt/uma-android-automation/actions/workflows/update-game-data.yml"

/** Preset options for the recreation dating-schedule selector, plus a Custom entry for hand-editing the calendar. */
const datingPresetOptions = [...Object.entries(DATING_SCHEDULE_PRESETS).map(([value, preset]) => ({ label: preset.label, value })), { label: "Custom", value: DATING_SCHEDULE_CUSTOM }]

/** Props for RecreationDateActions. */
interface RecreationDateActionsProps {
    /** The career turn (1-72) this popover is acting on. */
    turn: number
    /** Whether this turn is currently pinned as a regular recreation date. */
    isRecreation: boolean
    /** Whether this turn is currently the single Pure Passion final date. */
    isPurePassion: boolean
    /** Marks the turn as a regular recreation date, or clears it when toggled off. */
    onMark: (turn: number) => void
    /** Sets the turn as the single Pure Passion final date. */
    onSetPurePassion: (turn: number) => void
    /** Clears the turn from whichever role it currently holds. */
    onClear: (turn: number) => void
}

/**
 * The recreation-cell popover body: one switch pins the turn as a regular Recreation date and one marks it as the single Pure Passion final date.
 * Only one turn can be the Pure Passion date, so toggling it on moves it here off any other turn. Reads the popover root context so each toggle also dismisses the popover.
 * @param turn The career turn this popover is acting on.
 * @param isRecreation Whether this turn is currently pinned as a regular recreation date.
 * @param isPurePassion Whether this turn is currently the single Pure Passion final date.
 * @param onMark Marks the turn as a regular recreation date.
 * @param onSetPurePassion Sets the turn as the single Pure Passion final date.
 * @param onClear Clears the turn from whichever role it currently holds.
 * @returns The rendered switch rows.
 */
function RecreationDateActions({ turn, isRecreation, isPurePassion, onMark, onSetPurePassion, onClear }: RecreationDateActionsProps) {
    const { onOpenChange } = usePopoverRootContext()
    // Toggling a role on applies it; toggling off clears the turn. Either way the popover dismisses.
    const toggleRole = (value: boolean, apply: (turn: number) => void) => {
        if (value) apply(turn)
        else onClear(turn)
        onOpenChange(false)
    }
    return (
        <>
            <Row title="Recreation date" right={<Switch checked={isRecreation} onCheckedChange={(value) => toggleRole(value, onMark)} />} />
            <Row
                title="Pure Passion final date"
                description="Only one date can trigger Pure Passion."
                right={<Switch checked={isPurePassion} onCheckedChange={(value) => toggleRole(value, onSetPurePassion)} />}
            />
        </>
    )
}

/**
 * The main Settings page of the application.
 * Provides scenario selection, navigation links to sub-settings pages,
 * misc bot configuration options, and settings management (import/export/reset).
 */
const Settings = () => {
    usePerformanceLogging("Settings")
    const scrollViewRef = useRef<ScrollView>(null)

    const { defaultSettings } = useContext(BotMetaContext)
    const { general, misc, updateGeneral, updateMisc } = useContext(GeneralMiscContext)
    const { colors, isDark, setTheme } = useTheme()
    const calStyles = useSeasonCalendarStyles()
    // Width for the recreation-cell popovers, computed once instead of per calendar cell.
    const recreationPopoverStyle = useMemo(() => ({ width: Math.min(280, Dimensions.get("window").width - 24) }), [])

    const { openDataDirectory, resetSettings } = useSettings()
    const { handleImportSettings, handleExportSettings, showImportDialog, setShowImportDialog, showResetDialog, setShowResetDialog } = useSettingsFileManager()

    const delayOverrides = useMemo<Record<string, number>>(() => {
        try {
            return JSON.parse(general.delayOverrides || "{}")
        } catch {
            return {}
        }
    }, [general.delayOverrides])

    const tapFollowUpOverrideEnabled = delayOverrides.tapFollowUpDelay !== undefined
    const tapFollowUpOverrideValue = delayOverrides.tapFollowUpDelay ?? 0.2

    const updateTapFollowUpOverride = useCallback(
        (enabled: boolean, value?: number) => {
            const next = { ...delayOverrides }
            if (enabled) {
                next.tapFollowUpDelay = value ?? tapFollowUpOverrideValue
            } else {
                delete next.tapFollowUpDelay
            }
            updateGeneral({ delayOverrides: JSON.stringify(next) })
        },
        [delayOverrides, tapFollowUpOverrideValue, updateGeneral],
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
                managementGrid: {
                    flexDirection: "row",
                    gap: SPACING.sm,
                },
                managementTile: {
                    flex: 1,
                    backgroundColor: colors.surfaceRaised,
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    borderRadius: RADII.lg,
                    paddingVertical: SPACING.md,
                    paddingHorizontal: SPACING.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    overflow: "hidden",
                },
                managementTileLabel: { ...TYPE.body, color: colors.text, fontWeight: "600" as const, textAlign: "center" as const },
                managementTileCaption: { ...TYPE.caption, color: colors.textMuted, fontSize: 10, textAlign: "center" as const },
                managementTileDanger: { borderColor: colors.destructive },
                dateEntry: {
                    borderWidth: 1,
                    borderColor: colors.borderHair,
                    borderRadius: RADII.md,
                    backgroundColor: colors.surfaceRaised,
                    padding: SPACING.md,
                    gap: SPACING.sm,
                },
                dateEntryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                dateEntryTitleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flex: 1 },
                dateBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: "center" as const, justifyContent: "center" as const },
                dateBadgeText: { ...TYPE.monoLabel, color: colors.onBrand, fontSize: 11 },
                dateTitle: { ...TYPE.body, color: colors.text, fontWeight: "600" as const, flexShrink: 1 },
                dateRemoveButton: { padding: SPACING.xs, borderRadius: 999, overflow: "hidden" as const },
                dateSelectorRow: { flexDirection: "row" },
                dateSelectorCell: { flex: 1 },
                resetLink: { ...TYPE.caption, color: colors.brand, fontWeight: "600" as const },
            }),
        [colors]
    )

    //////////////////////////////////////////////////
    //////////////////////////////////////////////////
    // Callbacks

    // Two-phase mount. First paint renders the cheap navigation-link list (~40 ms baseline) so the
    // user sees the page immediately; the heavy Misc section (sliders, checkboxes, dialogs,
    // file-manager hook plumbing — ~1 s of additional work) commits one tick later, after the
    // navigator animation has painted. `runAfterInteractions` fires when the JS-side scheduler
    // considers itself idle, so we don't fight the navigation transition. Net: the page first
    // paint dropped 27 % (1065 → 782 ms) on a calibrated emulator harness.
    const [showHeavySections, setShowHeavySections] = useState(false)
    useEffect(() => {
        const handle = InteractionManager.runAfterInteractions(() => {
            setShowHeavySections(true)
        })
        return () => handle.cancel()
    }, [])

    const { showToast, showError } = useToast()

    /**
     * Reset the settings to their default values.
     */
    const handleResetSettings = async () => {
        const success = await resetSettings()
        if (success) {
            showToast("Settings reset to defaults", { variant: "success" })
        }
    }

    //////////////////////////////////////////////////
    //////////////////////////////////////////////////
    // Rendering

    const years = [
        { label: "Junior", value: "Junior" },
        { label: "Classic", value: "Classic" },
        { label: "Senior", value: "Senior" },
    ]

    const months = [
        { label: "January", value: "January" },
        { label: "February", value: "February" },
        { label: "March", value: "March" },
        { label: "April", value: "April" },
        { label: "May", value: "May" },
        { label: "June", value: "June" },
        { label: "July", value: "July" },
        { label: "August", value: "August" },
        { label: "September", value: "September" },
        { label: "October", value: "October" },
        { label: "November", value: "November" },
        { label: "December", value: "December" },
    ]

    const phases = [
        { label: "Early", value: "Early" },
        { label: "Late", value: "Late" },
    ]

    const handleStopAtDateChange = useCallback(
        (index: number, part: "year" | "month" | "phase", value: string) => {
            const dates = [...general.stopAtDates]
            const currentParts = dates[index].split(" ")
            let newYear = currentParts[0] || "Senior"
            let newMonth = currentParts[1] || "January"
            let newPhase = currentParts[2] || "Early"

            if (part === "year") newYear = value
            if (part === "month") newMonth = value
            if (part === "phase") newPhase = value

            dates[index] = `${newYear} ${newMonth} ${newPhase}`
            updateGeneral({ stopAtDates: dates })
        },
        [general]
    )

    const handleAddStopAtDate = useCallback(() => {
        updateGeneral({ stopAtDates: [...general.stopAtDates, "Senior January Early"] })
    }, [general])

    const handleRemoveStopAtDate = useCallback(
        (index: number) => {
            const dates = general.stopAtDates.filter((_, i) => i !== index)
            updateGeneral({ stopAtDates: dates.length > 0 ? dates : ["Senior January Early"] })
        },
        [general]
    )

    // Shared chevron removed — hub uses DomainLandingCard navigation.

    const renderNavigationSections = () => <SettingsHubNav />

    /** Replaces one card's entry in `general.datingCards` by index, leaving the others untouched. */
    const updateDatingCard = useCallback(
        (cardIndex: number, updater: (card: DatingCardSchedule) => DatingCardSchedule) => {
            updateGeneral((prev) => ({ ...prev, datingCards: prev.datingCards.map((card, i) => (i === cardIndex ? updater(card) : card)) }))
        },
        [updateGeneral]
    )

    const handleDatingPresetChange = useCallback(
        (cardIndex: number, preset: string) => {
            const selected = DATING_SCHEDULE_PRESETS[preset]
            updateDatingCard(cardIndex, (card) =>
                selected
                    ? { ...card, preset, recreationTurns: [...selected.recreationTurns], purePassionTurn: selected.purePassionTurn, totalOutings: selected.totalOutings }
                    : { ...card, preset: DATING_SCHEDULE_CUSTOM, recreationTurns: [], purePassionTurn: -1 }
            )
        },
        [updateDatingCard]
    )

    const handleMarkRecreationTurn = useCallback(
        (cardIndex: number, turn: number) => {
            updateDatingCard(cardIndex, (card) => ({
                ...card,
                preset: DATING_SCHEDULE_CUSTOM,
                recreationTurns: card.recreationTurns.includes(turn) ? card.recreationTurns : [...card.recreationTurns, turn].sort((a, b) => a - b),
                purePassionTurn: card.purePassionTurn === turn ? -1 : card.purePassionTurn,
            }))
        },
        [updateDatingCard]
    )

    const handleSetPurePassionTurn = useCallback(
        (cardIndex: number, turn: number) => {
            updateDatingCard(cardIndex, (card) => ({ ...card, preset: DATING_SCHEDULE_CUSTOM, purePassionTurn: turn, recreationTurns: card.recreationTurns.filter((t) => t !== turn) }))
        },
        [updateDatingCard]
    )

    const handleClearRecreationTurn = useCallback(
        (cardIndex: number, turn: number) => {
            updateDatingCard(cardIndex, (card) => ({
                ...card,
                preset: DATING_SCHEDULE_CUSTOM,
                recreationTurns: card.recreationTurns.filter((t) => t !== turn),
                purePassionTurn: card.purePassionTurn === turn ? -1 : card.purePassionTurn,
            }))
        },
        [updateDatingCard]
    )

    const handleCardNameChange = useCallback(
        (cardIndex: number, cardName: string) => {
            updateDatingCard(cardIndex, (card) => ({ ...card, cardName }))
        },
        [updateDatingCard]
    )

    const handleTotalOutingsChange = useCallback(
        (cardIndex: number, totalOutings: number) => {
            updateDatingCard(cardIndex, (card) => ({ ...card, totalOutings }))
        },
        [updateDatingCard]
    )

    const handleAddDatingCard = useCallback(() => {
        updateGeneral((prev) => ({ ...prev, datingCards: [...prev.datingCards, createDatingCardSchedule("siriusSenior")] }))
    }, [updateGeneral])

    const handleAddDatingCombo = useCallback(
        (comboKey: string) => {
            const combo = DATING_SCHEDULE_COMBOS[comboKey]
            if (!combo) return
            updateGeneral((prev) => ({ ...prev, datingCards: [...prev.datingCards, ...combo.build()] }))
        },
        [updateGeneral]
    )

    /** Lets the user pick a JSON file defining a dating card list, replacing the current cards with it. Invalid entries are dropped rather than rejected wholesale. */
    const handleImportDatingCards = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true })
            if (result.canceled || !result.assets?.[0]) return

            const data = await new File(result.assets[0].uri).text()
            const parsed = JSON.parse(data)
            const cards = parseDatingCardsImport(parsed)
            if (cards.length === 0) {
                showError("No valid dating cards found in that file.")
                return
            }

            updateGeneral({ datingCards: cards })
            showToast(`Imported ${cards.length} dating card${cards.length === 1 ? "" : "s"}.`)
        } catch (error) {
            logErrorWithTimestamp("Error importing dating cards:", error)
            showError("Failed to import dating cards: invalid JSON file.")
        }
    }, [updateGeneral, showToast, showError])

    const handleRemoveDatingCard = useCallback(
        (cardIndex: number) => {
            updateGeneral((prev) => ({ ...prev, datingCards: prev.datingCards.length > 1 ? prev.datingCards.filter((_, i) => i !== cardIndex) : prev.datingCards }))
        },
        [updateGeneral]
    )

    const resetDatingSchedule = useCallback(() => {
        updateGeneral({ datingCards: defaultSettings.general.datingCards.map((card) => ({ ...card, recreationTurns: [...card.recreationTurns] })) })
    }, [updateGeneral, defaultSettings])

    /** Shared "Reset" pressable used in a section label's right slot. */
    const makeResetLink = (onPress: () => void) => (
        <Pressable onPress={onPress} android_ripple={{ color: colors.ripple, foreground: true }} hitSlop={8}>
            <Text style={styles.resetLink}>Reset</Text>
        </Pressable>
    )

    const renderMiscSettings = () => {
        const renderRecreationPopover = (cardIndex: number, card: DatingCardSchedule, turn: number) => {
            const isRecreation = card.recreationTurns.includes(turn)
            const isPurePassion = card.purePassionTurn === turn
            return (
                <View style={{ gap: SPACING.sm }}>
                    <Text style={styles.dateTitle}>{formatCareerTurn(turn)}</Text>
                    <RecreationDateActions
                        turn={turn}
                        isRecreation={isRecreation}
                        isPurePassion={isPurePassion}
                        onMark={(t) => handleMarkRecreationTurn(cardIndex, t)}
                        onSetPurePassion={(t) => handleSetPurePassionTurn(cardIndex, t)}
                        onClear={(t) => handleClearRecreationTurn(cardIndex, t)}
                    />
                </View>
            )
        }

        // A turn set as the Pure Passion final date shows the amber "mandatory" border and the Pure Passion marker. A plain recreation turn shows the brand border and the recreation marker.
        // Returns a renderCell closure bound to one card, since SeasonCalendar's renderCell prop only takes (turn, turnInYear).
        const makeRenderRecreationCell = (cardIndex: number, card: DatingCardSchedule) => (turn: number, turnInYear: number) => {
            const isRecreation = card.recreationTurns.includes(turn)
            const isPurePassion = card.purePassionTurn === turn
            return (
                <View key={turn} style={calStyles.calendarCellWrapper}>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Pressable
                                style={[calStyles.calendarCell, isRecreation && calStyles.calendarCellLocked, isPurePassion && calStyles.calendarCellMandatory]}
                                android_ripple={{ color: colors.ripple, foreground: true }}
                            >
                                <Text style={calStyles.calendarCellEmpty}>{isPurePassion ? "✨" : isRecreation ? "📅" : "—"}</Text>
                            </Pressable>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="center" insets={{ top: 60, bottom: 60, left: 12, right: 12 }} className="p-3" style={recreationPopoverStyle}>
                            {renderRecreationPopover(cardIndex, card, turn)}
                        </PopoverContent>
                    </Popover>
                    <Text style={calStyles.calendarDateLabel}>
                        {isPurePassion ? "✨ " : isRecreation ? "📅 " : ""}
                        {turnDateLabel(turnInYear)}
                    </Text>
                </View>
            )
        }

        return (
            <View>
                <Section label="MISC">
                    <SettingRow
                        id="settings-dark-mode"
                        title="Dark Mode"
                        description="Use dark theme across the app. Your choice is saved and won't follow system theme changes."
                        right={<Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />}
                    />

                    <SettingRow
                        id="settings-stop-before-finals"
                        title="Stop before Finals"
                        description="Pause to buy skills before the final races"
                        right={<Switch checked={general.enableStopBeforeFinals} onCheckedChange={(checked) => updateGeneral({ enableStopBeforeFinals: checked })} />}
                    />

                    <SettingRow
                        id="settings-stop-at-date"
                        title="Stop at Date"
                        description="Stop on one or more specified dates"
                        right={<Switch checked={general.enableStopAtDate} onCheckedChange={(checked) => updateGeneral({ enableStopAtDate: checked })} />}
                    />

                    {general.enableStopAtDate && (
                        <SearchableItem id="settings-target-dates" title="Target Dates" description="Stops the bot on the specified dates." parentId="settings-stop-at-date">
                            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
                                {general.stopAtDates.map((dateStr, index) => {
                                    const parts = dateStr.split(" ")
                                    const year = parts[0] || "Senior"
                                    const month = parts[1] || "January"
                                    const phase = parts[2] || "Early"
                                    return (
                                        <View key={index} style={styles.dateEntry}>
                                            <View style={styles.dateEntryHeader}>
                                                <View style={styles.dateEntryTitleRow}>
                                                    <View style={styles.dateBadge}>
                                                        <Text style={styles.dateBadgeText}>{index + 1}</Text>
                                                    </View>
                                                    <Text style={styles.dateTitle} numberOfLines={1}>
                                                        {year} {month} {phase}
                                                    </Text>
                                                </View>
                                                {general.stopAtDates.length > 1 && (
                                                    <Pressable
                                                        onPress={() => handleRemoveStopAtDate(index)}
                                                        style={styles.dateRemoveButton}
                                                        hitSlop={8}
                                                        android_ripple={{ color: colors.ripple, foreground: true }}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Remove Date ${index + 1}`}
                                                    >
                                                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                                                    </Pressable>
                                                )}
                                            </View>
                                            <View style={styles.dateSelectorRow}>
                                                <View style={styles.dateSelectorCell}>
                                                    <CustomSelect
                                                        placeholder="Year"
                                                        width="100%"
                                                        options={years}
                                                        value={year}
                                                        onValueChange={(value) => handleStopAtDateChange(index, "year", value || "Senior")}
                                                    />
                                                </View>
                                                <View style={styles.dateSelectorCell}>
                                                    <CustomSelect
                                                        placeholder="Month"
                                                        width="100%"
                                                        options={months}
                                                        value={month}
                                                        onValueChange={(value) => handleStopAtDateChange(index, "month", value || "January")}
                                                    />
                                                </View>
                                                <View style={styles.dateSelectorCell}>
                                                    <CustomSelect
                                                        placeholder="Phase"
                                                        width="100%"
                                                        options={phases}
                                                        value={phase}
                                                        onValueChange={(value) => handleStopAtDateChange(index, "phase", value || "Early")}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    )
                                })}
                                <CustomButton onPress={handleAddStopAtDate} variant="outline" icon={<Ionicons name="add" size={18} color={colors.text} />} style={{ marginVertical: SPACING.sm }}>
                                    Add Date
                                </CustomButton>
                            </View>
                        </SearchableItem>
                    )}

                    <SettingRow
                        id="settings-crane-game-attempt"
                        title="Enable Crane Game Attempt"
                        description="Attempt to complete the crane game instead of stopping"
                        right={<Switch checked={general.enableCraneGameAttempt} onCheckedChange={(checked) => updateGeneral({ enableCraneGameAttempt: checked })} />}
                    />

                    <SettingRow
                        id="settings-enable-swipe-based-scrolling"
                        title="Enable Swipe-Based Scrolling"
                        description="Scroll lists by swiping instead of detecting the in-game scrollbar. Enable this if the bot cannot scroll lists normally. This may or may not work depending on the device."
                        right={<Switch checked={general.enableSwipeBasedScrolling} onCheckedChange={(checked) => updateGeneral({ enableSwipeBasedScrolling: checked })} />}
                    />

                    <SettingRow
                        id="settings-enable-settings-display"
                        title="Enable Settings Display in Message Log"
                        description="Show current bot configuration in the message log"
                        right={<Switch checked={misc.enableSettingsDisplay} onCheckedChange={(checked) => updateMisc({ enableSettingsDisplay: checked })} />}
                    />
                </Section>

                <Section label="SUPPORT CARD DATING" labelRight={makeResetLink(resetDatingSchedule)}>
                    <SettingRow
                        id="settings-dating-schedule"
                        title="Support Card Dating Schedule"
                        description="On a pinned turn the bot does a support-card recreation outing over every other action, including scheduled races (your in-game racing agenda or the Smart Race Solver). Only mandatory career-goal races take priority."
                        right={<Switch checked={general.enableDatingSchedule} onCheckedChange={(checked) => updateGeneral({ enableDatingSchedule: checked })} />}
                    />

                    {general.enableDatingSchedule && (
                        <>
                            <SettingRow
                                id="settings-recreation-catch-up"
                                title="Catch Up On Missed Dates"
                                description="If a scheduled outing gets skipped (e.g. a mandatory race lands on it), make it up on the next available turn instead of losing it."
                                right={<Switch checked={general.enableRecreationCatchUp} onCheckedChange={(checked) => updateGeneral({ enableRecreationCatchUp: checked })} />}
                            />

                            {general.datingCards.length > 1 && (
                                <View style={{ paddingHorizontal: SPACING.md }}>
                                    <Callout variant="info">
                                        Each card's name is matched (fuzzy, case-insensitive) against the rows in the in-game "Choose Recreation Partner" dialog - so it must be the support card's
                                        actual in-game name (e.g. "Kitasan Black"), not the preset label below (e.g. "Team Sirius" or "Heirs to the Throne", which never appear in that dialog). A
                                        blank name matches any row no other card claimed.
                                    </Callout>
                                </View>
                            )}

                            {general.datingCards.map((card, cardIndex) => (
                                <View key={cardIndex} style={styles.dateEntry}>
                                    <View style={styles.dateEntryHeader}>
                                        <View style={styles.dateEntryTitleRow}>
                                            <View style={styles.dateBadge}>
                                                <Text style={styles.dateBadgeText}>{cardIndex + 1}</Text>
                                            </View>
                                            <Input
                                                value={card.cardName}
                                                onChangeText={(value) => handleCardNameChange(cardIndex, value)}
                                                placeholder={general.datingCards.length > 1 ? "In-game support card name, e.g. Kitasan Black" : "Any card (leave blank if only one)"}
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                        {general.datingCards.length > 1 && (
                                            <Pressable
                                                onPress={() => handleRemoveDatingCard(cardIndex)}
                                                style={styles.dateRemoveButton}
                                                hitSlop={8}
                                                android_ripple={{ color: colors.ripple, foreground: true }}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Remove Card ${cardIndex + 1}`}
                                            >
                                                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                                            </Pressable>
                                        )}
                                    </View>

                                    <SearchableItem
                                        id={`settings-dating-preset-${cardIndex}`}
                                        title={`Schedule Preset (Card ${cardIndex + 1})`}
                                        description="Pick an optimized preset (Pure Passion timed for a summer camp) or Custom to hand-pick turns on the calendar below."
                                        parentId="settings-dating-schedule"
                                    >
                                        <CustomSelect
                                            placeholder="Preset"
                                            width="100%"
                                            options={datingPresetOptions}
                                            value={card.preset}
                                            onValueChange={(value) => handleDatingPresetChange(cardIndex, value || DATING_SCHEDULE_CUSTOM)}
                                        />
                                        {card.purePassionTurn > 0 && (
                                            <View style={{ marginTop: SPACING.sm }}>
                                                <Callout variant="info">
                                                    Pure Passion activates when you complete the Heir to the Throne's final recreation date. For about 3 turns, Friendship Training occurs on a
                                                    facility regardless of bond. This preset pins one date per outing and holds the final one for Senior June Late, so those turns land on Senior
                                                    Summer Training where the gains matter most.
                                                </Callout>
                                            </View>
                                        )}
                                    </SearchableItem>

                                    <SearchableItem
                                        id={`settings-recreation-calendar-${cardIndex}`}
                                        title={`Recreation Calendar (Card ${cardIndex + 1})`}
                                        description="Tap a turn to mark it as a Recreation date or the single Pure Passion date (editing switches the preset to Custom). Pre-Debut and Summer turns are unavailable."
                                        parentId="settings-dating-schedule"
                                    >
                                        <SeasonCalendar renderCell={makeRenderRecreationCell(cardIndex, card)} deps={[card.recreationTurns, card.purePassionTurn, cardIndex]} />
                                    </SearchableItem>

                                    <SearchableItem
                                        id={`settings-recreation-total-outings-${cardIndex}`}
                                        title={`Total Recreation Outings (Card ${cardIndex + 1})`}
                                        description="Number of outings in this support card's recreation chain. Team Sirius = 7, Heirs to the Throne = 4. Read from the game automatically when possible; this is the fallback. Used to hold the final outing for the Pure Passion turn."
                                        parentId="settings-dating-schedule"
                                    >
                                        <CustomSlider
                                            searchId={`settings-recreation-total-outings-${cardIndex}`}
                                            value={card.totalOutings}
                                            placeholder={DATING_SCHEDULE_PRESETS.siriusSenior.totalOutings}
                                            onValueChange={(value) => handleTotalOutingsChange(cardIndex, value)}
                                            onSlidingComplete={(value) => handleTotalOutingsChange(cardIndex, value)}
                                            min={1}
                                            max={10}
                                            step={1}
                                            label="Total Recreation Outings"
                                            showValue={true}
                                            showLabels={true}
                                            description="Team Sirius = 7, Heirs to the Throne = 4. Pin enough Recreation dates before the Pure Passion date."
                                        />
                                    </SearchableItem>
                                </View>
                            ))}

                            <View style={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}>
                                <CustomButton onPress={handleAddDatingCard} variant="outline" icon={<Ionicons name="add" size={18} color={colors.text} />} style={{ marginVertical: SPACING.sm }}>
                                    Add Card
                                </CustomButton>
                                {Object.entries(DATING_SCHEDULE_COMBOS).map(([comboKey, combo]) => (
                                    <CustomButton
                                        key={comboKey}
                                        onPress={() => handleAddDatingCombo(comboKey)}
                                        variant="outline"
                                        icon={<Ionicons name="people-outline" size={18} color={colors.text} />}
                                    >
                                        Add {combo.label}
                                    </CustomButton>
                                ))}
                                <CustomButton onPress={handleImportDatingCards} variant="outline" icon={<Ionicons name="document-outline" size={18} color={colors.text} />}>
                                    Import Cards from JSON
                                </CustomButton>
                                <Text style={{ ...TYPE.caption, color: colors.textMuted }}>
                                    Replaces the current cards with a JSON array of objects like {'{ "cardName": "Kitasan Black", "preset": "siriusSenior", "recreationTurns": [29, 35, 43, 47, 52, 55, 58], "purePassionTurn": -1, "totalOutings": 7 }'}. Missing or
                                    invalid fields fall back to safe defaults.
                                </Text>
                            </View>
                        </>
                    )}
                </Section>

                <Section label="WAIT DELAY">
                    <View style={{ padding: SPACING.md }}>
                        <CustomSlider
                            searchId="settings-wait-delay"
                            value={general.waitDelay}
                            placeholder={defaultSettings.general.waitDelay}
                            onValueChange={(value) => {
                                updateGeneral({ waitDelay: value })
                            }}
                            onSlidingComplete={(value) => {
                                updateGeneral({ waitDelay: value })
                            }}
                            min={0.0}
                            max={1.0}
                            step={0.1}
                            label="Wait Delay"
                            labelUnit="s"
                            showValue={true}
                            showLabels={true}
                            description="Sets the delay between actions and imaging operations. Lowering this will make the bot run much faster at the risk of the bot losing track of its location after loading/connecting screens."
                        />
                    </View>
                    <View style={{ padding: SPACING.md }}>
                        <CustomSlider
                            searchId="settings-dialog-wait-delay"
                            value={general.dialogWaitDelay}
                            placeholder={defaultSettings.general.dialogWaitDelay}
                            onValueChange={(value) => {
                                updateGeneral({ dialogWaitDelay: value })
                            }}
                            onSlidingComplete={(value) => {
                                updateGeneral({ dialogWaitDelay: value })
                            }}
                            min={0.0}
                            max={1.0}
                            step={0.1}
                            label="Dialog Wait Delay"
                            labelUnit="s"
                            showValue={true}
                            showLabels={true}
                            description="Sets the delay between clicking a button that opens dialog and actually handling the dialog. Lowering this will make the bot run faster at an increased risk of the bot incorrectly handling dialogs that pop up."
                        />
                    </View>

                    <SettingRow
                        id="settings-enable-delay-calibration-telemetry"
                        title="Enable Delay Calibration Telemetry"
                        description="Logs how long loading screens actually took this run, plus a suggestion on whether to raise or lower Wait Delay."
                        right={
                            <Switch
                                checked={general.enableDelayCalibrationTelemetry}
                                onCheckedChange={(checked) => updateGeneral({ enableDelayCalibrationTelemetry: checked })}
                            />
                        }
                    />

                    <SearchableItem
                        id="settings-tap-follow-up-delay-override"
                        title="Tap Follow-Up Delay Override"
                        description="Per-action override for the brief settle delay after every tap, used instead of the default 0.2s."
                    >
                        <View style={{ padding: SPACING.md }}>
                            <SettingRow
                                id="settings-enable-tap-follow-up-override"
                                title="Override Tap Follow-Up Delay"
                                description="Use a custom delay after every tap instead of the default 0.2s, independent of Wait Delay above."
                                right={<Switch checked={tapFollowUpOverrideEnabled} onCheckedChange={(checked) => updateTapFollowUpOverride(checked)} />}
                            />
                            {tapFollowUpOverrideEnabled && (
                                <CustomSlider
                                    searchId="settings-tap-follow-up-delay-value"
                                    searchCondition={tapFollowUpOverrideEnabled}
                                    parentId="settings-enable-tap-follow-up-override"
                                    value={tapFollowUpOverrideValue}
                                    placeholder={0.2}
                                    onValueChange={(value) => updateTapFollowUpOverride(true, value)}
                                    onSlidingComplete={(value) => updateTapFollowUpOverride(true, value)}
                                    min={0.0}
                                    max={1.0}
                                    step={0.05}
                                    label="Tap Follow-Up Delay"
                                    labelUnit="s"
                                    showValue={true}
                                    showLabels={true}
                                    description="Delay after every tap before checking for loading screens. Overrides the default 0.2s for this specific action only."
                                />
                            )}
                        </View>
                    </SearchableItem>
                </Section>

                <Section label="CONNECTION ERROR RETRY">
                    <View style={{ padding: SPACING.md }}>
                        <CustomSlider
                            searchId="settings-connection-error-max-retry-attempts"
                            value={general.connectionErrorMaxRetryAttempts}
                            placeholder={defaultSettings.general.connectionErrorMaxRetryAttempts}
                            onValueChange={(value) => updateGeneral({ connectionErrorMaxRetryAttempts: value })}
                            onSlidingComplete={(value) => updateGeneral({ connectionErrorMaxRetryAttempts: value })}
                            min={1}
                            max={10}
                            step={1}
                            label="Max Retry Attempts"
                            showValue={true}
                            showLabels={true}
                            description="How many times the bot retries a connection error dialog within the cooldown window below before giving up and stopping the run."
                        />
                    </View>
                    <View style={{ padding: SPACING.md }}>
                        <CustomSlider
                            searchId="settings-connection-error-retry-cooldown"
                            value={general.connectionErrorRetryCooldownSeconds}
                            placeholder={defaultSettings.general.connectionErrorRetryCooldownSeconds}
                            onValueChange={(value) => updateGeneral({ connectionErrorRetryCooldownSeconds: value })}
                            onSlidingComplete={(value) => updateGeneral({ connectionErrorRetryCooldownSeconds: value })}
                            min={5}
                            max={60}
                            step={5}
                            label="Retry Cooldown"
                            labelUnit="s"
                            showValue={true}
                            showLabels={true}
                            description="The retry counter resets once this many seconds pass without another connection error, so occasional flaky connections don't add up toward the max attempts above."
                        />
                    </View>
                </Section>

                <Section label="DATA MANAGEMENT">
                    <SearchableItem id="settings-management-title" title="Settings Management" description="Import and export settings from JSON file or access the app's data directory.">
                        <View style={{ padding: SPACING.md }}>
                            <View style={styles.managementGrid}>
                                <Pressable style={styles.managementTile} android_ripple={{ color: colors.ripple, foreground: true }} onPress={handleImportSettings}>
                                    <Ionicons name="download-outline" size={24} color={colors.brand} />
                                    <Text style={styles.managementTileLabel}>Import</Text>
                                    <Text style={styles.managementTileCaption}>Load settings from JSON</Text>
                                </Pressable>
                                <Pressable style={styles.managementTile} android_ripple={{ color: colors.ripple, foreground: true }} onPress={handleExportSettings}>
                                    <Ionicons name="share-outline" size={24} color={colors.brand} />
                                    <Text style={styles.managementTileLabel}>Export</Text>
                                    <Text style={styles.managementTileCaption}>Save settings to JSON</Text>
                                </Pressable>
                                <Pressable style={styles.managementTile} android_ripple={{ color: colors.ripple, foreground: true }} onPress={openDataDirectory}>
                                    <Ionicons name="folder-outline" size={24} color={colors.brand} />
                                    <Text style={styles.managementTileLabel}>Data</Text>
                                    <Text style={styles.managementTileCaption}>Open folder</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.managementTile, styles.managementTileDanger]}
                                    android_ripple={{ color: colors.ripple, foreground: true }}
                                    onPress={() => setShowResetDialog(true)}
                                >
                                    <Ionicons name="refresh-outline" size={24} color={colors.destructive} />
                                    <Text style={[styles.managementTileLabel, { color: colors.destructive }]}>Reset</Text>
                                    <Text style={styles.managementTileCaption}>Restore defaults</Text>
                                </Pressable>
                            </View>
                        </View>
                    </SearchableItem>
                </Section>

                <Section label="GAME DATA">
                    <SettingRow
                        id="settings-refresh-game-data"
                        title="Manually Refresh Game Data"
                        description="Opens the GitHub Actions page to trigger an immediate refresh of support card stats/types and other scraped data, instead of waiting for the weekly automatic run."
                        onPress={() => Linking.openURL(GAME_DATA_WORKFLOW_URL)}
                        right={<Ionicons name="open-outline" size={18} color={colors.textMuted} />}
                    />
                </Section>

                <Callout variant="warning" style={{ marginTop: 0, marginBottom: SPACING.md }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        <Text style={{ fontWeight: "bold", color: colors.warningText }}>⚠️ File Explorer Note:</Text>
                        <Text style={{ fontSize: 14, color: colors.warningText, lineHeight: 20 }}>
                            To manually access files, you need a file explorer app that can access the /Android/data folder (like CX File Explorer). Standard file managers will not work.
                        </Text>
                    </View>
                </Callout>
            </View>
        )
    }

    //////////////////////////////////////////////////
    //////////////////////////////////////////////////

    return (
        <View style={styles.root}>
            <SearchPageProvider page="SettingsMain" scrollViewRef={scrollViewRef}>
                <DomainHeader breadcrumb="App" title="Settings" subtitle="Gameplay, integrations, tools, and bot configuration." searchOnRight rightComponent={<ThemeToggle />} />
                <ScrollView ref={scrollViewRef} nestedScrollEnabled={true} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                    <View className="m-1">
                        {renderNavigationSections()}
                        {showHeavySections && renderMiscSettings()}
                    </View>
                </ScrollView>
            </SearchPageProvider>

            {/* Restart Dialog */}
            <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Settings Imported</AlertDialogTitle>
                        <AlertDialogDescription>Settings have been imported successfully.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>
                            <Text>OK</Text>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset Settings Dialog */}
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Settings to Default</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to reset all settings to their default values? This action cannot be undone and will overwrite your current configuration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onPress={() => setShowResetDialog(false)}>
                            <Text>Cancel</Text>
                        </AlertDialogCancel>
                        <AlertDialogAction onPress={handleResetSettings}>
                            <Text>Reset</Text>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </View>
    )
}

export default Settings
