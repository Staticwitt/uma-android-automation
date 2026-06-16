# Game Data

Generated game-data JSON files consumed by the React Native frontend (via `import x from "../../data/X.json"`) and by the Kotlin bot's Android unit tests (which read these paths directly off disk).

To refresh, run the scraper from the repo root:

```bash
python scripts/data-scraper/main.py
```

See [`scripts/data-scraper/README.md`](../../scripts/data-scraper/README.md) for setup, prerequisites, and what each scrape pass does.

## Data Files

- `characters.json`: Training events and options for all characters.
- `races.json`: Race calendar data.
- `skills.json`: Skill IDs, names, costs, and tier rankings.
- `supports.json`: Support card event data.
- `supportCardStats.json`: Auto-generated Lv50 support card bonuses (GameTora manifest).
- `supportCardTypes.json`: Auto-generated support card type catalog (Speed/Stamina/…).
- `supportCardManualOverrides.json`: Hand-edited stat/type overrides preserved across auto-updates.
- `manifestVersions.json`: GameTora manifest hashes used to detect new game content.
- `releasedCharacters.json`: EN-playable character list from GameTora manifest.
- `scenarios.json`: Scenario-specific event data (e.g., URA, Unity Cup, Trackblazer). This is updated manually to include special event overrides and logic for each scenario.
- `epithets.json`: Smart Race Solver nickname / epithet definitions. Scraper-owned fields are refreshed; `dependsOn` and `matchers` are hand-curated and preserved across re-scrapes.
- `characterPresets.json`: Smart Race Solver starting aptitudes per character.
