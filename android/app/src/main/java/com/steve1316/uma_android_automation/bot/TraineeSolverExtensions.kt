package com.steve1316.uma_android_automation.bot

import com.steve1316.uma_android_automation.bot.solver.Aptitudes
import com.steve1316.uma_android_automation.types.Aptitude
import com.steve1316.uma_android_automation.types.TrackDistance
import com.steve1316.uma_android_automation.types.TrackSurface
import com.steve1316.uma_android_automation.types.Trainee

/** Maps live [Trainee] aptitude grades into solver [Aptitudes]. */
fun Trainee.toSolverAptitudes(): Aptitudes =
    Aptitudes(
        sprint = trackDistanceAptitudes[TrackDistance.SPRINT] ?: Aptitude.G,
        mile = trackDistanceAptitudes[TrackDistance.MILE] ?: Aptitude.G,
        medium = trackDistanceAptitudes[TrackDistance.MEDIUM] ?: Aptitude.G,
        long = trackDistanceAptitudes[TrackDistance.LONG] ?: Aptitude.G,
        turf = trackSurfaceAptitudes[TrackSurface.TURF] ?: Aptitude.G,
        dirt = trackSurfaceAptitudes[TrackSurface.DIRT] ?: Aptitude.G,
    )
