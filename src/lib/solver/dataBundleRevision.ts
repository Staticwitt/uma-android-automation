import epithetsData from "../../data/epithets.json"
import racesData from "../../data/races.json"

/** Stable revision string for bundled solver JSON — bumps preview cache when game data changes. */
export const SOLVER_DATA_BUNDLE_REVISION = `${Object.keys(racesData).length}:${Object.keys(epithetsData).length}`
