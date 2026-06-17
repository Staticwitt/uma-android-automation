import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { Animated, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "./ThemeContext"
import { TYPE } from "../lib/type"
import { SPACING } from "../lib/spacing"
import { RADII } from "../lib/radii"

export type ToastVariant = "default" | "success" | "error"

export interface ToastAction {
    label: string
    onPress: () => void
}

interface ToastOptions {
    variant?: ToastVariant
    durationMs?: number
    action?: ToastAction
}

interface ToastContextType {
    showToast: (message: string, options?: ToastOptions) => void
    showError: (message: string, options?: Omit<ToastOptions, "variant">) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const DEFAULT_DURATION_MS = 3500

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within ToastProvider")
    }
    return context
}

/** Optional hook for components that may render outside ToastProvider (e.g. tests). */
export const useToastOptional = (): ToastContextType | null => useContext(ToastContext) ?? null

const ToastHost = ({
    message,
    variant,
    action,
    onDismiss,
}: {
    message: string
    variant: ToastVariant
    action?: ToastAction
    onDismiss: () => void
}) => {
    const { colors } = useTheme()
    const insets = useSafeAreaInsets()
    const opacity = useRef(new Animated.Value(0)).current

    React.useEffect(() => {
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start()
    }, [opacity])

    const borderColor =
        variant === "error" ? colors.error : variant === "success" ? colors.success : colors.borderHair

    const styles = StyleSheet.create({
        host: {
            position: "absolute",
            left: SPACING.md,
            right: SPACING.md,
            bottom: Math.max(insets.bottom, SPACING.md),
            zIndex: 9999,
        },
        surface: {
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.md,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor,
            borderRadius: RADII.lg,
            paddingVertical: SPACING.md,
            paddingHorizontal: SPACING.lg,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
        },
        message: { ...TYPE.body, color: colors.text, flex: 1 },
        action: { ...TYPE.caption, color: colors.brand, fontWeight: "600" },
    })

    return (
        <Animated.View style={[styles.host, { opacity }]} pointerEvents="box-none">
            <View style={styles.surface}>
                <Text style={styles.message}>{message}</Text>
                {action ? (
                    <Pressable
                        onPress={() => {
                            action.onPress()
                            onDismiss()
                        }}
                        accessibilityRole="button"
                    >
                        <Text style={styles.action}>{action.label}</Text>
                    </Pressable>
                ) : (
                    <Pressable onPress={onDismiss} accessibilityRole="button">
                        <Text style={styles.action}>Dismiss</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    )
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toast, setToast] = useState<{ message: string; variant: ToastVariant; action?: ToastAction } | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const dismiss = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        setToast(null)
    }, [])

    const showToast = useCallback(
        (message: string, options?: ToastOptions) => {
            dismiss()
            setToast({
                message,
                variant: options?.variant ?? "default",
                action: options?.action,
            })
            timerRef.current = setTimeout(dismiss, options?.durationMs ?? DEFAULT_DURATION_MS)
        },
        [dismiss],
    )

    const showError = useCallback(
        (message: string, options?: Omit<ToastOptions, "variant">) => {
            showToast(message, { ...options, variant: "error", durationMs: options?.durationMs ?? 5000 })
        },
        [showToast],
    )

    const value = useMemo(() => ({ showToast, showError }), [showToast, showError])

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast ? <ToastHost message={toast.message} variant={toast.variant} action={toast.action} onDismiss={dismiss} /> : null}
        </ToastContext.Provider>
    )
}
