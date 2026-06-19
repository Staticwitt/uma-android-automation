import * as Application from "expo-application"
import MessageLog from "../../components/MessageLog"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { BotMetaContext, GeneralMiscContext, useSettingsSnapshot } from "../../context/BotStateContext"
import { prepareSettingsForBotStart } from "../../lib/prepareSettingsForBotStart"
import { parseParentFarmingBreedingPlan, validateBreedingPlan } from "../../lib/parentFarmingBreedingPlan"
import { useSettings } from "../../context/SettingsContext"
import { logWithTimestamp, logErrorWithTimestamp } from "../../lib/logger"
import { Animated, DeviceEventEmitter, StyleSheet, View, NativeModules } from "react-native"
import { MessageLogDispatchContext } from "../../context/MessageLogContext"
import { useToast } from "../../context/ToastContext"
import { Text } from "../../components/ui/text"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog"
import Ionicons from "@react-native-vector-icons/ionicons"
import PageHeader from "../../components/PageHeader"
import { usePerformanceLogging } from "../../hooks/usePerformanceLogging"
import PermissionSetupDialog from "../../components/PermissionSetupDialog"
import { loadDeviceCapabilities, shouldSuggestX8664Variant } from "../../lib/chat/deviceCapabilities"
import { type HeroStatus } from "../../components/HeroStatusCard"
import { RunPanel } from "../../components/home/RunPanel"
import { RunStatusIndicator } from "../../components/home/RunStatusIndicator"
import { HOME_SCENARIOS } from "../../components/home/scenarios"
import { useProfileContext, DEFAULT_PROFILE_NAME } from "../../context/ProfileContext"
import { DeviceMetrics } from "../../lib/displayProfile"

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    contentContainer: {
        flex: 1,
        width: "100%",
        flexDirection: "column",
    },
    logBody: {
        flex: 1,
    },
})

/**
 * The main Home page of the application.
 * Displays the Start/Stop button for the bot, a message log, and handles bot lifecycle events including settings persistence and readiness checks.
 */
