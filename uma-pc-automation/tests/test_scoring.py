"""
Tests for bot/scoring.py — Python port of android/scoring-shared Scoring.kt.

The soft-cap tests (test_soft_cap_*) mirror the four JUnit tests added in v5.10.3
(TrainingScoringTest.kt). Any change to scoring logic must keep these green.
"""

import math
import pytest

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from bot.types import (
    BarFillResult,
    DateYear,
    GameDateSnapshot,
    StatName,
    TrainingConfig,
    TrainingOption,
    TrainingScoringConstants,
)
from bot.scoring import (
    BASE_STAT_CAP,
    calculate_misc_score,
    calculate_raw_training_score,
    calculate_relationship_score,
    calculate_stat_efficiency_score,
    estimate_failure_chance_from_energy,
    get_current_stat_cap,
    get_finale_stat_bonus,
    get_remaining_finale_races,
    get_scenario_stat_cap,
    level_boost_multiplier,
    scoring_constants_from_map,
)


# ── Test helpers ──────────────────────────────────────────────────────────────

_DEFAULT_STAT_TARGETS = {
    StatName.SPEED: 800,
    StatName.STAMINA: 450,
    StatName.POWER: 550,
    StatName.GUTS: 300,
    StatName.WIT: 300,
}

_DEFAULT_PRIORITY = [
    StatName.SPEED,
    StatName.STAMINA,
    StatName.POWER,
    StatName.GUTS,
    StatName.WIT,
]

_ZERO_STATS: dict[StatName, int] = {s: 0 for s in StatName}


def _config(
    current_stats: dict[StatName, int] | None = None,
    stat_targets: dict[StatName, int] | None = None,
    scenario: str = "URA Finale",
    current_date: GameDateSnapshot | None = None,
    **kwargs,
) -> TrainingConfig:
    return TrainingConfig(
        current_stats=current_stats or _ZERO_STATS,
        stat_prioritization=_DEFAULT_PRIORITY,
        summer_training_stat_priority=_DEFAULT_PRIORITY,
        stat_targets=stat_targets or _DEFAULT_STAT_TARGETS,
        current_date=current_date or GameDateSnapshot(year=DateYear.CLASSIC, day=1),
        scenario=scenario,
        enable_rainbow_training_bonus=True,
        **kwargs,
    )


def _training(
    name: StatName = StatName.SPEED,
    gains: dict[StatName, int] | None = None,
    bars: list[BarFillResult] | None = None,
    num_rainbow: int = 0,
    training_level: int | None = None,
) -> TrainingOption:
    return TrainingOption(
        name=name,
        stat_gains=gains or {name: 10},
        relationship_bars=bars or [],
        num_rainbow=num_rainbow,
        training_level=training_level,
    )


def _speed_gains(amount: int) -> dict[StatName, int]:
    return {StatName.SPEED: amount}


# ── Scenario stat caps ────────────────────────────────────────────────────────

def test_scenario_stat_cap_ura():
    assert get_scenario_stat_cap("URA Finale", StatName.SPEED) == 1400
    assert get_scenario_stat_cap("URA Finale", StatName.STAMINA) == 1400
    assert get_scenario_stat_cap("URA", StatName.WIT) == 1400  # startsWith("URA")


def test_scenario_stat_cap_unity_cup():
    assert get_scenario_stat_cap("Unity Cup", StatName.WIT) == 1800
    assert get_scenario_stat_cap("Unity Cup", StatName.SPEED) == 1300
    assert get_scenario_stat_cap("Unity Cup", StatName.STAMINA) == 1300


def test_scenario_stat_cap_trackblazer():
    assert get_scenario_stat_cap("Trackblazer", StatName.STAMINA) == 1900
    assert get_scenario_stat_cap("Trackblazer", StatName.WIT) == 1500
    assert get_scenario_stat_cap("Trackblazer", StatName.SPEED) == 1200
    assert get_scenario_stat_cap("Trackblazer", StatName.POWER) == 1200


def test_scenario_stat_cap_unknown_falls_back_to_base():
    assert get_scenario_stat_cap("Unknown", StatName.SPEED) == BASE_STAT_CAP


def test_get_current_stat_cap_delegates_to_scenario():
    cfg = _config(scenario="Trackblazer")
    assert get_current_stat_cap(StatName.STAMINA, cfg) == 1900
    assert get_current_stat_cap(StatName.SPEED, cfg) == 1200


# ── Finale race accounting ────────────────────────────────────────────────────

@pytest.mark.parametrize("day, expected", [
    (1, 3),
    (71, 3),
    (72, 3),
    (73, 2),
    (74, 1),
    (75, 0),
    (76, 0),
])
def test_get_remaining_finale_races(day, expected):
    assert get_remaining_finale_races(day) == expected


