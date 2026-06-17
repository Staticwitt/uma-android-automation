import { colorScheme } from "nativewind"

/** Keeps NativeWind `darkMode: class` in sync with ThemeContext. */
export const syncNativeWindColorScheme = (theme: "light" | "dark"): void => {
    try {
        colorScheme.set(theme)
    } catch {
        // NativeWind unavailable in test environments.
    }
}
