import type { Settings } from "../context/BotStateContext"
import { refreshParentFarmingSettings } from "./parentFarmingPreset"

/**
 * Final settings snapshot written to SQLite before the native bot service starts.
 * Re-resolves parent-farming slices so Kotlin reads preset-aligned training and racing values.
 */
export const prepareSettingsForBotStart = (settings: Settings): Settings => refreshParentFarmingSettings(settings)
