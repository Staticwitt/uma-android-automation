/** Keeps NativeWind `darkMode: class` in sync with ThemeContext. */
export const syncNativeWindColorScheme = (theme: "light" | "dark"): void => {
    try {
        // NativeWind is optional in Jest; runtime import avoids bundler issues in tests.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { colorScheme } = require("nativewind") as { colorScheme?: { set: (value: "light" | "dark") => void } }
        colorScheme?.set?.(theme)
    } catch {
        // NativeWind unavailable in test environments.
    }
}
