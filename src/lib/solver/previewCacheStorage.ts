import AsyncStorage from "@react-native-async-storage/async-storage"
import type { SchedulePreview } from "./solver/preview"

const PREVIEW_CACHE_KEY = "smartRaceSolverPreviewCache"

interface StoredPreviewCache {
    key: string
    preview: SchedulePreview
}

/**
 * Loads a persisted solver preview when the snapshot key still matches current settings.
 */
export const loadSolverPreviewCache = async (snapshotKey: string): Promise<SchedulePreview | null> => {
    try {
        const raw = await AsyncStorage.getItem(PREVIEW_CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredPreviewCache
        if (!parsed || parsed.key !== snapshotKey || !parsed.preview) return null
        return parsed.preview
    } catch {
        return null
    }
}

/**
 * Persists the latest solver preview for instant reload when reopening settings.
 */
export const saveSolverPreviewCache = async (snapshotKey: string, preview: SchedulePreview): Promise<void> => {
    try {
        await AsyncStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify({ key: snapshotKey, preview }))
    } catch {
        // Best-effort only.
    }
}