def test_get_finale_stat_bonus():
    assert get_finale_stat_bonus(72) == 45   # 3 races × 15
    assert get_finale_stat_bonus(73) == 30   # 2 races
    assert get_finale_stat_bonus(75) == 0
    assert get_finale_stat_bonus(1) == 45


# ── Level boost multiplier ────────────────────────────────────────────────────

def test_level_boost_returns_one_at_level_1():
    assert level_boost_multiplier(1, 1) == 1.0
    assert level_boost_multiplier(1, None) == 1.0


def test_level_boost_rank1_level5():
    # rank 1, level 5: 1 + 0.75 * (4/4) = 1.75
    assert level_boost_multiplier(1, 5) == pytest.approx(1.75, abs=1e-9)


def test_level_boost_rank2_level3():
    # rank 2, level 3: 1 + 0.25 * (2/4) = 1.125
    assert level_boost_multiplier(2, 3) == pytest.approx(1.125, abs=1e-9)


def test_level_boost_rank4_always_one():
    assert level_boost_multiplier(4, 5) == 1.0
    assert level_boost_multiplier(10, 5) == 1.0


# ── Soft-cap tests (mirrors v5.10.3 TrainingScoringTest.kt) ──────────────────

def test_soft_cap_below_cap_gains_are_linear():
    """Below-cap gains score proportionally — 2× raw gain → 2× score."""
    stats = {StatName.SPEED: 900, StatName.STAMINA: 120, StatName.POWER: 120, StatName.GUTS: 120, StatName.WIT: 120}
    cfg = _config(current_stats=stats)
    score_double = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(20)))
    score_half = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(10)))
    assert score_double / score_half == pytest.approx(2.0, abs=1e-9)


def test_soft_cap_spanning_gain_is_partially_discounted():
    """A gain that crosses 1200 is discounted to 1.5× a purely below-cap gain of half the size."""
    # stat=1190, gain=20 spans cap: effectiveGain = 10 + 10*0.5 = 15
    # stat=1190, gain=10 stays below: 1190+10=1200 ≤ cap → effectiveGain = 10
    stats = {StatName.SPEED: 1190, StatName.STAMINA: 120, StatName.POWER: 120, StatName.GUTS: 120, StatName.WIT: 120}
    cfg = _config(current_stats=stats)
    score_spanning = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(20)))
    score_below = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(10)))
    assert score_spanning / score_below == pytest.approx(1.5, abs=1e-9)


def test_soft_cap_above_cap_gain_is_halved_relative_to_below_cap():
    """The same raw gain above 1200 scores exactly half of the same gain below 1200."""
    # Both configurations land in the ≥90% completion bucket (multiplier 0.3),
    # so only effectiveGain differs.
    training = _training(gains=_speed_gains(20))
    # stat=900, target=800 → completionPercent=112.5% → last bucket
    score_below = calculate_stat_efficiency_score(
        _config(current_stats={StatName.SPEED: 900, StatName.STAMINA: 120, StatName.POWER: 120, StatName.GUTS: 120, StatName.WIT: 120}),
        training,
    )
    # stat=1300, target=800 → effectiveCurrent=1250, completionPercent=156.25% → last bucket
    score_above = calculate_stat_efficiency_score(
        _config(current_stats={StatName.SPEED: 1300, StatName.STAMINA: 120, StatName.POWER: 120, StatName.GUTS: 120, StatName.WIT: 120}),
        training,
    )
    assert score_below / score_above == pytest.approx(2.0, abs=1e-9)


def test_soft_cap_effective_completion_percent_discounts_above_cap_target():
    """
    Target above 1200 is soft-capped in effectiveCompletionPercent:
      target=1400 → effectiveTarget=1300.
      stat=1170  → effectiveCurrent=1170, completionPercent=90.0% → last bucket (0.3).
      stat=390   → completionPercent=30.0% → bucket index 2 (0.3<30≤45 → multiplier 3.0).
    Ratio = 10.0 (only ratioMultiplier differs; effectiveGain=10 for both).
    """
    above_cap_targets = {
        StatName.SPEED: 1400,
        StatName.STAMINA: 450,
        StatName.POWER: 550,
        StatName.GUTS: 300,
        StatName.WIT: 300,
    }
    training = _training(gains=_speed_gains(10))

    score_near_complete = calculate_stat_efficiency_score(
        _config(
            current_stats={StatName.SPEED: 1170, StatName.STAMINA: 120, StatName.POWER: 120, StatName.GUTS: 120, StatName.WIT: 120},
            stat_targets=above_cap_targets,
        ),
        training,
    )
    score_early_game = calculate_stat_efficiency_score(
        _config(
            current_stats={StatName.SPEED: 390, StatName.STAMINA: 120, StatName.POWER: 120, StatName.GUTS: 120, StatName.WIT: 120},
            stat_targets=above_cap_targets,
        ),
        training,
    )
    assert score_early_game / score_near_complete == pytest.approx(10.0, abs=1e-9)


