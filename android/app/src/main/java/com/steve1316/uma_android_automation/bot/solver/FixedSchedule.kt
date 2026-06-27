package com.steve1316.uma_android_automation.bot.solver

import com.steve1316.automation_library.utils.SettingsHelper

/**
 * Hand-authored turn-by-turn career plans that bypass the MILP/heuristic solver entirely. Selected via the
 * `racing.fixedSchedule` string setting (blank or unrecognized = disabled, normal solver behavior resumes).
 *
 * Recreation-tagged turns below are committed as [Decision.Rest]: the existing Rest/Recreation handling in
 * Campaign.kt already reacts to whichever recovery option the game offers that turn (plain rest vs. a
 * recreation date), and there is no mechanism in the bot to force a specific support-card partner, so no
 * partner targeting is implied or attempted.
 */
object FixedSchedule {
    private const val THRONE_X_SIRIUS_KEY = "throne-x-sirius"

    private val PRESETS: Map<String, Map<TurnNumber, Decision>> = mapOf(
        THRONE_X_SIRIUS_KEY to THRONE_X_SIRIUS,
    )

    /** @return The active fixed [Schedule] selected by the `racing.fixedSchedule` setting, or null when disabled/unrecognized so the real solver runs as normal. */
    fun activeSchedule(): Schedule? {
        val key = SettingsHelper.getStringSetting("racing", "fixedSchedule")
        if (key.isBlank()) return null
        val decisions = PRESETS[key] ?: return null
        return Schedule(decisions = decisions, projectedEpithets = emptySet(), totalScore = 0.0)
    }

