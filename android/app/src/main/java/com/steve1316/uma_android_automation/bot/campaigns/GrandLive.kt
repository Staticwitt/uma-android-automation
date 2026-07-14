package com.steve1316.uma_android_automation.bot.campaigns

import com.steve1316.uma_android_automation.bot.Campaign
import com.steve1316.uma_android_automation.bot.Game

/**
 * Handles the Grand Live scenario (idol-training career: Performance tokens, a Lesson/Song shop, and a Live concert every
 * six months).
 *
 * Grand Live currently runs on the shared [Campaign] career loop: date detection, training scoring, the smart racing plan,
 * training events, skill buying, mood/energy management, and the finale are all handled by the base systems, so a run plays
 * out like [UraFinale] with no scenario-specific overrides yet. The only scenario-aware behavior wired up so far is the
 * raised Speed stat cap (1600), handled in the shared scoring module's `getScenarioStatCap`.
 *
 * The scenario-specific mechanics — the Lesson/shop screen, the five Performance token types, and the periodic Grand Live
 * concert (and its finale) — are not yet automated. When template assets and detection for those screens are added, the
 * relevant hooks ([checkCampaignSpecificConditions], [onBeforeMainScreenUpdate], a `GrandLiveTraining` subclass, etc.)
 * should be overridden here, mirroring how [UnityCup] and [Trackblazer] extend the base campaign.
 *
 * @property game The [Game] instance for interacting with the game state.
 */
class GrandLive(game: Game) : Campaign(game)
