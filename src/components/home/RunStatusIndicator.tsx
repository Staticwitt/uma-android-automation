import React from "react"
import { Animated } from "react-native"
import Ionicons from "@react-native-vector-icons/ionicons"
import { Text } from "../ui/text"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { useTheme } from "../../context/ThemeContext"
import { DeviceMetrics, SUPPORTED_DISPLAY_PROFILE_LABELS } from "../../lib/displayProfile"

export interface RunStatusIndicatorProps {
    readyStatus: boolean
    isRunning: boolean
    deviceMetrics: DeviceMetrics | null
    unsupportedReason: string | null
    abiMismatch: boolean
    pulseAnim: Animated.Value
}

/**
 * Header status glyph for Home: device warnings, readiness, or all-clear.
 */
export const RunStatusIndicator = ({
    readyStatus,
    isRunning,
    deviceMetrics,
    unsupportedReason,
    abiMismatch,
    pulseAnim,
}: RunStatusIndicatorProps) => {
    const { colors } = useTheme()

    const warningSections: string[] = []
    if (unsupportedReason) {
        const profileLine =
            deviceMetrics?.displayProfileLabel != null && deviceMetrics.displayProfileLabel.length > 0
                ? `\n\nRecognized profile: ${deviceMetrics.displayProfileLabel}`
                : ""
        const scaleLine =
            deviceMetrics?.recommendedTemplateScale != null && deviceMetrics.recommendedTemplateScale !== 1
                ? `\nRecommended template scale: ${deviceMetrics.recommendedTemplateScale.toFixed(2)} (applied automatically when Auto Display Profile Tuning is on and custom scale is 1.0).`
                : ""
        warningSections.push(`Current Display: ${deviceMetrics?.width}x${deviceMetrics?.height} (${deviceMetrics?.dpi} DPI).${profileLine}${scaleLine}

Warning: Performance may be degraded due to ${unsupportedReason}.

Supported profiles:
${SUPPORTED_DISPLAY_PROFILE_LABELS.map((label) => `• ${label}`).join("\n")}

Note: Width matters more than height for template matching. Run in portrait. For unrecognized panels, use Debug Settings → Basic Template Matching Test, or force 1080×1920 via adb (see README).`)
    }
    if (abiMismatch) {
        warningSections.push(`Installed Build: arm64-v8a
Device Supports: x86_64

Warning: The arm64 build runs through Android's binary translator on this device, which is significantly slower than running natively.

Note: Reinstall using the x86_64 release APK for much better performance.`)
    }
    const warningText = warningSections.join("\n\n----\n\n")

    if (unsupportedReason || abiMismatch) {
        return (
            <Tooltip delayDuration={150}>
                <TooltipTrigger>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
                    </Animated.View>
                </TooltipTrigger>
                <TooltipContent sideOffset={12} side="bottom" style={{ maxWidth: 350, backgroundColor: colors.warningBg, borderColor: colors.warningBorder, borderWidth: 1 }}>
                    <Text style={{ color: colors.warningText }}>{warningText}</Text>
                </TooltipContent>
            </Tooltip>
        )
    }

    if (!readyStatus && !isRunning) {
        return (
            <Tooltip delayDuration={150}>
                <TooltipTrigger>
                    <Ionicons name="information-circle-outline" size={24} color={colors.info} />
                </TooltipTrigger>
                <TooltipContent sideOffset={12} side="bottom" style={{ width: 200 }}>
                    <Text>Select a Scenario to start from the center button dropdown.</Text>
                </TooltipContent>
            </Tooltip>
        )
    }

    if (deviceMetrics) {
        return (
            <Tooltip delayDuration={150}>
                <TooltipTrigger>
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                </TooltipTrigger>
                <TooltipContent sideOffset={12} side="bottom">
                    <Text>Everything looks good and ready to go!</Text>
                </TooltipContent>
            </Tooltip>
        )
    }

    return null
}