const Home = () => {
    usePerformanceLogging("Home")
    const { StartModule } = NativeModules

    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [showNotReadyDialog, setShowNotReadyDialog] = useState<boolean>(false)
    const { showError } = useToast()
    const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics | null>(null)
    const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null)
    const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false)
    const [abiMismatch, setAbiMismatch] = useState<boolean>(false)
    const [breedingPlanWarnings, setBreedingPlanWarnings] = useState<string[]>([])
    const [showBreedingPlanWarningDialog, setShowBreedingPlanWarningDialog] = useState<boolean>(false)

    const { readyStatus, setReadyStatus, setAppName, setAppVersion, setSettings } = useContext(BotMetaContext)
    const { general, updateGeneral } = useContext(GeneralMiscContext)
    const mlc = useContext(MessageLogDispatchContext)
    const { saveSettings } = useSettings()
    const settings = useSettingsSnapshot()
    const { currentProfileName } = useProfileContext()

    const pulseAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        let animation: Animated.CompositeAnimation | null = null

        if (unsupportedReason !== null || abiMismatch) {
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                ]),
            )
            animation.start()
        } else {
            pulseAnim.setValue(1)
        }

        return () => {
            animation?.stop()
        }
    }, [unsupportedReason, abiMismatch, pulseAnim])

    useEffect(() => {
        const mediaProjectionSubscription = DeviceEventEmitter.addListener("MediaProjectionService", (data) => {
            setIsRunning(data["message"] === "Running")
        })

        const botServiceSubscription = DeviceEventEmitter.addListener("BotService", (data) => {
            if (data["message"] === "Running") {
                mlc.setMessageLog([])
            }
        })

        getVersion()
        fetchDeviceMetrics()
        checkAbiMismatch()

        return () => {
            mediaProjectionSubscription.remove()
            botServiceSubscription.remove()
        }
    }, [])

    const isScenarioValid: boolean = useMemo(() => HOME_SCENARIOS.some((it) => it.value === general.scenario), [general.scenario])

    const fetchDeviceMetrics = async () => {
        try {
            const metrics = await StartModule.getDeviceDimensions()
            setDeviceMetrics(metrics)
            setUnsupportedReason(metrics.supportedDisplay ? null : `unsupported configuration: ${metrics.width}x${metrics.height} @ ${metrics.dpi} DPI`)
        } catch (error) {
            logErrorWithTimestamp("[Home] Failed to fetch device dimensions:", error)
        }
    }

    const getVersion = () => {
        const appName = Application.applicationName || "App"
        let version = Application.nativeApplicationVersion || "0.0.0"
        version += " (" + (Application.nativeBuildVersion || "0") + ")"
        logWithTimestamp(`Android app ${appName} version is ${version}`)
        setAppName(appName)
        setAppVersion(version)
    }

    const checkAbiMismatch = async () => {
        const caps = await loadDeviceCapabilities()
        if (shouldSuggestX8664Variant(caps)) setAbiMismatch(true)
    }

    const proceedToStart = async () => {
        logWithTimestamp("[Home] Saving settings before starting bot...")
        try {
            const prepared = prepareSettingsForBotStart(settings)
            setSettings(prepared)
            await saveSettings(prepared)
            logWithTimestamp("[Home] Settings saved successfully, starting bot...")
        } catch (error) {
            logErrorWithTimestamp("[Home] Failed to save settings:", error)
            showError(`Failed to save settings before starting: ${error}`)
            return
        }
        StartModule.start()
    }

    const handleButtonPress = async () => {
        if (isRunning) {
            StartModule.stop()
            return
        }
        if (!readyStatus) {
            setShowNotReadyDialog(true)
            return
        }

        try {
            const [accessibility, overlay, battery] = await Promise.all([StartModule.getAccessibilityStatus(), StartModule.getOverlayStatus(), StartModule.getBatteryOptimizationStatus()])
            const allGranted = accessibility.enabled && accessibility.active && overlay.enabled && battery.enabled
            if (!allGranted) {
                setShowPermissionDialog(true)
                return
            }
        } catch (error) {
            logErrorWithTimestamp("[Home] Failed to check permission statuses:", error)
        }

        if (settings.racing.enableParentFarmingMode && settings.racing.enableParentFarmingBreedingPlan) {
            const plan = parseParentFarmingBreedingPlan(settings.racing.parentFarmingBreedingPlan)
            const warnings = validateBreedingPlan(plan)
            if (warnings.length > 0) {
                setBreedingPlanWarnings(warnings.map((w) => `${w.label}: ${w.message}`))
                setShowBreedingPlanWarningDialog(true)
                return
            }
        }

        await proceedToStart()
    }

    const getSelectButtonIconName = (): React.ComponentProps<typeof Ionicons>["name"] | undefined => {
        if (!isScenarioValid) return undefined
        return isRunning ? "stop-outline" : "play-outline"
    }

    const getSelectButtonVariant = (): React.ComponentProps<typeof import("../../components/SelectButton").default>["variant"] => {
        if (isRunning) return "error"
        if (unsupportedReason !== null || abiMismatch) return "warning"
        if (deviceMetrics === null) return "warning"
        if (isScenarioValid) return "success"
        return "primary"
    }

    const heroStatus: HeroStatus = isRunning ? "running" : unsupportedReason !== null || abiMismatch ? "error" : readyStatus && deviceMetrics !== null ? "ready" : "stopped"
    const heroProfile = currentProfileName ?? DEFAULT_PROFILE_NAME

    return (
        <View style={styles.root}>
            <PageHeader
                title="Home"
                showHomeButton={false}
                style={{ width: "100%" }}
                rightComponent={
                    <RunStatusIndicator
                        readyStatus={readyStatus}
                        isRunning={isRunning}
                        deviceMetrics={deviceMetrics}
                        unsupportedReason={unsupportedReason}
                        abiMismatch={abiMismatch}
                        pulseAnim={pulseAnim}
                    />
                }
            />

            <RunPanel
                status={heroStatus}
                profile={heroProfile}
                scenario={general.scenario}
                deviceMetrics={deviceMetrics}
                selectVariant={getSelectButtonVariant()}
                selectIconName={getSelectButtonIconName()}
                onScenarioChange={(newScenario) => {
                    updateGeneral({ scenario: newScenario })
                    setReadyStatus(newScenario !== "")
                }}
                onPress={handleButtonPress}
            />

            <View style={styles.contentContainer}>
                <View style={styles.logBody}>
                    <MessageLog />
                </View>
            </View>

            <AlertDialog open={showNotReadyDialog} onOpenChange={setShowNotReadyDialog}>
                <AlertDialogContent onDismiss={() => setShowNotReadyDialog(false)}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Not Ready</AlertDialogTitle>
                        <AlertDialogDescription>A scenario must be selected before starting the bot. Tap the dropdown on this Start button to pick one.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onPress={() => setShowNotReadyDialog(false)}>
                            <Text>OK</Text>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showBreedingPlanWarningDialog} onOpenChange={setShowBreedingPlanWarningDialog}>
                <AlertDialogContent onDismiss={() => setShowBreedingPlanWarningDialog(false)}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Breeding plan has unresolved generations</AlertDialogTitle>
                        <AlertDialogDescription>
                            {breedingPlanWarnings.join("\n\n")}
                            {"\n\nThese generations will keep the previous generation's settings unchanged. Fix them in Parent Farming settings, or start anyway."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onPress={() => setShowBreedingPlanWarningDialog(false)}>
                            <Text>Cancel</Text>
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onPress={() => {
                                setShowBreedingPlanWarningDialog(false)
                                proceedToStart()
                            }}
                        >
                            <Text>Start anyway</Text>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <PermissionSetupDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog} onAllGranted={proceedToStart} />
        </View>
    )
}

export default Home
