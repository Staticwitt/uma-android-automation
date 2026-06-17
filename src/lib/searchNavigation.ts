/** Human-readable labels for settings stack and drawer routes used by global search. */
export const SEARCH_PAGE_LABELS: Record<string, string> = {
    SettingsMain: "General Settings",
    TrainingLanding: "Training",
    RacingLanding: "Racing & Farming",
    TrainingSettings: "Training Settings",
    TrainingEventSettings: "Training Events",
    RacingSettings: "Racing",
    ParentFarmingSettings: "Parent Farming",
    SmartRaceSolverSettings: "Smart Race Solver",
    Skills: "Skills",
    ScenarioOverridesSettings: "Scenario Overrides",
    DiscordSettings: "Discord",
    LLMSettings: "LLM",
    DebugSettings: "Debug",
    EventLogVisualizer: "Event Log Visualizer",
    ImportSettingsPreview: "Import Settings Preview",
    Chat: "Ask the Docs",
    Home: "Home",
}

/** Routes nested under the Settings stack navigator. */
export const SETTINGS_STACK_PAGES = new Set([
    "SettingsMain",
    "TrainingLanding",
    "RacingLanding",
    "TrainingSettings",
    "TrainingEventSettings",
    "RacingSettings",
    "ParentFarmingSettings",
    "SmartRaceSolverSettings",
    "Skills",
    "ScenarioOverridesSettings",
    "DiscordSettings",
    "LLMSettings",
    "DebugSettings",
    "EventLogVisualizer",
    "ImportSettingsPreview",
])

export const isSettingsStackPage = (page: string): boolean => SETTINGS_STACK_PAGES.has(page)

export const searchPageLabel = (page: string): string => SEARCH_PAGE_LABELS[page] ?? page
