/** Human-readable labels for display profiles recognized by the Android [DisplayProfileRegistry]. */
export const SUPPORTED_DISPLAY_PROFILE_LABELS = [
    "1080×1920 @ 240 DPI",
    "1080×2340 @ 450 DPI (Samsung phone)",
    "Samsung Galaxy Tab S10 FE (1440×2304)",
] as const

export type DeviceMetrics = {
    width: number
    height: number
    dpi: number
    supportedDisplay?: boolean
    displayProfileId?: string
    displayProfileLabel?: string
    recommendedTemplateScale?: number
}