    /**
     * "Throne x Sirius" - a 3-year career plan alternating G1/G2/G3 races with dedicated recreation and
     * training turns. Race turns reference the exact `races.json` keys for each race's calendar slot.
     */
    private val THRONE_X_SIRIUS: Map<TurnNumber, Decision> = buildMap {
        // Junior Year
        put(13, Decision.Train) // Early July
        put(14, Decision.Train) // Late July
        put(15, Decision.Train) // Early August
        put(16, Decision.RaceDecision("Niigata Junior Stakes (Junior Class August, Second Half)")) // Late August
        put(17, Decision.RaceDecision("Sapporo Junior Stakes (Junior Class September, First Half)")) // Early September
        put(18, Decision.Rest) // Late September - Silence Suzuka Recreation (Sirius)
        put(19, Decision.RaceDecision("Saudi Arabia Royal Cup (Junior Class October, First Half)")) // Early October
        put(20, Decision.RaceDecision("Artemis Stakes (Junior Class October, Second Half)")) // Late October
        put(21, Decision.RaceDecision("Daily Hai Junior Stakes (Junior Class November, First Half)")) // Early November
        put(22, Decision.Rest) // Late November - Narita Brian Recreation (Sirius)
        put(23, Decision.RaceDecision("Hanshin Juvenile Fillies (Junior Class December, First Half)")) // Early December
        put(24, Decision.RaceDecision("Hopeful Stakes (Junior Class December, Second Half)")) // Late December

        // Classic Year
        put(25, Decision.RaceDecision("Keisei Hai (Classic Class January, First Half)")) // Early January
        put(26, Decision.Rest) // Late January - Symboli Rudolf Recreation (Throne)
        put(27, Decision.RaceDecision("Kyodo News Hai (Classic Class February, First Half)")) // Early February
        put(28, Decision.Rest) // Late February - Rice Shower Recreation (Sirius)
        put(29, Decision.RaceDecision("Yayoi Sho (Classic Class March, First Half)")) // Early March
        put(30, Decision.RaceDecision("Spring Stakes (Classic Class March, Second Half)")) // Late March
        put(31, Decision.RaceDecision("Satsuki Sho (Classic Class April, First Half)")) // Early April
        put(32, Decision.Rest) // Late April - Special Week Recreation (Sirius)
        put(33, Decision.RaceDecision("NHK Mile Cup (Classic Class May, First Half)")) // Early May
        put(34, Decision.RaceDecision("Tokyo Yushun (Japanese Derby) (Classic Class May, Second Half)")) // Late May
        put(35, Decision.RaceDecision("Yasuda Kinen (Classic Class June, First Half)")) // Early June
        put(36, Decision.Rest) // Late June - Tokai Teio Recreation (Throne)
        put(37, Decision.RaceDecision("Tanabata Sho (Classic Class July, First Half)")) // Early July
        put(38, Decision.RaceDecision("Queen Stakes (Classic Class July, Second Half)")) // Late July (Energy Drink)
        put(39, Decision.Train) // Early August
        put(40, Decision.Train) // Late August
        put(41, Decision.RaceDecision("Rose Stakes (Classic Class September, First Half)")) // Early September
        put(42, Decision.RaceDecision("All Comers (Classic Class September, Second Half)")) // Late September
        put(43, Decision.Rest) // Early October - Mejiro McQueen Recreation (Sirius)
        put(44, Decision.RaceDecision("Kikuka Sho (Classic Class October, Second Half)")) // Late October
        put(45, Decision.RaceDecision("Queen Elizabeth II Cup (Classic Class November, First Half)")) // Early November
        put(46, Decision.RaceDecision("Mile Championship (Classic Class November, Second Half)")) // Late November
        put(47, Decision.Rest) // Early December - Tsurumaru Tsuyoshi Recreation (Throne)
        put(48, Decision.RaceDecision("Arima Kinen (Classic Class December, Second Half)")) // Late December

        // Senior Year
        put(49, Decision.RaceDecision("Nikkei Shinshun Hai (Senior Class January, First Half)")) // Early January
        put(50, Decision.RaceDecision("American JCC (Senior Class January, Second Half)")) // Late January
        put(51, Decision.Rest) // Early February - Throne Recreation (1 of 2)
        put(52, Decision.RaceDecision("Nakayama Kinen (Senior Class February, Second Half)")) // Late February
        put(53, Decision.RaceDecision("Kinko Sho (Senior Class March, First Half)")) // Early March
        put(54, Decision.RaceDecision("Osaka Hai (Senior Class March, Second Half)")) // Late March
        put(55, Decision.Rest) // Early April - Winning Ticket Recreation (Sirius)
        put(56, Decision.RaceDecision("Tenno Sho (Spring) (Senior Class April, Second Half)")) // Late April
        put(57, Decision.RaceDecision("Victoria Mile (Senior Class May, First Half)")) // Early May (Energy Drink)
        put(58, Decision.Rest) // Late May - Team Sirius Recreation
        put(59, Decision.Rest) // Early June - Throne Recreation (2 of 2)
        put(60, Decision.RaceDecision("Takarazuka Kinen (Senior Class June, Second Half)")) // Late June
        put(61, Decision.Train) // Early July - Summer Training 1 of 4
        put(62, Decision.Train) // Late July - Summer Training 2 of 4
        put(63, Decision.Train) // Early August - Summer Training 3 of 4
        put(64, Decision.Train) // Late August - Summer Training 4 of 4
        put(65, Decision.RaceDecision("Niigata Kinen (Senior Class September, First Half)")) // Early September
        put(66, Decision.RaceDecision("All Comers (Senior Class September, Second Half)")) // Late September
        put(67, Decision.Train) // Early October
        put(68, Decision.RaceDecision("Tenno Sho (Autumn) (Senior Class October, Second Half)")) // Late October
        put(69, Decision.RaceDecision("Queen Elizabeth II Cup (Senior Class November, First Half)")) // Early November
        put(70, Decision.RaceDecision("Japan Cup (Senior Class November, Second Half)")) // Late November
        put(71, Decision.Train) // Early December
        put(72, Decision.RaceDecision("Arima Kinen (Senior Class December, Second Half)")) // Late December
    }
}