# ── Effective gain boundary cases ─────────────────────────────────────────────

def test_effective_gain_exactly_at_cap():
    """A gain starting exactly at the cap is fully halved."""
    stats = {StatName.SPEED: 1200, StatName.STAMINA: 0, StatName.POWER: 0, StatName.GUTS: 0, StatName.WIT: 0}
    # Zero targets for other stats so only SPEED contributes
    cfg = _config(
        current_stats=stats,
        stat_targets={StatName.SPEED: 800, StatName.STAMINA: 0, StatName.POWER: 0, StatName.GUTS: 0, StatName.WIT: 0},
    )
    score_gain20 = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(20)))
    score_gain10 = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(10)))
    assert score_gain20 / score_gain10 == pytest.approx(2.0, abs=1e-9)


def test_effective_gain_lands_exactly_on_cap():
    """A gain that brings the stat to exactly 1200 uses the full gain (no discount)."""
    # currentStat=1190, gain=10 → 1190+10=1200 ≤ BASE_STAT_CAP → effectiveGain=10 (not spanned)
    stats = {StatName.SPEED: 1190, StatName.STAMINA: 0, StatName.POWER: 0, StatName.GUTS: 0, StatName.WIT: 0}
    cfg = _config(
        current_stats=stats,
        stat_targets={StatName.SPEED: 800, StatName.STAMINA: 0, StatName.POWER: 0, StatName.GUTS: 0, StatName.WIT: 0},
    )
    # stat=100 (well below cap), same gain=10 — effectiveGain should also be 10
    stats_below = {StatName.SPEED: 100, StatName.STAMINA: 0, StatName.POWER: 0, StatName.GUTS: 0, StatName.WIT: 0}
    cfg_below = _config(
        current_stats=stats_below,
        stat_targets={StatName.SPEED: 800, StatName.STAMINA: 0, StatName.POWER: 0, StatName.GUTS: 0, StatName.WIT: 0},
    )
    training = _training(gains=_speed_gains(10))
    # Ratio differs only by ratioMultiplier bucket — divide that out by comparing same-bucket configs.
    # Both have same gain=10 → we only care that the 1190-case isn't discounted.
    # The easiest check: effectiveGain is the same (10) → score ratio == ratioMultiplier ratio.
    # Instead, verify by checking a doubled gain against itself in the same bucket.
    score_10 = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(10)))
    score_20 = calculate_stat_efficiency_score(cfg, _training(gains=_speed_gains(20)))
    # gain=20 spans cap (1190+20=1210 > 1200) → effectiveGain=15, not 20.
    # So score_20/score_10 should be 1.5, not 2.0.
    assert score_20 / score_10 == pytest.approx(1.5, abs=1e-9)


# ── Relationship score ────────────────────────────────────────────────────────

def test_relationship_score_empty_bars():
    assert calculate_relationship_score(_config(), _training()) == 0.0


def test_relationship_score_blue_bar_full_junior():
    cfg = _config(current_date=GameDateSnapshot(year=DateYear.JUNIOR, day=1))
    bar = BarFillResult(dominant_color="blue", fill_percent=100.0)
    t = _training(bars=[bar])
    score = calculate_relationship_score(cfg, t)
    # fill=1.0, diminishing = 1 - 1.0*0.5 = 0.5; earlyGame=1.3
    # value = 2.5 * 0.5 * 1.3 = 1.625; max = 2.5*1.3 = 3.25
    expected = (1.625 / 3.25) * 100.0
    assert score == pytest.approx(expected, abs=1e-9)


def test_relationship_bond_capping_excludes_maxed_orange_bar():
    cfg = _config(enable_bond_efficiency_capping=True)
    maxed = BarFillResult(dominant_color="orange", fill_percent=100.0)
    blue = BarFillResult(dominant_color="blue", fill_percent=50.0)
    t_both = _training(bars=[maxed, blue])
    t_blue_only = _training(bars=[blue])
    assert calculate_relationship_score(cfg, t_both) == pytest.approx(
        calculate_relationship_score(cfg, t_blue_only), abs=1e-9
    )


# ── Misc score ────────────────────────────────────────────────────────────────

def test_misc_score_baseline():
    assert calculate_misc_score(_config(), _training()) == 50.0


def test_misc_score_with_hints():
    cfg = _config(skill_hints_per_location={StatName.SPEED: 2, **{s: 0 for s in StatName if s != StatName.SPEED}})
    assert calculate_misc_score(cfg, _training()) == pytest.approx(70.0, abs=1e-9)


