import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useColorScheme } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { THEME } from "../lib/theme"
import { syncNativeWindColorScheme } from "../lib/nativeWindTheme"

type Theme = "light" | "dark"

const THEME_STORAGE_KEY = "@uma-app/theme"

/**
 * Context value interface for the Theme provider.
 * Exposes the current theme, toggle, and pre-resolved color tokens.
 */
interface ThemeContextType {
    /** The current active theme ("light" or "dark"). */
    theme: Theme
    /** Setter for the theme value. Persists the user's choice. */
    setTheme: (theme: Theme) => void
    /** Toggles between light and dark themes. Persists the user's choice. */
    toggleTheme: () => void
    /** Whether the current theme is dark mode. */
    isDark: boolean
    /** The resolved color tokens for the current theme. */
    colors: typeof THEME.light
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Hook to access the Theme context. Must be used within a ThemeProvider.
 * @returns The theme context with the current theme, toggle function, and color tokens.
 */
export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}

interface ThemeProviderProps {
    /** The children of the provider. */
    children: React.ReactNode
}

/**
 * Provider component for the Theme context.
 * Initializes from saved preference, then device color scheme, and keeps NativeWind in sync.
 * Once the user toggles theme manually, the choice is persisted and no longer follows system changes.
 * @param children The children of the provider.
 * @returns The theme provider.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme()
    const followSystemRef = useRef(true)
    const [theme, setThemeState] = useState<Theme>(() => (systemColorScheme === "dark" ? "dark" : "light"))
    const [hydrated, setHydrated] = useState(false)

    const applyTheme = useCallback((next: Theme, persist: boolean) => {
        setThemeState(next)
        syncNativeWindColorScheme(next)
        if (persist) {
            followSystemRef.current = false
            void AsyncStorage.setItem(THEME_STORAGE_KEY, next)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY)
                if (cancelled) return
                if (stored === "light" || stored === "dark") {
                    followSystemRef.current = false
                    applyTheme(stored, false)
                } else if (systemColorScheme === "light" || systemColorScheme === "dark") {
                    applyTheme(systemColorScheme, false)
                }
            } finally {
                if (!cancelled) setHydrated(true)
            }
        })()
        return () => {
            cancelled = true
        }
        // Hydrate saved preference once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applyTheme])

    useEffect(() => {
        if (!hydrated || !followSystemRef.current) return
        if (systemColorScheme === "light" || systemColorScheme === "dark") {
            applyTheme(systemColorScheme, false)
        }
    }, [applyTheme, hydrated, systemColorScheme])

    const setTheme = useCallback((next: Theme) => applyTheme(next, true), [applyTheme])

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const next = prev === "light" ? "dark" : "light"
            followSystemRef.current = false
            syncNativeWindColorScheme(next)
            void AsyncStorage.setItem(THEME_STORAGE_KEY, next)
            return next
        })
    }, [])

    const value = useMemo<ThemeContextType>(() => {
        const isDark = theme === "dark"
        const colors = THEME[theme]
        return {
            theme,
            setTheme,
            toggleTheme,
            isDark,
            colors,
        }
    }, [theme, setTheme, toggleTheme])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
