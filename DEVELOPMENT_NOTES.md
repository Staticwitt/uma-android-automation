# Development Notes — Parent Farming / Generation Farm

Last updated: 2026-06-18  
Repo: [Staticwitt/uma-android-automation](https://github.com/Staticwitt/uma-android-automation)

---

## Current release

| Item | Value |
|------|-------|
| **Version** | v5.9.33 (versionCode 123) |
| **Release** | https://github.com/Staticwitt/uma-android-automation/releases/tag/v5.9.33 |
| **Base branch** | `master` |

### Recent shipped versions

| Version | PR | Focus |
|---------|-----|-------|
| v5.9.33 | #73, #74, #75 | **Generation farm** — cold start removed; breeding plan drives multi-run |
| v5.9.32 | #72 | Cold start reliability (superseded by v5.9.33 removal) |
| v5.9.31 | #71 | Support card OCR/priority/batch optimizations |
| v5.9.30 | #68 | Cold start phase machine (Confirm before scenario) |
| v5.9.29 | #66 | Initial cold start navigation fixes |

---

## Where we are (summary)

Parent farming has moved from **automated cold start** (team home → Career → character → scenario) to **generation farm**: the user manually reaches career selection, and a **breeding plan** drives chained multi-generation runs via the goal queue.

**Cold start is fully removed** in v5.9.33. There is no `enableParentFarmingColdStart` setting anymore.

---

## Generation farm — how it works

### User workflow

1. Enable **Parent Farming Mode** and configure a **Generation farm** breeding plan.
2. Manually navigate to **career selection** in-game (pick trainee + scenario).
3. Start the bot — existing automation runs: equip owned deck → borrow support → legacy parents → optional auto-start.
4. Complete the career; return to career selection for the next generation.
5. Goal-queue patches advance settings automatically between careers (no home navigation).

### What happens on bot start (`prepareSettingsForBotStart.ts`)

When `enableParentFarmingBreedingPlan` is on:

- Builds resolved goal-queue patches via `buildBreedingPlanGoalQueueResolved()`
- Applies **Gen 1** settings through the full resolver
- Auto-enables `enableParentFarmingGoalQueue` and `enableParentFarmingMultiRun`
- Sets `parentFarmingMultiRunCount` to the number of breeding generations

### Per-generation patch fields (Kotlin goal queue)

Each generation patch includes:

- Trainee, scenario, bundle/preset keys
- Solver epithets, weights, spark/legacy strategy
- `targetFactorSkills` — harvest OCR factor targets
- `usePreviousAsLegacy` — wire previous gen’s trainee as legacy parent slot 1
- `legacyParentPreferredPair` — JSON pair for legacy OCR

Runtime consumers of active patch:

- `LegacyParentSelector.kt` — legacy parent pair + trainee name
- `ParentHarvestScanner.kt` — target factor skills
- `SmartRaceSolverIntegration.kt` — character preset and solver context
- `ParentFarmingGoalQueue.kt` — `applyForRunIndex()` between multi-run careers

### Kotlin gate (no navigation)

`ParentFarmingGenerationFarm.kt` logs a throttled warning if breeding plan is on but the screen is not career selection. It does **not** navigate.

---

## In-app UI locations

**Navigation:** Side drawer → **Gameplay → Racing → Parent Farming**

| Section | Tab | What |
|---------|-----|------|
| **Generation farm** | Setup (or All) | Breeding plan toggle + generation editor |
| **Choose setup** | Setup | Character bundles / goal presets |
| **Career selection** | Automation | Auto-equip, auto-borrow, legacy parents, auto-start |
| **Multi-run loop** | Automation | Careers per session (auto-enabled with breeding plan) |

**Search:** “Generation Farm”, “Multi-generation breeding plan”, “Breeding generations”

**Removed:** “Cold start from home” toggle (Reliability section no longer has this)

---

## Example profile

**File:** `profiles/grass-wonder-ashen-miracle-oguri-2gen.json`  
**Generator:** `scripts/generate-grass-wonder-oguri-profile.ts`

| Gen | Bundle | Target factors | Legacy |
|-----|--------|----------------|--------|
| 1 | `grass-wonder-mile` | (none) | — |
| 2 | `oguri-cap-g1` | Gourmand, Triple 7s, Corner Recovery ○ | Previous gen (Grass Wonder) |

Import via **Settings → Import settings** in the app.

---

## Key files

| Area | Path |
|------|------|
| Generation farm gate | `android/.../bot/ParentFarmingGenerationFarm.kt` |
| Multi-run + goal queue (Kotlin) | `android/.../bot/ParentFarmingRunLoop.kt`, `ParentFarmingGoalQueue.kt` |
| Breeding plan (TS) | `src/lib/parentFarmingBreedingPlan.ts` |
| Goal queue patches (TS) | `src/lib/parentFarmingGoalQueue.ts` |
| Bot-start resolver | `src/lib/prepareSettingsForBotStart.ts` |
| Settings UI | `src/pages/ParentFarmingSettings/index.tsx` |
| Breeding editor | `src/components/ParentFarmingBreedingPlanEditor.tsx` |
| User preference preservation | `src/lib/parentFarmingUserPreferences.ts` |
| App updater manifest | `android/app/update.xml` |

---

## Tests

| Test file | Covers |
|-----------|--------|
| `src/lib/__tests__/parentFarmingBreedingPlanAdvance.test.ts` | Gen switching, legacy wiring, bot-start multi-run |
| `src/lib/__tests__/parentFarmingGoalQueue.test.ts` | Goal queue patch resolution |
| `src/lib/__tests__/parentFarmingUserPreferences.test.ts` | User toggle preservation across preset refresh |
| `android/.../ParentFarmingGenerationFarmTest.kt` | Generation farm session reset |

Run JS tests: `yarn test`

---

## Release / CI notes

Release workflow: `.github/workflows/release.yml` (triggers on `v*.*.*` tags).

v5.9.33 release required two infra fixes (merged #74, #75):

1. **Disk space** — free unused toolchains before Gradle build
2. **Doc index** — commit regenerated `doc_index.bin` after Kotlin changes so CI skips HuggingFace embedder download; embedder cache added as fallback

Typical release build time: ~25–27 minutes on GitHub Actions.

---

## Open / stale PRs (as of 2026-06-18)

| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #70 | `cursor/breeding-plan-auto-advance-002a` | Draft, open | **Superseded by #73** — breeding auto-advance folded into generation farm |
| #69 | `cursor/optimize-support-card-selection-002a` | Draft, open | **Superseded by #71** |
| #56–#54 | app-optimizations-* | Draft | Performance/search backlog |
| #52 | ui-overhaul-phase-5 | Draft | SettingRow migration |
| #45 | discord-live-enhancements | Draft | Discord live status |
| #40 | fix-legacy-parent-trainee | Draft | Legacy parent trainee filter |
| #23 | fix-skill-selection | Draft | Skill plan bugs |

Safe to close #69 and #70 if still open.

---

## Known gaps / follow-ups

1. **Manual career selection between gens** — user must return to career selection and re-pick trainee/scenario; bot does not navigate home or open Career hub.
2. **Generation farm warn-only** — if started on wrong screen, bot logs warnings but does not block; user must self-correct.
3. **Breeding plan vs manual goal queue** — breeding plan auto-builds the queue on bot start; separate “Multi-goal queue” editor under Automation still exists for non-breeding use cases.
4. **Profile import** — Grass Wonder → Oguri profile is repo-only; not a built-in app preset (import JSON manually).
5. **Draft PR backlog** — several UI/optimization branches not merged; see table above.

---

## Architecture diagram (generation farm)

```
User configures breeding plan (React UI)
        ↓
prepareSettingsForBotStart()
  → buildBreedingPlanGoalQueueResolved()
  → apply Gen 1 settings
  → enable multi-run + goal queue
        ↓
SQLite settings → Kotlin bot start
        ↓
Career selection (manual) → equip / borrow / legacy / start
        ↓
Career runs → harvest OCR uses active patch factors
        ↓
Career ends → ParentFarmingRunLoop advances run index
        ↓
ParentFarmingGoalQueue.applyForRunIndex(n)
  → next gen patch (trainee, factors, legacy from prev gen)
        ↓
User returns to career selection → repeat until multi-run count reached
```

---

## Conversation arc (context)

1. Cold start was implemented and iteratively fixed (v5.9.29–v5.9.32).
2. User requested scrapping cold start entirely in favor of career-selection-based multi-gen farming.
3. v5.9.33 shipped generation farm (#73), release infra fixes (#74, #75), tag and GitHub release published 2026-06-18.