def test_misc_score_hint_override():
    cfg = _config(
        enable_prioritize_skill_hints=True,
        skill_hints_per_location={StatName.SPEED: 1, **{s: 0 for s in StatName if s != StatName.SPEED}},
    )
    score = calculate_misc_score(cfg, _training())
    assert score > 100.0  # override fires: skillHintOverrideScore + 60


# ── Raw training score gating ─────────────────────────────────────────────────

def test_raw_score_zero_for_blacklisted():
    cfg = _config(blacklist=[StatName.SPEED])
    assert calculate_raw_training_score(cfg, _training()) == 0.0


def test_raw_score_zero_when_stat_at_cap():
    # URA cap = 1400; stat already there → 0
    cfg = _config(current_stats={**_ZERO_STATS, StatName.SPEED: 1400})
    assert calculate_raw_training_score(cfg, _training()) == 0.0


def test_raw_score_positive_normal_case():
    cfg = _config(current_stats={**_ZERO_STATS, StatName.SPEED: 500})
    assert calculate_raw_training_score(cfg, _training()) > 0.0


def test_raw_score_rainbow_multiplier_applied_in_classic():
    cfg_rainbow = _config(current_stats={**_ZERO_STATS, StatName.SPEED: 500})
    cfg_no_rainbow = _config(current_stats={**_ZERO_STATS, StatName.SPEED: 500})
    t_rainbow = _training(num_rainbow=1)
    t_plain = _training(num_rainbow=0)
    score_rainbow = calculate_raw_training_score(cfg_rainbow, t_rainbow)
    score_plain = calculate_raw_training_score(cfg_no_rainbow, t_plain)
    assert score_rainbow == pytest.approx(score_plain * 2.0, abs=1e-9)


# ── Failure chance ────────────────────────────────────────────────────────────

@pytest.mark.parametrize("energy, stat, expected", [
    (100, None, 0),
    (50, None, 0),
    (49, None, 2),
    (0, None, 100),
    (25, None, 50),
])
def test_estimate_failure_non_wit(energy, stat, expected):
    assert estimate_failure_chance_from_energy(energy, stat) == expected


def test_estimate_failure_wit_high_energy():
    # At energy=100, exponential formula gives near-zero (but clamped to 0)
    result = estimate_failure_chance_from_energy(100, StatName.WIT)
    assert 0 <= result <= 5


def test_estimate_failure_wit_low_energy():
    # 161.4 * 0.9793^0 - 81.4 = 80.0 → int → 80 (capped at 100 by formula, reaches 80 at energy=0)
    result = estimate_failure_chance_from_energy(0, StatName.WIT)
    assert result == 80


def test_estimate_failure_clamps_out_of_range():
    assert estimate_failure_chance_from_energy(-10) == estimate_failure_chance_from_energy(0)
    assert estimate_failure_chance_from_energy(200) == 0


# ── scoring_constants_from_map ────────────────────────────────────────────────

def test_scoring_constants_from_map_empty_uses_defaults():
    defaults = TrainingScoringConstants()
    result = scoring_constants_from_map({})
    assert result.priority_coefficient == defaults.priority_coefficient
    assert result.ratio_multipliers == defaults.ratio_multipliers
    assert result.ratio_breakpoints == defaults.ratio_breakpoints


def test_scoring_constants_from_map_overrides_multiplier():
    result = scoring_constants_from_map({"ratioMultiplier1": 9.0})
    assert result.ratio_multipliers[0] == 9.0
    assert result.ratio_multipliers[1] == TrainingScoringConstants().ratio_multipliers[1]


def test_scoring_constants_from_map_invalid_value_uses_fallback():
    defaults = TrainingScoringConstants()
    result = scoring_constants_from_map({"priorityCoefficient": "not-a-number"})
    assert result.priority_coefficient == defaults.priority_coefficient


def test_scoring_constants_from_map_nan_uses_fallback():
    defaults = TrainingScoringConstants()
    result = scoring_constants_from_map({"priorityCoefficient": float("nan")})
    assert result.priority_coefficient == defaults.priority_coefficient


def test_scoring_constants_breakpoints_always_from_defaults():
    # Breakpoints are not user-tunable; the map has no effect on them.
    result = scoring_constants_from_map({"ratioBreakpoint1": 999.0})
    assert result.ratio_breakpoints == TrainingScoringConstants().ratio_breakpoints


# ── TrainingScoringConstants validation ───────────────────────────────────────

def test_constants_rejects_wrong_multiplier_count():
    with pytest.raises(ValueError):
        TrainingScoringConstants(
            ratio_breakpoints=[15.0, 30.0],
            ratio_multipliers=[5.0, 4.0],  # needs 3 for 2 breakpoints
        )


def test_constants_accepts_correct_multiplier_count():
    c = TrainingScoringConstants(
        ratio_breakpoints=[50.0],
        ratio_multipliers=[3.0, 1.0],
    )
    assert len(c.ratio_multipliers) == 2
